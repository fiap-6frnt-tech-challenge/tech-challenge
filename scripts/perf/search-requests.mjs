import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = (process.env.PERF_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const term = process.env.PERF_TERM ?? 'supermercado';
const keyDelay = Number(process.env.PERF_KEY_DELAY ?? 120);
const settleMs = Number(process.env.PERF_SETTLE_MS ?? 2500);

const cookiePath = resolve(process.cwd(), '.secrets/cookie.txt');
if (!existsSync(cookiePath)) {
  console.error(`Falta ${cookiePath}. Rode: node scripts/perf/session-cookie.mjs ${baseUrl}`);
  process.exit(1);
}

const cookieHeader = readFileSync(cookiePath, 'utf-8').trim();
const [cookieName, ...cookieRest] = cookieHeader.split('=');

const browser = await chromium.launch();
const context = await browser.newContext();
await context.addCookies([
  {
    name: cookieName,
    value: cookieRest.join('='),
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  },
]);

const page = await context.newPage();
const calls = new Map();

const isApi = (url) => url.includes('/api/transactions');
const key = (request) => `${request.url()}#${calls.size}`;

page.on('request', (request) => {
  if (!isApi(request.url())) return;
  calls.set(request, { url: request.url().replace(baseUrl, ''), state: 'pendente', bytes: 0 });
});

page.on('requestfinished', async (request) => {
  const call = calls.get(request);
  if (!call) return;
  const response = await request.response();
  call.state = `${response?.status() ?? '?'}`;
  try {
    const sizes = await request.sizes();
    call.bytes = sizes.responseBodySize + sizes.responseHeadersSize;
  } catch {
    call.bytes = 0;
  }
});

page.on('requestfailed', (request) => {
  const call = calls.get(request);
  if (!call) return;
  call.state = `cancelada (${request.failure()?.errorText ?? 'desconhecido'})`;
});

await page.goto(`${baseUrl}/transactions`, { waitUntil: 'networkidle' });
const search = page.getByRole('searchbox', { name: /buscar transações/i });
await search.waitFor({ state: 'visible' });

const onLoad = calls.size;
await search.click();
await search.pressSequentially(term, { delay: keyDelay });
await page.waitForTimeout(settleMs);

const duringTyping = [...calls.values()].slice(onLoad);
const bytes = duringTyping.reduce((total, call) => total + call.bytes, 0);
const cancelled = duringTyping.filter((call) => call.state.startsWith('cancelada')).length;
const typed = await search.inputValue();

console.log(
  `\nTermo "${term}" (${term.length} caracteres) · ${keyDelay} ms entre teclas · debounce do SearchInput: 300 ms`
);
console.log(`Requisições a /api/transactions no carregamento da página: ${onLoad}`);
console.log(
  `Requisições disparadas ao digitar: ${duringTyping.length} (${(bytes / 1024).toFixed(1)} kB) · canceladas: ${cancelled}`
);
if (typed !== term) {
  console.log(
    `! O campo terminou com "${typed}" e não com "${term}": teclas perdidas durante o re-render.`
  );
}
for (const call of duringTyping) {
  console.log(
    `  ${call.state.padEnd(10)} ${(call.bytes / 1024).toFixed(1).padStart(5)} kB  ${decodeURIComponent(call.url)}`
  );
}

await browser.close();

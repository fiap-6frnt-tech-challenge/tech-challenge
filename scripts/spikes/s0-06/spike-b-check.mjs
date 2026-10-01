// Spike B (S0-06): preloadRemote no hover, prefetch no SSR + HydrationBoundary, CSP Report-Only.
// Pré-requisito: Postgres local, build de produção do shell em :3000
// (AUTH_TRUST_HOST=true npm run start -w @bytebank/shell) e MFEs em :3002/:3003 (npm run preview).
// Uso: node scripts/spikes/s0-06/spike-b-check.mjs [all|setup|hydration|preload|csp]
// O setup cria o usuário spike.s006@bytebank.test com 12 transações marcadas com "Spike B —".
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const STATE = path.join(os.tmpdir(), 'bytebank-spike-s006-state.json');
const USER = {
  name: 'Spike S0-06',
  email: 'spike.s006@bytebank.test',
  password: 'Spike-S006-2026!',
};
const MARK = 'Spike B —';
const PAIRS = Number(process.env.PAIRS ?? 3);
const phase = process.argv[2] ?? 'all';
const out = {};

const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

function monthsAgo(n, day) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}

async function login(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByLabel(/email/i).fill(USER.email);
  await page.getByLabel(/senha/i).fill(USER.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60000 }),
    page.getByRole('button', { name: /entrar/i }).click(),
  ]);
  return { context, page };
}

async function setup(browser) {
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(USER),
  });
  out.register = reg.status;
  const { context, page } = await login(browser);
  const existing = await (await page.request.get(`${BASE}/api/transactions`)).json();
  if (existing.length === 0) {
    const expenses = ['food', 'transport', 'housing', 'leisure', 'health', 'education'];
    for (let m = 0; m < 6; m++) {
      await page.request.post(`${BASE}/api/transactions`, {
        data: {
          type: 'deposit',
          category: 'salary',
          amount: 5000 + m * 100,
          date: monthsAgo(m, 5),
          description: `${MARK} Salário ${m}`,
        },
      });
      await page.request.post(`${BASE}/api/transactions`, {
        data: {
          type: 'withdrawal',
          category: expenses[m],
          amount: 700 + m * 150,
          date: monthsAgo(m, 10),
          description: `${MARK} Despesa ${m}`,
        },
      });
    }
  }
  out.seeded = (await (await page.request.get(`${BASE}/api/transactions`)).json()).length;
  await context.storageState({ path: STATE });
  await context.close();
}

async function scrollMainToBottom(page) {
  await page.locator('main').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(4000);
  await page.locator('main').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForLoadState('networkidle');
}

async function hydration(browser) {
  const context = await browser.newContext({
    storageState: STATE,
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const api = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/')) api.push(`${r.method()} ${u.pathname}${u.search}`);
  });
  const res = await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const html = await res.text();
  await page.getByText(`${MARK} Salário 0`).first().waitFor({ timeout: 60000 });
  await scrollMainToBottom(page);
  out.hydration = {
    htmlCarriesPrefetchedData: html.includes(`${MARK} Salário 0`),
    apiRequestsAfterLoad: api,
    listRefetched: api.includes('GET /api/transactions'),
  };
  await context.close();
}

async function navToTransactions(browser, { hover }) {
  const context = await browser.newContext({
    storageState: STATE,
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByText(`${MARK} Salário 0`).first().waitFor({ timeout: 120000 });
  await page.waitForLoadState('networkidle');

  const link = page.getByRole('link', { name: 'Transações', exact: true });
  const beforeIntent = requests.length;
  let preloaded = [];
  if (hover) {
    await link.hover();
    await page.waitForFunction(
      () => performance.getEntriesByName('spikeB:preload:end').length > 0,
      null,
      {
        timeout: 60000,
      }
    );
    preloaded = requests.slice(beforeIntent);
  }
  const beforeClick = requests.length;
  await page.evaluate(() => performance.mark('spikeB:click'));
  const t0 = Date.now();
  if (hover) await link.click();
  else await link.evaluate((a) => a.click());
  await page.locator('#transactions-heading').waitFor({ timeout: 120000 });
  const clickToHeadingMs = Date.now() - t0;
  await page.getByText(`${MARK} Salário 0`).first().waitFor({ timeout: 120000 });
  const clickToListMs = Date.now() - t0;
  const afterClick = requests.slice(beforeClick);
  const marks = await page.evaluate(() => {
    const last = (name) => performance.getEntriesByName(name).at(-1)?.startTime;
    const click = last('spikeB:click');
    const start = last('spikeB:load:start');
    const end = last('spikeB:load:end');
    return {
      loadRemoteMs: start !== undefined && end !== undefined ? Math.round(end - start) : null,
      clickToLoadStartMs:
        click !== undefined && start !== undefined ? Math.round(start - click) : null,
    };
  });
  await context.close();
  const mfe = (urls) =>
    urls
      .filter((u) => u.includes('localhost:3003'))
      .map((u) => u.replace('http://localhost:3003/', ':3003/'));
  return {
    hover,
    preloadedOnHover: mfe(preloaded),
    mfeRequestsAfterClick: mfe(afterClick),
    ...marks,
    clickToHeadingMs,
    clickToListMs,
  };
}

async function csp(browser) {
  await fetch(`${BASE}/api/csp-report`, { method: 'DELETE' });
  const violations = [];
  const attach = async (context) => {
    await context.exposeBinding('__cspViolation', ({ page }, v) =>
      violations.push({ ...v, page: new URL(page.url()).pathname })
    );
    await context.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__cspViolation({
          directive: e.effectiveDirective,
          blocked: e.blockedURI,
          source: e.sourceFile,
          sample: e.sample,
        });
      });
    });
  };

  const anon = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await attach(anon);
  const anonPage = await anon.newPage();
  const loginRes = await anonPage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  out.cspHeader = loginRes.headers()['content-security-policy-report-only'] ?? null;
  const loginHtml = await loginRes.text();
  out.nonceOnNextScripts = {
    scriptTags: (loginHtml.match(/<script\b/g) ?? []).length,
    withNonce: (loginHtml.match(/<script\b[^>]*\snonce=/g) ?? []).length,
  };
  await anonPage.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await anonPage.waitForTimeout(1000);
  await anon.close();

  const context = await browser.newContext({
    storageState: STATE,
    viewport: { width: 1366, height: 900 },
  });
  await attach(context);
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.getByText(`${MARK} Salário 0`).first().waitFor({ timeout: 60000 });
  await scrollMainToBottom(page);
  out.chartsRendered = await page.locator('.recharts-surface').count();
  await page
    .getByRole('button', { name: /Nova transação/i })
    .first()
    .click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Transações', exact: true }).click();
  await page.locator('#transactions-heading').waitFor({ timeout: 60000 });
  await page.getByText(`${MARK} Salário 0`).first().waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Adicionar filtros' }).click();
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/transactions`, { waitUntil: 'networkidle' });
  await page.getByText(`${MARK} Salário 0`).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await context.close();

  const groups = {};
  for (const v of violations) {
    const blocked = /^https?:/.test(v.blocked ?? '')
      ? `${new URL(v.blocked).origin}/…${path.extname(new URL(v.blocked).pathname)}`
      : v.blocked;
    const source = (v.source ?? '')
      .replace(/^https?:\/\/localhost:(\d+)\//, ':$1/')
      .replace(/[?#].*$/, '');
    const key = `${v.directive} | blocked=${blocked} | src=${source}`;
    groups[key] ??= { count: 0, pages: new Set(), samples: new Set() };
    groups[key].count++;
    groups[key].pages.add(v.page);
    if (v.sample) groups[key].samples.add(v.sample);
  }
  out.cspViolations = Object.entries(groups).map(([key, g]) => ({
    key,
    count: g.count,
    pages: [...g.pages],
    samples: [...g.samples].slice(0, 4),
  }));
  out.cspServerReports = (await (await fetch(`${BASE}/api/csp-report`)).json()).length;
}

const browser = await chromium.launch();
try {
  if (phase === 'all' || phase === 'setup') await setup(browser);
  if (phase === 'all' || phase === 'hydration') await hydration(browser);
  if (phase === 'all' || phase === 'preload') {
    await navToTransactions(browser, { hover: false });
    out.runs = [];
    for (let i = 0; i < PAIRS; i++) {
      out.runs.push(await navToTransactions(browser, { hover: true }));
      out.runs.push(await navToTransactions(browser, { hover: false }));
    }
  }
  if (phase === 'all' || phase === 'csp') await csp(browser);
} finally {
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
}

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const base = (process.env.PERF_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const outDir = resolve(process.argv[2] ?? 'docs/phase-4/assets/perf');
const reports = process.argv.slice(3);
const port = 9333;
const cookieHeader = readFileSync(resolve('.secrets/cookie.txt'), 'utf8').trim();
const [cookieName, ...cookieValue] = cookieHeader.split('=');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: 'chromium',
  args: [`--remote-debugging-port=${port}`, '--remote-allow-origins=*'],
});

const waitForMark = (page, mark) =>
  page.waitForFunction((name) => performance.getEntriesByName(name).length > 0, mark, {
    timeout: 120_000,
  });

async function withDevTools(name, filter, run) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addCookies([{ name: cookieName, value: cookieValue.join('='), url: base }]);
  const page = await context.newPage();
  await page.goto('about:blank');
  const cdp = await context.newCDPSession(page);
  const { targetInfo } = await cdp.send('Target.getTargetInfo');
  const devtoolsContext = await browser.newContext({ viewport: { width: 1400, height: 760 } });
  const devtools = await devtoolsContext.newPage();
  await devtools.goto(
    `http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${targetInfo.targetId}&panel=network`
  );
  await devtools.getByRole('button', { name: 'Toggle screencast' }).click();
  const dismiss = devtools.getByRole('button', { name: "Don't show again" });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
  await devtools.getByRole('textbox', { name: 'Filter' }).click();
  await devtools.keyboard.type(filter);
  try {
    await run(page, cdp, (shot) =>
      devtools.screenshot({ path: join(outDir, `${shot}.png`) }).then(() => {
        console.log(`  ${join(outDir, `${shot}.png`)}`);
      })
    );
  } finally {
    await devtoolsContext.close();
    await context.close();
  }
  console.log(`${name}: ok`);
}

await withDevTools('preload', '/federation_expose|api.transactions/', async (page, _, shot) => {
  await page.goto(`${base}/`);
  await waitForMark(page, 'overview:ready');
  await page.waitForTimeout(3000);
  const link = page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Transações', exact: true });
  const firstPage = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/transactions' &&
      new URL(response.url()).searchParams.get('_page') === '1'
  );
  await page.mouse.move(0, 0);
  await link.hover();
  await firstPage;
  await page.waitForTimeout(1000);
  await shot('network-preload-hover');
  await link.click();
  await waitForMark(page, 'transactions:ready');
  await page.waitForTimeout(1500);
  await shot('network-preload-click');
});

await withDevTools('304', 'api/transactions/overview', async (page, _, shot) => {
  await page.goto(`${base}/transactions`);
  await waitForMark(page, 'transactions:ready');
  for (let i = 0; i < 2; i += 1) {
    await page.evaluate(() => fetch('/api/transactions/overview').then((r) => r.text()));
  }
  await page.waitForTimeout(1000);
  await shot('network-304');
});

await withDevTools('canceladas', 'q=', async (page, cdp, shot) => {
  await page.goto(`${base}/transactions`);
  await waitForMark(page, 'transactions:ready');
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 600,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  const search = page.getByRole('searchbox', { name: /buscar transações/i });
  await search.click();
  await search.pressSequentially('supermercado', { delay: 400 });
  await page.waitForTimeout(4000);
  await shot('network-busca-canceladas');
});

if (reports.length > 0) {
  const cache = execSync('npm config get cache', { encoding: 'utf8' }).trim();
  const npx = join(cache, '_npx');
  const lighthouse = readdirSync(npx)
    .map((dir) => join(npx, dir, 'node_modules/lighthouse'))
    .find((dir) => existsSync(join(dir, 'report/generator/report-generator.js')));
  if (!lighthouse) throw new Error('lighthouse@12 não está no cache do npx; rode o batch antes');
  const { ReportGenerator } = await import(
    pathToFileURL(join(lighthouse, 'report/generator/report-generator.js')).href
  );
  const page = await browser.newPage({ viewport: { width: 1000, height: 1250 } });
  for (const path of reports) {
    const lhr = JSON.parse(readFileSync(resolve(path), 'utf8'));
    await page.setContent(ReportGenerator.generateReportHtml(lhr), { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const clip = await page.evaluate(() => {
      const boxes = ['.lh-audit-group--metrics', '.lh-filmstrip-container'].map((selector) =>
        document.querySelector(selector).getBoundingClientRect()
      );
      const top = Math.min(...boxes.map((box) => box.top)) - 2;
      const left = Math.min(...boxes.map((box) => box.left)) - 16;
      return {
        x: left,
        y: top,
        width: Math.max(...boxes.map((box) => box.right)) - left + 16,
        height: Math.max(...boxes.map((box) => box.bottom)) - top + 16,
      };
    });
    const shotName = `lighthouse-${path
      .split(/[\\/]/)
      .pop()
      .replace(/\.json$/, '')}`;
    await page.screenshot({ path: join(outDir, `${shotName}.png`), clip });
    console.log(`  ${join(outDir, `${shotName}.png`)}`);
  }
}

await browser.close();

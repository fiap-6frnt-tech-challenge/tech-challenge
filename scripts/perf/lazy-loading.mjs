import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

// Run against a production shell + remotes with the same seeded data before/after.
const label = process.argv[2];
if (!label || !/^[a-z0-9-]+$/.test(label))
  throw new Error('Use: node scripts/perf/lazy-loading.mjs before|after [baseUrl]');
const baseUrl = (process.argv[3] ?? 'http://localhost:3100').replace(/\/$/, '');
const outDir = resolve('perf/s2-09', label);
mkdirSync(outDir, { recursive: true });
execFileSync(process.execPath, ['scripts/perf/session-cookie.mjs', baseUrl], { stdio: 'inherit' });
const headersPath = resolve('.secrets/headers.json');
const cookie = JSON.parse(readFileSync(headersPath, 'utf8')).Cookie;
const session = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } }).then(
  (response) => response.json()
);
const remainingMs = Date.parse(session.expires) - Date.now();
if (
  !session.user?.id ||
  !Number.isFinite(remainingMs) ||
  remainingMs <= 0 ||
  remainingMs > 8 * 60 * 60 * 1000 + 60_000
) {
  throw new Error(
    'Expected the current phase-4 session contract (authenticated, maxAge 8h); check for stale build artifacts'
  );
}
const browser = await chromium.launch();
const rows = [];
try {
  for (const [slug, path] of [
    ['home', '/'],
    ['transactions', '/transactions'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 823 },
      isMobile: true,
    });
    const [name, ...value] = cookie.split('=');
    await context.addCookies([{ name, value: value.join('='), url: baseUrl }]);
    const page = await context.newPage();
    const assets = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const pending = [];
    page.on('response', (response) => {
      if (response.request().resourceType() !== 'script' || !response.ok()) return;
      pending.push(
        (async () => {
          const body = await response.body();
          const source = body.toString();
          assets.push({
            url: response.url(),
            raw: body.length,
            gzip: gzipSync(body).length,
            recharts: source.includes('recharts-wrapper'),
            zod: /ZodError|\$ZodError/.test(source),
            federation:
              source.includes('Failed to load remote dashboard/Dashboard') ||
              source.includes('mf:loadRemote '),
          });
        })()
      );
    });
    await page.goto(`${baseUrl}${path}`);
    if (path === '/') await page.getByText('Nova transação', { exact: true }).waitFor();
    else await page.locator('#transactions-heading').waitFor();
    await page.waitForLoadState('networkidle');
    if (new URL(page.url()).pathname !== path)
      throw new Error(`Unexpected redirect: ${page.url()}`);
    await Promise.all(pending);
    if (errors.length) throw new Error(`Page failed: ${errors.join('\n')}`);
    if (
      label === 'after' &&
      assets.some((asset) => asset.zod || (path === '/transactions' && asset.recharts))
    ) {
      throw new Error(`Heavy dependency unexpectedly loaded on ${path}`);
    }
    await page.screenshot({ path: resolve(outDir, `${slug}-mobile.png`) });
    rows.push({
      route: path,
      scripts: assets,
      raw: assets.reduce((sum, a) => sum + a.raw, 0),
      gzip: assets.reduce((sum, a) => sum + a.gzip, 0),
    });
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(resolve(outDir, 'network.json'), JSON.stringify(rows, null, 2));
for (const row of rows) {
  const samples = [];
  for (let run = 1; run <= 3; run++) {
    const slug = row.route === '/' ? 'home' : 'transactions';
    const output = resolve(outDir, `${slug}-mobile-${run}.json`);
    execFileSync(
      'npx',
      [
        '--yes',
        'lighthouse@12',
        `${baseUrl}${row.route}`,
        '--only-categories=performance',
        '--output=json',
        `--output-path=${output}`,
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
        `--extra-headers=${headersPath}`,
      ],
      {
        env: { ...process.env, CHROME_PATH: chromium.executablePath() },
        stdio: 'inherit',
      }
    );
    const report = JSON.parse(readFileSync(output, 'utf8'));
    if (new URL(report.finalDisplayedUrl ?? report.finalUrl).pathname !== row.route)
      throw new Error('Lighthouse measured a redirect');
    if (report.runtimeError) throw new Error(report.runtimeError.message);
    const failedScripts = report.audits['network-requests'].details.items.filter(
      (item) => item.resourceType === 'Script' && (!item.statusCode || item.statusCode >= 400)
    );
    if (failedScripts.length)
      throw new Error(
        `Lighthouse saw failed scripts: ${failedScripts.map((item) => item.url).join(', ')}`
      );
    const metric = {
      score: Math.round(report.categories.performance.score * 100),
      tbt: report.audits['total-blocking-time'].numericValue,
      lcp: report.audits['largest-contentful-paint'].numericValue,
      jsBytes: report.audits['network-requests'].details.items
        .filter((a) => a.resourceType === 'Script')
        .reduce((sum, a) => sum + (a.transferSize ?? 0), 0),
    };
    samples.push(metric);
    console.log(`${label} ${row.route} mobile ${run}/3: ${JSON.stringify(metric)}`);
  }
  row.samples = samples;
  row.best = samples.reduce((a, b) => (b.score > a.score ? b : a));
}
writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(rows, null, 2));
console.log(`Evidence: ${outDir}`);

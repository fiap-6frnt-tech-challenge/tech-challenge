import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = process.argv[2] ?? 'local';
const baseUrl = (process.argv[3] ?? 'http://localhost:3000').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS ?? 3);
const outDir = resolve(process.cwd(), 'perf');
const headersPath = resolve(process.cwd(), '.secrets/headers.json');

const PAGES = [
  { slug: 'login', path: '/login', auth: false },
  { slug: 'home', path: '/', auth: true },
  { slug: 'transactions', path: '/transactions', auth: true },
];

const PRESETS = [
  { name: 'desktop', flags: ['--preset=desktop'] },
  { name: 'mobile', flags: [] },
];

if (!existsSync(headersPath)) {
  console.error(`Falta ${headersPath}. Rode: node scripts/perf/session-cookie.mjs ${baseUrl}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

function runLighthouse(url, presetFlags, auth, outputPath) {
  const args = [
    '--yes',
    'lighthouse@12',
    url,
    '--only-categories=performance',
    ...presetFlags,
    '--output=json',
    `--output-path=${outputPath}`,
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
  ];
  if (auth) args.push(`--extra-headers=${headersPath}`);

  try {
    execFileSync('npx', args, { stdio: ['ignore', 'ignore', 'ignore'], shell: true });
  } catch (error) {
    if (!existsSync(outputPath)) throw error;
  }
}

function readMetrics(outputPath) {
  const report = JSON.parse(readFileSync(outputPath, 'utf-8'));
  const audits = report.audits;
  const jsBytes = (audits['network-requests']?.details?.items ?? [])
    .filter((item) => item.resourceType === 'Script')
    .reduce((total, item) => total + (item.transferSize ?? 0), 0);

  return {
    score: Math.round((report.categories.performance.score ?? 0) * 100),
    lcp: audits['largest-contentful-paint']?.numericValue ?? null,
    tbt: audits['total-blocking-time']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    fcp: audits['first-contentful-paint']?.numericValue ?? null,
    si: audits['speed-index']?.numericValue ?? null,
    jsBytes,
    requestedUrl: report.requestedUrl,
    finalUrl: report.finalDisplayedUrl ?? report.finalUrl,
  };
}

const rows = [];

for (const page of PAGES) {
  for (const preset of PRESETS) {
    const samples = [];
    for (let run = 1; run <= runs; run += 1) {
      const outputPath = resolve(outDir, `lh-${env}-${page.slug}-${preset.name}-${run}.json`);
      process.stdout.write(`  ${page.path} · ${preset.name} · run ${run}/${runs} … `);
      try {
        runLighthouse(`${baseUrl}${page.path}`, preset.flags, page.auth, outputPath);
        const metrics = readMetrics(outputPath);
        samples.push(metrics);
        process.stdout.write(`${metrics.score}\n`);
      } catch (error) {
        process.stdout.write(`FALHOU (${error.message.split('\n')[0]})\n`);
      }
    }

    if (samples.length === 0) continue;

    const best = samples.reduce((a, b) => (b.score > a.score ? b : a));
    rows.push({
      page: page.path,
      preset: preset.name,
      best,
      scores: samples.map((sample) => sample.score),
      redirected: !best.finalUrl?.endsWith(page.path) && page.path !== '/',
    });
  }
}

const ms = (value) => (value === null ? '—' : `${(value / 1000).toFixed(2)} s`);
const msInt = (value) => (value === null ? '—' : `${Math.round(value)} ms`);

console.log(`\n### Lighthouse — ${env} (${baseUrl}) — best-of-${runs}\n`);
console.log('| Página | Preset | Perf | LCP | TBT | CLS | JS inicial | Runs |');
console.log('| ------ | ------ | ---: | --: | --: | --: | ---------: | ---- |');
for (const row of rows) {
  console.log(
    `| \`${row.page}\` | ${row.preset} | **${row.best.score}** | ${ms(row.best.lcp)} | ` +
      `${msInt(row.best.tbt)} | ${row.best.cls?.toFixed(3) ?? '—'} | ` +
      `${(row.best.jsBytes / 1024).toFixed(0)} kB | ${row.scores.join(' / ')} |`
  );
}

const redirects = rows.filter((row) => row.redirected);
if (redirects.length > 0) {
  console.log(
    `\n> Atenção: ${redirects.map((row) => row.page).join(', ')} redirecionou (final: ${redirects[0].best.finalUrl}). Cookie de sessão expirado?`
  );
}

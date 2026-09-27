import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const wanted = process.argv[2] ?? 'todos';
const outDir = resolve(process.cwd(), 'perf');

if (!existsSync(outDir)) {
  console.error(
    `Não há nada em ${outDir}. Rode antes: node scripts/perf/lighthouse-batch.mjs <env> <url>`
  );
  process.exit(1);
}

const PAGE_ORDER = ['login', 'home', 'transactions'];
const PAGE_PATHS = { login: '/login', home: '/', transactions: '/transactions' };

const groups = new Map();

for (const file of readdirSync(outDir).filter((name) => /^lh-.*\.json$/.test(name))) {
  const match = /^lh-(.+?)-(login|home|transactions)-(desktop|mobile)-(\d+)\.json$/.exec(file);
  if (!match) continue;
  const [, env, page, preset] = match;
  if (wanted !== 'todos' && env !== wanted) continue;

  let report;
  try {
    report = JSON.parse(readFileSync(resolve(outDir, file), 'utf-8'));
  } catch {
    console.error(`! ${file} ilegível, ignorado`);
    continue;
  }

  const audits = report.audits;
  const jsBytes = (audits['network-requests']?.details?.items ?? [])
    .filter((item) => item.resourceType === 'Script')
    .reduce((total, item) => total + (item.transferSize ?? 0), 0);

  const key = `${env}|${page}|${preset}`;
  if (!groups.has(key)) groups.set(key, { env, page, preset, samples: [] });
  groups.get(key).samples.push({
    file,
    score: Math.round((report.categories.performance.score ?? 0) * 100),
    lcp: audits['largest-contentful-paint']?.numericValue ?? null,
    tbt: audits['total-blocking-time']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    fcp: audits['first-contentful-paint']?.numericValue ?? null,
    jsBytes,
    finalUrl: report.finalDisplayedUrl ?? report.finalUrl,
    fetchTime: report.fetchTime,
    userAgent: report.environment?.hostUserAgent,
  });
}

const rows = [...groups.values()].sort(
  (a, b) =>
    a.env.localeCompare(b.env) ||
    PAGE_ORDER.indexOf(a.page) - PAGE_ORDER.indexOf(b.page) ||
    a.preset.localeCompare(b.preset)
);

const seconds = (value) => (value === null ? '—' : `${(value / 1000).toFixed(2)} s`);

for (const env of [...new Set(rows.map((row) => row.env))]) {
  const envRows = rows.filter((row) => row.env === env);
  console.log(`\n#### ${env}\n`);
  console.log('| Página | Preset | Perf (best) | LCP | TBT | CLS | JS inicial | Execuções |');
  console.log('| ------ | ------ | ----------: | --: | --: | --: | ---------: | --------- |');
  for (const row of envRows) {
    const best = row.samples.reduce((a, b) => (b.score > a.score ? b : a));
    const scores = row.samples.map((sample) => sample.score);
    console.log(
      `| \`${PAGE_PATHS[row.page]}\` | ${row.preset} | **${best.score}** | ${seconds(best.lcp)} | ` +
        `${Math.round(best.tbt)} ms | ${best.cls?.toFixed(3) ?? '—'} | ${(best.jsBytes / 1024).toFixed(0)} kB | ` +
        `${scores.sort((a, b) => a - b).join(' / ')} |`
    );
  }

  const redirected = envRows.flatMap((row) =>
    row.samples.filter((sample) => /\/login/.test(sample.finalUrl) && row.page !== 'login')
  );
  if (redirected.length > 0) {
    console.log(`\n> ${redirected.length} execução(ões) caíram em /login (sessão não aplicada).`);
  }

  const first = envRows[0]?.samples[0];
  if (first) console.log(`\nColetado em ${first.fetchTime} · ${first.userAgent}`);
}

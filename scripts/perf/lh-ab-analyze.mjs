import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.cwd(), process.argv[2] ?? 'perf/ab/results');
const [before, after] = [process.argv[3] ?? 'before', process.argv[4] ?? 'after'];

const PAGES = {
  home: { path: '/', ready: 'overview', remote: 'transactions/AccountOverview' },
  transactions: {
    path: '/transactions',
    ready: 'transactions',
    remote: 'transactions/TransactionsPage',
  },
};

function readSample(file) {
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const audits = report.audits;
  const timings = audits['user-timings']?.details?.items ?? [];
  const [, build, slug] = file.match(/^(.+)-(home|transactions)-\d+\.json$/);
  const page = PAGES[slug];
  const ready = timings.find((item) => item.name === `${page.ready}:ready`);
  const loaded = timings.find((item) => item.name === `mf:loadRemote ${page.remote}`);
  const mountedAt = loaded ? loaded.startTime + loaded.duration : Infinity;
  const requests = audits['network-requests']?.details?.items ?? [];
  const isSession = (item) => new URL(item.url).pathname === '/api/auth/session';
  return {
    build,
    slug,
    lcp: audits['largest-contentful-paint'].numericValue,
    fcp: audits['first-contentful-paint'].numericValue,
    tbt: audits['total-blocking-time'].numericValue,
    cls: audits['cumulative-layout-shift'].numericValue,
    contentReady: ready && loaded ? ready.startTime - mountedAt : null,
    requestsBeforeMount: requests.filter((item) => item.networkRequestTime < mountedAt).length,
    sessionRequests: requests.filter(isSession).length,
    sessionBeforeMount: requests.filter(
      (item) => isSession(item) && item.networkRequestTime < mountedAt
    ).length,
    lcpElement:
      audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet ??
      '—',
    scripting: Object.fromEntries(
      (audits['bootup-time']?.details?.items ?? [])
        .filter((item) => URL.canParse(item.url))
        .map((item) => [new URL(item.url).pathname, item.scripting])
    ),
    failed: Boolean(report.runtimeError),
  };
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  return sorted[low] + (sorted[Math.ceil(position)] - sorted[low]) * (position - low);
};

function uDistribution(n, m) {
  const memo = new Map();
  const count = (a, b, u) => {
    if (u < 0) return 0;
    if (a === 0 || b === 0) return u === 0 ? 1 : 0;
    const key = `${a},${b},${u}`;
    if (!memo.has(key)) memo.set(key, count(a - 1, b, u - b) + count(a, b - 1, u));
    return memo.get(key);
  };
  const counts = Array.from({ length: n * m + 1 }, (_, u) => count(n, m, u));
  const total = counts.reduce((sum, value) => sum + value, 0);
  return counts.map((value) => value / total);
}

function compare(a, b) {
  const n = a.length;
  const m = b.length;
  let u = 0;
  for (const x of a) for (const y of b) u += y > x ? 1 : y === x ? 0.5 : 0;
  const pdf = uDistribution(n, m);
  const cdf = (k) => pdf.slice(0, Math.floor(k) + 1).reduce((sum, value) => sum + value, 0);
  const p = Math.min(1, 2 * Math.min(cdf(u), 1 - cdf(Math.ceil(u) - 1)));
  const differences = a.flatMap((x) => b.map((y) => y - x)).sort((x, y) => x - y);
  let k = 1;
  while (cdf(k) <= 0.025) k += 1;
  return {
    estimate: median(differences),
    low: differences[k - 1],
    high: differences[differences.length - k],
    p,
  };
}

const read = readdirSync(dir)
  .filter((file) => /-(home|transactions)-\d+\.json$/.test(file))
  .map(readSample);
const samples = read.filter((sample) => !sample.failed);
if (samples.length < read.length) {
  console.log(`Relatórios com erro do Lighthouse ignorados: ${read.length - samples.length}`);
}

const chunks = Object.keys(samples[0]?.scripting ?? {}).filter((path) =>
  samples.every((sample) => sample.scripting[path] !== undefined)
);
const frameworkChunk = chunks.sort(
  (x, y) => median(samples.map((s) => s.scripting[y])) - median(samples.map((s) => s.scripting[x]))
)[0];
const stallLimit = 2 * median(samples.map((sample) => sample.scripting[frameworkChunk]));
const kept = samples.filter((sample) => sample.scripting[frameworkChunk] <= stallLimit);

console.log(
  `Amostras: ${samples.length}; descartadas por travamento: ${samples.length - kept.length}`
);
console.log(
  `Chunk de referência: ${frameworkChunk} (limite ${Math.round(stallLimit)} ms de scripting)\n`
);

const fmt = (value, digits = 0) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const describe = (values, digits) =>
  `${fmt(median(values), digits)} [${fmt(quantile(values, 0.25), digits)}–${fmt(quantile(values, 0.75), digits)}]`;
const signed = (value, digits) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value), digits)}`;

const METRICS = [
  ['LCP', 'lcp', 0, ' ms'],
  ['FCP', 'fcp', 0, ' ms'],
  ['TBT', 'tbt', 0, ' ms'],
  ['CLS', 'cls', 3, ''],
  ['Remote carregado → pronto', 'contentReady', 0, ' ms'],
  ['Requisições antes de o remote montar', 'requestsBeforeMount', 0, ''],
  ['`/api/auth/session` na carga', 'sessionRequests', 0, ''],
];

console.log(
  '| Página | Métrica | Antes (mediana [Q1–Q3]) | Depois (mediana [Q1–Q3]) | Diferença — IC 95% | p |'
);
console.log('| --- | --- | --: | --: | --: | --: |');
for (const [slug, page] of Object.entries(PAGES)) {
  for (const [label, key, digits, unit] of METRICS) {
    const a = kept
      .filter((s) => s.build === before && s.slug === slug)
      .map((s) => s[key])
      .filter((v) => v !== null);
    const b = kept
      .filter((s) => s.build === after && s.slug === slug)
      .map((s) => s[key])
      .filter((v) => v !== null);
    if (!a.length || !b.length) continue;
    const { estimate, low, high, p } = compare(a, b);
    console.log(
      `| \`${page.path}\` | ${label} | ${describe(a, digits)}${unit} | ${describe(b, digits)}${unit} | ` +
        `${signed(estimate, digits)} [${signed(low, digits)}, ${signed(high, digits)}]${unit} | ${fmt(p, p < 0.001 ? 5 : 2)} |`
    );
  }
}

console.log('\nElemento de LCP (mais frequente):');
for (const slug of Object.keys(PAGES)) {
  for (const build of [before, after]) {
    const tally = new Map();
    for (const sample of kept.filter((s) => s.build === build && s.slug === slug)) {
      tally.set(sample.lcpElement, (tally.get(sample.lcpElement) ?? 0) + 1);
    }
    const [element, times] = [...tally].sort((x, y) => y[1] - x[1])[0] ?? ['—', 0];
    console.log(`- ${slug} · ${build}: ${element} (${times}×)`);
  }
}

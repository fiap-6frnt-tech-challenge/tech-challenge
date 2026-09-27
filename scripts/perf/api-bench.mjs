import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const histUtil = require('hdr-histogram-percentiles-obj');
if (!histUtil.percentiles.includes(95)) {
  histUtil.percentiles.push(95);
  histUtil.percentiles.sort((a, b) => a - b);
}

const autocannon = require('autocannon');

const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)) {
  console.error(`Recusando rodar contra ${baseUrl}: o bench é só para o build local.`);
  process.exit(1);
}

const connections = Number(process.env.PERF_CONNECTIONS ?? 10);
const duration = Number(process.env.PERF_DURATION ?? 15);
const outDir = resolve(process.cwd(), 'perf');

const cookiePath = resolve(process.cwd(), '.secrets/cookie.txt');
if (!existsSync(cookiePath)) {
  console.error(`Falta ${cookiePath}. Rode: node scripts/perf/session-cookie.mjs ${baseUrl}`);
  process.exit(1);
}

const cookie = readFileSync(cookiePath, 'utf-8').trim();

const ENDPOINTS = [
  { name: 'lista paginada (10 itens)', path: '/api/transactions?_page=1&_per_page=10' },
  { name: 'lista completa (sem paginação)', path: '/api/transactions' },
  { name: 'resumo / gráficos', path: '/api/transactions/summary' },
  { name: 'busca paginada (q=mercado)', path: '/api/transactions?q=mercado&_page=1&_per_page=10' },
];

async function probe(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } });
  const body = await response.arrayBuffer();
  return { status: response.status, bytes: body.byteLength };
}

const results = [];

for (const endpoint of ENDPOINTS) {
  const url = `${baseUrl}${endpoint.path}`;
  const check = await probe(endpoint.path);
  if (check.status !== 200) {
    throw new Error(
      `${endpoint.path} -> HTTP ${check.status} (cookie expirado? rode session-cookie.mjs)`
    );
  }

  process.stdout.write(
    `\n> ${endpoint.name}\n  ${url}\n  payload: ${(check.bytes / 1024).toFixed(1)} kB\n`
  );

  const result = await autocannon({
    url,
    connections,
    duration,
    headers: { Cookie: cookie },
  });

  results.push({ ...endpoint, url, payloadBytes: check.bytes, result });

  process.stdout.write(
    `  p50 ${result.latency.p50} ms · p95 ${result.latency.p95} ms · p99 ${result.latency.p99} ms · ` +
      `${result.requests.average.toFixed(1)} req/s · ${result.non2xx} non-2xx\n`
  );
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(
  resolve(outDir, `api-bench-${stamp}.json`),
  `${JSON.stringify({ baseUrl, connections, duration, results }, null, 2)}\n`
);

console.log('\n| Endpoint | Payload | p50 | p95 | p99 | req/s | Erros |');
console.log('| -------- | ------: | --: | --: | --: | ----: | ----: |');
for (const row of results) {
  console.log(
    `| \`${row.path}\` | ${(row.payloadBytes / 1024).toFixed(1)} kB | ${row.result.latency.p50} ms | ` +
      `${row.result.latency.p95} ms | ${row.result.latency.p99} ms | ${row.result.requests.average.toFixed(0)} | ` +
      `${row.result.non2xx + row.result.errors} |`
  );
}
console.log(`\nJSON cru em perf/api-bench-${stamp}.json`);

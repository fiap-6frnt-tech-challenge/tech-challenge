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

const LIST = '/api/transactions?_page=1&_per_page=10';
const OVERVIEW = '/api/transactions/overview';
const SUMMARY = '/api/transactions/summary';
const runOffset = Math.floor(Math.random() * 500_000);
const futureDay = (n) => new Date(Date.UTC(2100, 0, 1 + runOffset + n)).toISOString().slice(0, 10);

const ENDPOINTS = [
  { name: 'lista paginada (10 itens)', path: LIST },
  { name: 'lista paginada (10 itens), tempo de resposta', path: LIST, connections: 1 },
  { name: 'lista paginada (100 itens)', path: '/api/transactions?_page=1&_per_page=100' },
  { name: 'overview da home (saldo + 5 recentes)', path: OVERVIEW },
  { name: 'resumo / gráficos', path: SUMMARY },
  { name: 'busca paginada (q=mercado)', path: '/api/transactions?q=mercado&_page=1&_per_page=10' },
  { name: 'lista (10 itens), revalidação', path: LIST, connections: 1, revalidate: true },
  { name: 'overview, 1 conexão', path: OVERVIEW, connections: 1 },
  { name: 'overview, revalidação', path: OVERVIEW, connections: 1, revalidate: true },
  { name: 'resumo, 1 conexão (cache do servidor)', path: SUMMARY, connections: 1 },
  { name: 'resumo, revalidação', path: SUMMARY, connections: 1, revalidate: true },
  {
    name: 'resumo, faixa nova a cada requisição (sem cache do servidor)',
    path: `${SUMMARY}?from=2000-01-01&to=${futureDay(0)}`,
    connections: 1,
    pathFor: (n) => `${SUMMARY}?from=2000-01-01&to=${futureDay(n)}`,
  },
];

async function probe(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } });
  const body = await response.arrayBuffer();
  return { status: response.status, bytes: body.byteLength, etag: response.headers.get('etag') };
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

  const endpointConnections = endpoint.connections ?? connections;
  const expectedStatus = endpoint.revalidate ? '304' : '200';
  if (endpoint.revalidate && !check.etag) throw new Error(`${endpoint.path} não devolveu ETag`);

  process.stdout.write(
    `\n> ${endpoint.name}\n  ${url}\n  payload: ${(check.bytes / 1024).toFixed(1)} kB · ` +
      `${endpointConnections} conexão(ões) · espera ${expectedStatus}\n`
  );

  let sent = 0;
  const result = await autocannon({
    url,
    connections: endpointConnections,
    duration,
    headers: {
      Cookie: cookie,
      ...(endpoint.revalidate ? { 'If-None-Match': check.etag } : {}),
    },
    ...(endpoint.pathFor
      ? {
          requests: [
            {
              setupRequest: (request) => {
                sent += 1;
                request.path = endpoint.pathFor(sent);
                return request;
              },
            },
          ],
        }
      : {}),
  });

  const expected = result.statusCodeStats[expectedStatus]?.count ?? 0;
  const responses = Object.values(result.statusCodeStats).reduce(
    (total, { count }) => total + count,
    0
  );

  results.push({
    ...endpoint,
    connections: endpointConnections,
    url,
    expectedStatus,
    payloadBytes: check.bytes,
    bytesPerResponse: responses > 0 ? result.throughput.total / responses : 0,
    unexpected: responses - expected + result.errors + result.timeouts,
    result,
  });

  process.stdout.write(
    `  p50 ${result.latency.p50} ms · p95 ${result.latency.p95} ms · p99 ${result.latency.p99} ms · ` +
      `${result.requests.average.toFixed(1)} req/s · ${expected}/${responses} com ${expectedStatus}\n`
  );
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(
  resolve(outDir, `api-bench-${stamp}.json`),
  `${JSON.stringify({ baseUrl, connections, duration, results }, null, 2)}\n`
);

console.log(
  '\n| Cenário | Conexões | Status | Payload | Bytes/resposta | p50 | p95 | p99 | req/s | Erros |'
);
console.log(
  '| ------- | -------: | -----: | ------: | -------------: | --: | --: | --: | ----: | ----: |'
);
for (const row of results) {
  console.log(
    `| ${row.name} | ${row.connections} | ${row.expectedStatus} | ${(row.payloadBytes / 1024).toFixed(1)} kB | ` +
      `${(row.bytesPerResponse / 1024).toFixed(2)} kB | ${row.result.latency.p50} ms | ` +
      `${row.result.latency.p95} ms | ${row.result.latency.p99} ms | ${row.result.requests.average.toFixed(0)} | ` +
      `${row.unexpected} |`
  );
}
console.log(`\nJSON cru em perf/api-bench-${stamp}.json`);

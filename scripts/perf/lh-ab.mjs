import { spawn } from 'node:child_process';
import {
  cpSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { freemem } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const abDir = resolve(root, 'perf/ab');
const [command = 'run', ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
  const index = rest.indexOf(`--${name}`);
  return index === -1 ? fallback : rest[index + 1];
};

const PAGES = {
  '/': { slug: 'home', ready: 'overview' },
  '/transactions': { slug: 'transactions', ready: 'transactions' },
};
const MFE_PORTS = { dashboard: 3002, transactions: 3003 };
const SHELL = 'http://localhost:3000';
const MIN_FREE_BYTES = 400 * 1024 * 1024;

function prepare(label) {
  const target = resolve(abDir, label);
  rmSync(target, { recursive: true, force: true });
  const standalone = resolve(root, 'apps/shell/.next/standalone');
  if (!existsSync(join(standalone, 'apps/shell/server.js')))
    throw new Error('Rode o build do shell antes.');
  cpSync(standalone, join(target, 'shell'), { recursive: true, dereference: true });
  cpSync(resolve(root, 'apps/shell/.next/static'), join(target, 'shell/apps/shell/.next/static'), {
    recursive: true,
  });
  cpSync(resolve(root, 'apps/shell/public'), join(target, 'shell/apps/shell/public'), {
    recursive: true,
  });
  for (const remote of Object.keys(MFE_PORTS)) {
    cpSync(resolve(root, `apps/${remote}-mfe/dist`), join(target, remote), { recursive: true });
    const manifest = JSON.parse(readFileSync(join(target, remote, 'mf-manifest.json'), 'utf8'));
    const exposes = manifest.exposes.flatMap((expose) => expose.assets.js.sync);
    console.log(`  ${remote}: ${exposes.map((path) => path.split('/').pop()).join(', ')}`);
  }
  console.log(`Build "${label}" copiado para ${target}`);
}

const TYPES = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.html': 'text/html',
};

function serveRemotes(buildDir) {
  const servers = Object.entries(MFE_PORTS).map(([remote, port]) => {
    const base = join(buildDir, remote);
    const gzipped = new Map();
    const server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', SHELL);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (req.method === 'OPTIONS') return res.writeHead(204).end();
      const path = join(base, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!path.startsWith(base) || !existsSync(path) || !statSync(path).isFile())
        return res.writeHead(404).end();
      const type = TYPES[extname(path)] ?? 'application/octet-stream';
      res.setHeader('Content-Type', type);
      res.setHeader(
        'Cache-Control',
        path.includes(`${join(base, 'static')}`)
          ? 'public, max-age=31536000, immutable'
          : 'no-cache'
      );
      if (/javascript|css|json/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
        if (!gzipped.has(path)) gzipped.set(path, gzipSync(readFileSync(path)));
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        return res.end(gzipped.get(path));
      }
      createReadStream(path).pipe(res);
    });
    server.listen(port, 'localhost');
    return server;
  });
  return () =>
    Promise.all(
      servers.map(
        (server) =>
          new Promise((done) => {
            server.close(done);
            server.closeAllConnections();
          })
      )
    );
}

async function waitFor(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check().catch(() => false)) return;
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`Tempo esgotado: ${label}`);
}

async function startShell(buildDir) {
  const child = spawn(process.execPath, ['apps/shell/server.js'], {
    cwd: join(buildDir, 'shell'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3000',
      HOSTNAME: 'localhost',
      AUTH_TRUST_HOST: 'true',
    },
    stdio: 'ignore',
  });
  await waitFor(async () => (await fetch(`${SHELL}/login`)).ok, 60_000, 'shell subir');
  return () =>
    new Promise((done) => {
      child.once('exit', done);
      child.kill();
    });
}

async function sessionCookie() {
  const jar = new Map();
  const keep = (response) => {
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const index = pair.indexOf('=');
      jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  };
  const cookie = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
  const csrf = await fetch(`${SHELL}/api/auth/csrf`);
  keep(csrf);
  const { csrfToken } = await csrf.json();
  const login = await fetch(`${SHELL}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie() },
    body: new URLSearchParams({
      csrfToken,
      email: process.env.PERF_USER_EMAIL ?? 'perf.user@bytebank.test',
      password: process.env.PERF_USER_PASSWORD ?? 'Senha123!',
      callbackUrl: `${SHELL}/`,
    }),
  });
  keep(login);
  const session = [...jar].find(([name]) => name.endsWith('session-token'));
  if (!session) throw new Error(`Login falhou (${login.status}).`);
  return { name: session[0], value: session[1] };
}

async function warmUp(path, ready, cookie) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.addCookies([{ ...cookie, url: SHELL }]);
    const page = await context.newPage();
    await page.goto(`${SHELL}${path}`);
    await page.waitForFunction(
      (mark) => performance.getEntriesByName(mark, 'mark').length > 0,
      `${ready}:ready`,
      {
        timeout: 120_000,
      }
    );
  } finally {
    await browser.close();
  }
}

async function waitForMemory() {
  const deadline = Date.now() + 60_000;
  while (freemem() < MIN_FREE_BYTES && Date.now() < deadline)
    await new Promise((done) => setTimeout(done, 1000));
  return Math.round(freemem() / 1024 / 1024);
}

async function lighthouse(url, cookie, outputPath) {
  const headersPath = `${outputPath}.headers.json`;
  writeFileSync(headersPath, JSON.stringify({ Cookie: `${cookie.name}=${cookie.value}` }));
  try {
    await new Promise((done) => {
      const child = spawn(
        'npx',
        [
          '--yes',
          'lighthouse@12',
          url,
          '--only-categories=performance',
          '--output=json',
          `--output-path=${outputPath}`,
          '--quiet',
          '--chrome-flags="--headless=new --no-sandbox --disable-gpu"',
          `--extra-headers=${headersPath}`,
        ],
        { stdio: 'ignore', shell: true }
      );
      child.once('exit', done);
    });
    if (!existsSync(outputPath)) throw new Error(`Lighthouse não gerou ${outputPath}`);
  } finally {
    rmSync(headersPath, { force: true });
  }
}

async function measure(build, path, key, sample, outputPath) {
  const { ready } = PAGES[path];
  const buildDir = resolve(abDir, build);
  const stopRemotes = serveRemotes(buildDir);
  const stopShell = await startShell(buildDir);
  try {
    const cookie = await sessionCookie();
    await warmUp(path, ready, cookie);
    const freeMb = await waitForMemory();
    process.stdout.write(`${key} #${sample} (${freeMb} MB livres) … `);
    let report;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await lighthouse(`${SHELL}${path}`, cookie, outputPath);
      report = JSON.parse(readFileSync(outputPath, 'utf8'));
      if (!report.runtimeError) break;
      process.stdout.write(`${report.runtimeError.code}, repetindo … `);
    }
    const mounted = (report.audits['user-timings']?.details?.items ?? []).some(
      (item) => item.name === `${ready}:ready`
    );
    process.stdout.write(
      `LCP ${Math.round(report.audits['largest-contentful-paint'].numericValue)} ms` +
        `${mounted ? '' : ' (REMOTE NÃO MONTOU)'}\n`
    );
  } finally {
    await stopShell();
    await stopRemotes();
  }
}

async function run() {
  const builds = [option('a', 'before'), option('b', 'after')];
  const samples = Number(option('samples', '10'));
  const paths = option('pages', '/,/transactions').split(',');
  const outDir = resolve(abDir, option('out', 'results'));
  mkdirSync(outDir, { recursive: true });
  const order = Array.from({ length: samples * 2 }, (_, index) => builds[[0, 1, 1, 0][index % 4]]);
  const counters = new Map();
  for (const build of order) {
    for (const path of paths) {
      const { slug } = PAGES[path];
      const key = `${build}-${slug}`;
      const sample = (counters.get(key) ?? 0) + 1;
      counters.set(key, sample);
      const outputPath = join(outDir, `${key}-${sample}.json`);
      if (existsSync(outputPath)) continue;
      for (let attempt = 1; ; attempt += 1) {
        try {
          await measure(build, path, key, sample, outputPath);
          break;
        } catch (error) {
          if (attempt === 3) throw error;
          const [reason] = error.message.split('\n');
          process.stdout.write(`${key} #${sample}: ${reason}, repetindo\n`);
        }
      }
    }
  }
}

if (command === 'prepare') prepare(rest[0]);
else if (command === 'serve') {
  const buildDir = resolve(abDir, rest[0]);
  serveRemotes(buildDir);
  await startShell(buildDir);
  console.log(`Build "${rest[0]}" em ${SHELL} (Ctrl+C encerra)`);
} else await run();

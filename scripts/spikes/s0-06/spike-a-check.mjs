// Spike A (S0-06): barramento RxJS singleton entre shell e MFEs.
// Pré-requisito: shell em :3000 e MFEs em :3002/:3003 (dev ou build de produção).
// Uso: node scripts/spikes/s0-06/spike-a-check.mjs [dev|prod]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MODE = process.argv[2] ?? 'prod';

async function fallbackAssets(app, origin) {
  let manifest;
  if (MODE === 'dev') {
    manifest = await (await fetch(`${origin}mf-manifest.json`)).json();
  } else {
    const manifestPath = path.join(ROOT, 'apps', app, 'dist', 'mf-manifest.json');
    if (!fs.existsSync(manifestPath)) return {};
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  const out = {};
  for (const shared of manifest.shared) {
    if (['rxjs', '@bytebank/core'].includes(shared.name)) {
      out[shared.name] = [...shared.assets.js.sync, ...shared.assets.js.async];
    }
  }
  return out;
}

function shellChunksWithRxjs() {
  const dir = path.join(ROOT, 'apps/shell/.next/static/chunks');
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .filter((f) => {
        const s = fs.readFileSync(path.join(dir, f), 'utf8');
        return s.includes('object unsubscribed') || s.includes('"switchMap"');
      })
  );
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const responses = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!/\.js(\?|$)/.test(url)) return;
  let bytes = null;
  try {
    bytes = (await res.body()).length;
  } catch {}
  responses.push({ url, status: res.status(), bytes });
});
const problems = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.goto('http://localhost:3000/spike-a', { waitUntil: 'networkidle', timeout: 120000 });
const emit = page.getByRole('button', { name: 'Emitir evento' });
await emit.waitFor({ timeout: 120000 });
await page.getByTestId('receiver-count').waitFor({ timeout: 120000 });

for (let i = 0; i < 3; i++) await emit.click();
await page.waitForTimeout(300);

const dom = {
  emitterSent: await page.getByTestId('emitter-sent').textContent(),
  dashboardReceived: await page.getByTestId('receiver-count').textContent(),
  dashboardLast: await page.getByTestId('receiver-last').textContent(),
  shellReceived: await page.getByTestId('shell-count').textContent(),
};

const identity = await page.evaluate(() => {
  const registry = globalThis.__bytebankSpikeA;
  const consumers = registry.consumers;
  const names = Object.keys(consumers);
  const allSame = (pick) => names.every((n) => pick(consumers[n]) === pick(consumers[names[0]]));
  return {
    consumers: names,
    coreEvaluations: registry.coreEvaluations,
    sameCoreInstanceId: allSame((c) => c.coreInstanceId),
    samePublishFn: allSame((c) => c.publish),
    sameEventsObservable: allSame((c) => c.events$),
    sameRxjsSubjectCtor: allSame((c) => c.rxSubject),
    rxjsSubjectIsCoreSubject: names.every(
      (n) => consumers[n].rxSubject === consumers[n].coreSubject
    ),
  };
});

const shareScope = await page.evaluate(() => {
  const out = {};
  for (const [owner, scopeMap] of Object.entries(globalThis.__FEDERATION__?.__SHARE__ ?? {})) {
    const scope = scopeMap?.default ?? {};
    for (const pkg of ['rxjs', '@bytebank/core', 'react']) {
      if (!scope[pkg]) continue;
      out[`${owner} → ${pkg}`] = Object.fromEntries(
        Object.entries(scope[pkg]).map(([version, s]) => [
          version,
          { from: s.from, loaded: Boolean(s.loaded), useIn: s.useIn },
        ])
      );
    }
  }
  return out;
});

const fallbackHits = [];
for (const [origin, app] of [
  ['http://localhost:3003/', 'transactions-mfe'],
  ['http://localhost:3002/', 'dashboard-mfe'],
]) {
  for (const [pkg, files] of Object.entries(await fallbackAssets(app, origin))) {
    for (const file of files) {
      if (responses.some((r) => r.url === origin + file))
        fallbackHits.push(`${origin}${file} (${pkg})`);
    }
  }
}

const rxjsShellChunks = shellChunksWithRxjs();
const shellRxjsDownloads = responses
  .filter((r) => r.url.includes('/_next/static/chunks/'))
  .filter((r) => rxjsShellChunks.has(path.basename(new URL(r.url).pathname)))
  .map((r) => `${path.basename(new URL(r.url).pathname)} ${r.bytes ?? '?'} B`);

console.log(
  JSON.stringify(
    {
      mode: MODE,
      dom,
      identity,
      shareScope,
      mfeFallbackChunksDownloaded: fallbackHits,
      shellChunksWithRxjsDownloaded: MODE === 'prod' ? shellRxjsDownloads : 'n/a (dev)',
      mfeJsRequests: responses
        .filter((r) => /localhost:300[23]/.test(r.url))
        .map((r) => `${r.status} ${r.url.replace('http://localhost:', ':')}`),
      problems,
    },
    null,
    2
  )
);

await page.screenshot({ path: path.join(os.tmpdir(), `spike-a-${MODE}.png`), fullPage: true });
await browser.close();

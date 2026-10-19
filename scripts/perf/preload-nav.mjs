import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = (process.env.PERF_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const PAIRS = Number(process.env.PERF_PAIRS ?? 3);
const USER = {
  name: 'Perf Preload',
  email: process.env.PERF_PRELOAD_EMAIL ?? 'perf.preload@bytebank.test',
  password: process.env.PERF_PRELOAD_PASSWORD ?? 'Preload-S208-2026!',
};
const SEED_COUNT = 25;
const VIEWPORT = { width: 1366, height: 900 };
const TIMEOUT = 180_000;
const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

const PROFILES = {
  'com-preload': null,
  'sem-preload': { saveData: true },
  '2g': { effectiveType: '2g' },
  'hover-isolado': null,
};

const outDir = resolve(process.cwd(), 'perf');
const out = { base: BASE, pairs: PAIRS, network: 'Slow 4G (150 ms, 1,6 Mbps)', runs: [] };

const short = (url) =>
  url
    .replace(BASE, '')
    .replace(/^http:\/\/localhost:(\d+)\//, ':$1/')
    .replace(/[?#].*$/, (q) => (q.includes('_page') ? q : ''));
const isMfeAsset = (url) => /localhost:300[23]\//.test(url) && !url.includes('mf-manifest');
const isListApi = (url) => url.includes('/api/transactions?');
const isHomeApi = (url) => /\/api\/transactions\/(overview|summary)/.test(url);

async function login(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await page.waitForTimeout(1500);
  await page.getByLabel(/email/i).fill(USER.email);
  await page.getByLabel(/senha/i).fill(USER.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: TIMEOUT }),
    page.getByRole('button', { name: /entrar/i }).click(),
  ]);
  return { context, page };
}

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
}

async function setup(browser) {
  const register = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(USER),
  });
  out.register = register.status;

  const { context, page } = await login(browser);
  const first = await (await page.request.get(`${BASE}/api/transactions?_page=1`)).json();
  for (let i = first.items; i < SEED_COUNT; i++) {
    const deposit = i % 4 === 0;
    await page.request.post(`${BASE}/api/transactions`, {
      data: {
        type: deposit ? 'deposit' : 'withdrawal',
        category: deposit ? 'salary' : 'food',
        amount: deposit ? 3000 + i : 40 + i,
        date: daysAgo(i * 6),
        description: `Preload S2-08 — ${i + 1}`,
      },
    });
  }
  const seeded = await (await page.request.get(`${BASE}/api/transactions?_page=1`)).json();
  out.seeded = { items: seeded.items, pages: seeded.pages };
  const state = await context.storageState();
  await context.close();
  return state;
}

async function open(browser, storageState, profile) {
  const context = await browser.newContext({ storageState, viewport: VIEWPORT });
  const hints = PROFILES[profile];
  if (hints) {
    await context.addInitScript((value) => {
      Object.defineProperty(Navigator.prototype, 'connection', {
        configurable: true,
        get: () => value,
      });
    }, hints);
  }
  if (profile === 'hover-isolado') {
    await context.addInitScript(() => {
      window.requestIdleCallback = () => 0;
    });
  }
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
  const requests = [];
  const finished = [];
  const sources = new Map();
  const urls = new Map();
  cdp.on('Network.requestWillBeSent', ({ requestId, request }) => urls.set(requestId, request.url));
  cdp.on('Network.requestServedFromCache', ({ requestId }) => {
    sources.set(urls.get(requestId), 'memory-cache');
  });
  cdp.on('Network.responseReceived', ({ requestId, response }) => {
    const url = urls.get(requestId);
    if (sources.get(url) === 'memory-cache') return;
    if (response.fromPrefetchCache) sources.set(url, 'prefetch-cache');
    else if (response.fromDiskCache) sources.set(url, 'disk-cache');
    else sources.set(url, `rede ${response.status}`);
  });
  page.on('request', (request) => requests.push(request.url()));
  page.on('requestfinished', (request) => finished.push(request.url()));
  const describe = (url) => `${short(url)} (${sources.get(url) ?? '?'})`;
  return { context, page, requests, finished, describe };
}

async function waitForFinished(page, finished, predicate, timeout) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (finished.some(predicate)) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

async function waitForEntry(page, name) {
  await page.waitForFunction((entry) => performance.getEntriesByName(entry).length > 0, name, {
    timeout: TIMEOUT,
  });
}

async function readEntries(page, names) {
  return page.evaluate((list) => {
    const result = {};
    for (const name of list) {
      const entry = performance.getEntriesByName(name).at(-1);
      result[name] = entry ? Math.round(entry.duration) : null;
    }
    return result;
  }, names);
}

async function watchBusy(page) {
  await page.evaluate(() => {
    window.__busySeen = false;
    const check = () => {
      if (document.querySelector('main [aria-busy="true"]')) window.__busySeen = true;
    };
    window.__busyObserver = new MutationObserver(check);
    window.__busyObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ['aria-busy'],
    });
  });
}

async function intentAndClick(page, requests, linkName, { hover, waitIntent = [] }) {
  const link = page.getByRole('link', { name: linkName, exact: true });
  const beforeIntent = requests.length;
  let hoverToSettledMs = null;
  if (hover) {
    const started = Date.now();
    const settled = waitIntent.map((predicate) =>
      page.waitForResponse((response) => predicate(response.url()), { timeout: TIMEOUT })
    );
    await link.hover();
    if (settled.length > 0) {
      await Promise.all(settled.map(async (response) => (await response).finished()));
      hoverToSettledMs = Date.now() - started;
    }
    await page.waitForTimeout(300);
  }
  const intent = requests.slice(beforeIntent);
  const beforeClick = requests.length;
  if (hover) await link.click();
  else await link.evaluate((anchor) => anchor.click());
  return { intent, beforeClick, hoverToSettledMs };
}

async function homeToTransactions(browser, storageState, profile, hover) {
  const { context, page, requests, finished, describe } = await open(
    browser,
    storageState,
    profile
  );
  const preloads = profile === 'com-preload' || profile === 'hover-isolado';
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await waitForEntry(page, 'overview:ready');
    await page.waitForTimeout(1500);
    const idle = requests.filter((url) => url.includes('TransactionsPage'));

    const { intent, beforeClick, hoverToSettledMs } = await intentAndClick(
      page,
      requests,
      'Transações',
      { hover, waitIntent: hover && preloads ? [isListApi] : [] }
    );
    await waitForEntry(page, 'nav:click → transactions:ready');
    const afterClick = requests.slice(beforeClick);
    const timing = await readEntries(page, [
      'nav:click → transactions:ready',
      'mf:loadRemote transactions/TransactionsPage',
    ]);

    const page2Url = (url) => isListApi(url) && url.includes('_page=2');
    const prefetchedPage2 = await waitForFinished(
      page,
      finished,
      page2Url,
      preloads ? 30_000 : 3000
    );
    await watchBusy(page);
    const beforePage2 = requests.length;
    await page
      .getByRole('navigation', { name: 'Paginação' })
      .getByRole('button', { name: 'Página 2' })
      .click();
    await page
      .locator('[aria-label="Página 2"][aria-current="page"]')
      .waitFor({ timeout: TIMEOUT });
    await waitForFinished(page, finished, page2Url, 30_000);
    await page.waitForTimeout(1500);
    const page2 = {
      prefetched: prefetchedPage2,
      requestsAfterClick: requests.slice(beforePage2).filter(isListApi).map(short),
      busyShown: await page.evaluate(() => window.__busySeen),
    };

    return {
      route: '/ → /transactions',
      profile,
      hover,
      idlePreloaded: idle.map(describe),
      intent: {
        mfe: intent.filter(isMfeAsset).map(describe),
        api: intent.filter(isListApi).map(short),
        hoverToSettledMs,
      },
      afterClick: {
        mfe: afterClick.filter(isMfeAsset).map(describe),
        api: afterClick.filter(isListApi).map(short),
      },
      clickToReadyMs: timing['nav:click → transactions:ready'],
      loadRemoteMs: timing['mf:loadRemote transactions/TransactionsPage'],
      page2,
    };
  } finally {
    await context.close();
  }
}

async function transactionsToHome(browser, storageState, profile, hover) {
  const { context, page, requests, describe } = await open(browser, storageState, profile);
  try {
    await page.goto(`${BASE}/transactions`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await waitForEntry(page, 'transactions:ready');
    await page.waitForTimeout(1500);
    const idle = requests.filter((url) => /Dashboard|AccountOverview/.test(url));

    const { intent, beforeClick, hoverToSettledMs } = await intentAndClick(
      page,
      requests,
      'Início',
      {
        hover,
        waitIntent:
          hover && profile === 'com-preload'
            ? [(url) => url.includes('/overview'), (url) => url.includes('/summary')]
            : [],
      }
    );
    await page.evaluate(() => {
      const started = performance.now();
      const scrollToCharts = () => {
        const main = document.querySelector('main');
        main?.scrollTo(0, main.scrollHeight);
        const done = performance.getEntriesByName('dashboard:ready').length > 0;
        if (!done && performance.now() - started < 60_000) requestAnimationFrame(scrollToCharts);
      };
      scrollToCharts();
    });
    await waitForEntry(page, 'nav:click → overview:ready');
    await waitForEntry(page, 'nav:click → dashboard:ready');
    const afterClick = requests.slice(beforeClick);
    const timing = await readEntries(page, [
      'nav:click → overview:ready',
      'nav:click → dashboard:ready',
      'mf:loadRemote dashboard/Dashboard',
      'mf:loadRemote transactions/AccountOverview',
    ]);
    return {
      route: '/transactions → /',
      profile,
      hover,
      idlePreloaded: idle.map(describe),
      intent: {
        mfe: intent.filter(isMfeAsset).map(describe),
        api: intent.filter(isHomeApi).map(short),
        hoverToSettledMs,
      },
      afterClick: {
        mfe: afterClick.filter(isMfeAsset).map(describe),
        api: afterClick.filter(isHomeApi).map(short),
      },
      clickToOverviewMs: timing['nav:click → overview:ready'],
      clickToDashboardMs: timing['nav:click → dashboard:ready'],
      loadRemoteDashboardMs: timing['mf:loadRemote dashboard/Dashboard'],
      loadRemoteOverviewMs: timing['mf:loadRemote transactions/AccountOverview'],
    };
  } finally {
    await context.close();
  }
}

function median(values) {
  const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function summarize() {
  const pick = (route, profile, key) =>
    median(out.runs.filter((r) => r.route === route && r.profile === profile).map((r) => r[key]));
  out.summary = {
    'clique → lista (/transactions)': {
      sem: pick('/ → /transactions', 'sem-preload', 'clickToReadyMs'),
      com: pick('/ → /transactions', 'com-preload', 'clickToReadyMs'),
    },
    'loadRemote TransactionsPage': {
      sem: pick('/ → /transactions', 'sem-preload', 'loadRemoteMs'),
      com: pick('/ → /transactions', 'com-preload', 'loadRemoteMs'),
    },
    'clique → visão geral (/)': {
      sem: pick('/transactions → /', 'sem-preload', 'clickToOverviewMs'),
      com: pick('/transactions → /', 'com-preload', 'clickToOverviewMs'),
    },
    'clique → dashboard (/)': {
      sem: pick('/transactions → /', 'sem-preload', 'clickToDashboardMs'),
      com: pick('/transactions → /', 'com-preload', 'clickToDashboardMs'),
    },
    'loadRemote Dashboard': {
      sem: pick('/transactions → /', 'sem-preload', 'loadRemoteDashboardMs'),
      com: pick('/transactions → /', 'com-preload', 'loadRemoteDashboardMs'),
    },
  };
}

const phase = process.argv[2] ?? 'all';
const browser = await chromium.launch();
try {
  const storageState = await setup(browser);
  if (phase === 'all' || phase === 'checks') {
    out.runs.push(await homeToTransactions(browser, storageState, 'hover-isolado', true));
    out.runs.push(await homeToTransactions(browser, storageState, '2g', true));
    out.runs.push(await transactionsToHome(browser, storageState, '2g', true));
  }
  if (phase === 'all' || phase === 'timing') {
    for (let i = 0; i < PAIRS; i++) {
      out.runs.push(await homeToTransactions(browser, storageState, 'sem-preload', true));
      out.runs.push(await homeToTransactions(browser, storageState, 'com-preload', true));
      out.runs.push(await transactionsToHome(browser, storageState, 'sem-preload', true));
      out.runs.push(await transactionsToHome(browser, storageState, 'com-preload', true));
    }
    summarize();
  }
} finally {
  await browser.close();
  mkdirSync(outDir, { recursive: true });
  const file = resolve(
    outDir,
    `preload-nav-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary ?? out.runs, null, 2));
  console.log(`\nJSON completo em ${file}`);
}

// Spike C (S0-06): AES-256-GCM + Vercel Blob (ida e volta de 5 MB) medindo tempo e memória.
// Pré-requisito: shell em :3000 com BLOB_READ_WRITE_TOKEN e o estado de login gerado por
// `node scripts/spikes/s0-06/spike-b-check.mjs setup`. Cada execução apaga o próprio blob.
// Uso: node scripts/spikes/s0-06/spike-c-check.mjs
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000/api/spike/attachment-crypto';
const STATE = path.join(os.tmpdir(), 'bytebank-spike-s006-state.json');

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: STATE });
const results = [];
const call = async (label, fn) => {
  const start = Date.now();
  const res = await fn();
  const body = await res.json().catch(async () => ({ raw: (await res.text()).slice(0, 300) }));
  results.push({ label, status: res.status(), totalMs: Date.now() - start, ...body });
};

for (let i = 0; i < 3; i++) {
  await call(`GET 5MB public #${i + 1}`, () =>
    context.request.get(`${BASE}?sizeMb=5&access=public`, { timeout: 120000 })
  );
}
const file = crypto.randomBytes(5 * 1024 * 1024);
for (let i = 0; i < 2; i++) {
  await call(`POST multipart 5MB public #${i + 1}`, () =>
    context.request.post(`${BASE}?access=public`, {
      multipart: { file: { name: 'recibo.pdf', mimeType: 'application/pdf', buffer: file } },
      timeout: 120000,
    })
  );
}
await call('GET 5MB private', () =>
  context.request.get(`${BASE}?sizeMb=5&access=private`, { timeout: 120000 })
);

await browser.close();
console.log(JSON.stringify(results, null, 2));

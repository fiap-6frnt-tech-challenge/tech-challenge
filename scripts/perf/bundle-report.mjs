import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const TARGETS = [
  { name: 'shell', dir: 'apps/shell/.next/static/chunks' },
  { name: 'dashboard-mfe', dir: 'apps/dashboard-mfe/dist/static/js' },
  { name: 'transactions-mfe', dir: 'apps/transactions-mfe/dist/static/js' },
];
const MARKERS = {
  recharts: (source) => source.includes('recharts-wrapper'),
  zod: (source) => /\$ZodError|ZodError/.test(source),
  federation: (source) => source.includes('mf:loadRemote ') || source.includes('__FEDERATION__'),
};

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return name.endsWith('.js') ? [path] : [];
  });
}

const kb = (bytes) => (bytes / 1024).toFixed(1);
const reports = process.argv.slice(2);
const flagsByFile = new Map();

for (const target of TARGETS) {
  const dir = resolve(root, target.dir);
  if (!existsSync(dir)) {
    console.log(`\n${target.name}: ${target.dir} não existe (rode o build)`);
    continue;
  }
  const chunks = files(dir).map((path) => {
    const body = readFileSync(path);
    const source = body.toString();
    return {
      file: relative(dir, path).replaceAll('\\', '/'),
      raw: body.length,
      gzip: gzipSync(body).length,
      flags: Object.entries(MARKERS)
        .filter(([, matches]) => matches(source))
        .map(([flag]) => flag),
    };
  });
  for (const chunk of chunks) flagsByFile.set(chunk.file.split('/').pop(), chunk.flags);
  if (reports.length > 0) continue;
  const total = chunks.reduce((sum, chunk) => ({
    raw: sum.raw + chunk.raw,
    gzip: sum.gzip + chunk.gzip,
  }));
  console.log(
    `\n### ${target.name} — ${chunks.length} chunks, ${kb(total.raw)} kB raw / ${kb(total.gzip)} kB gzip\n`
  );
  console.log('| Chunk | Raw (kB) | Gzip (kB) | Contém |');
  console.log('| ----- | -------: | --------: | ------ |');
  for (const chunk of chunks
    .filter((chunk) => chunk.flags.length > 0 || chunk.raw > 50 * 1024)
    .sort((a, b) => b.raw - a.raw)) {
    console.log(
      `| \`${chunk.file}\` | ${kb(chunk.raw)} | ${kb(chunk.gzip)} | ${chunk.flags.join(', ') || '—'} |`
    );
  }
}

for (const path of reports) {
  const report = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const scripts = (report.audits['network-requests']?.details?.items ?? []).filter(
    (item) => item.resourceType === 'Script'
  );
  const loaded = scripts.map((item) => ({
    name: new URL(item.url).pathname.split('/').pop(),
    transfer: item.transferSize ?? 0,
    flags: flagsByFile.get(new URL(item.url).pathname.split('/').pop()) ?? [],
  }));
  const transfer = loaded.reduce((sum, script) => sum + script.transfer, 0);
  const flagged = (flag) => loaded.filter((script) => script.flags.includes(flag));
  console.log(
    `\n${path}: ${loaded.length} scripts, ${kb(transfer)} kB transferidos · ` +
      Object.keys(MARKERS)
        .map(
          (flag) =>
            `${flag}: ${
              flagged(flag)
                .map((script) => script.name)
                .join(', ') || '—'
            }`
        )
        .join(' · ')
  );
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Next 16 experimental-analyze: uint32 BE JSON length, JSON header, binary edge tables.
const directory = process.argv[2] ?? 'apps/shell/.next/diagnostics/analyze/data';
const buffer = readFileSync(resolve(directory, 'modules.data'));
const jsonLength = buffer.readUInt32BE(0);
const header = JSON.parse(buffer.subarray(4, 4 + jsonLength));
const binary = buffer.subarray(4 + jsonLength);
function dependencies(index) {
  const { offset } = header.module_dependencies;
  const offsets = binary.readUInt32BE(offset);
  const previous = index === 0 ? 0 : binary.readUInt32BE(offset + 4 + 4 * (index - 1));
  const end = binary.readUInt32BE(offset + 4 + 4 * index);
  const start = offset + 4 + 4 * offsets;
  return Array.from({ length: end - previous }, (_, i) =>
    binary.readUInt32BE(start + 4 * (previous + i))
  );
}
const entry = header.modules.findIndex(({ ident }) =>
  ident.includes('/src/lib/federation.ts [app-client]')
);
if (entry < 0) throw new Error('Client federation entrypoint missing from analyzer');
const visited = new Set();
const pending = [entry];
while (pending.length) {
  const index = pending.pop();
  if (visited.has(index)) continue;
  visited.add(index);
  pending.push(...dependencies(index));
}
const paths = [...new Set([...visited].map((index) => header.modules[index].path))];
console.log(
  JSON.stringify(
    {
      entry: header.modules[entry].ident,
      synchronousModules: paths.length,
      rechartsModules: paths.filter((path) => path.includes('/node_modules/recharts/')).length,
      zodModules: paths.filter((path) => path.includes('/node_modules/zod/')).length,
      schemaPaths: paths.filter(
        (path) => path.includes('/schemas/') || path.endsWith('/schema.ts')
      ),
    },
    null,
    2
  )
);

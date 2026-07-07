import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const staticSource = resolve(root, 'apps/shell/.next/static');
const publicSource = resolve(root, 'apps/shell/public');
const staticTarget = resolve(root, 'apps/shell/.next/standalone/apps/shell/.next/static');
const publicTarget = resolve(root, 'apps/shell/.next/standalone/apps/shell/public');

function copyIfExists(source, target) {
  if (!existsSync(source)) return;
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

copyIfExists(staticSource, staticTarget);
copyIfExists(publicSource, publicTarget);

process.env.PORT = process.env.PORT ?? '3000';
process.env.HOSTNAME = process.env.HOSTNAME ?? 'localhost';

await import('../apps/shell/.next/standalone/apps/shell/server.js');

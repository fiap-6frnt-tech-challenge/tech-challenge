import { config } from 'dotenv';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Database } from './index';

config({ path: '.env.local' });

const EXPAND_MIGRATION = '0009_pii_encryption';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'db']);

function isLocalDatabase(url: string | undefined) {
  try {
    return url !== undefined && LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function migrateUpTo(db: Database, tag: string) {
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const source = resolve(process.cwd(), 'drizzle');
  const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8')) as {
    entries: Array<{ tag: string }>;
  };
  const last = journal.entries.findIndex((entry) => entry.tag === tag);
  if (last < 0) throw new Error(`Migração ${tag} não encontrada`);
  const entries = journal.entries.slice(0, last + 1);
  const folder = await mkdtemp(join(tmpdir(), 'bytebank-migrations-'));
  try {
    await mkdir(join(folder, 'meta'));
    await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries }));
    for (const entry of entries) {
      await copyFile(join(source, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
    }
    await migrate(db, { migrationsFolder: folder });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

async function backfillPii() {
  const dryRun = process.argv.includes('--dry-run');
  const devKeys = process.argv.includes('--dev-keys');
  if (devKeys && !isLocalDatabase(process.env.DATABASE_URL)) {
    throw new Error('--dev-keys só vale para banco local (localhost ou o serviço db do compose)');
  }
  if (!devKeys && (!process.env.DATA_ENCRYPTION_KEYS || !process.env.BLIND_INDEX_KEY)) {
    throw new Error(
      'Defina DATA_ENCRYPTION_KEYS, DATA_ENCRYPTION_ACTIVE_KEY_ID e BLIND_INDEX_KEY com as mesmas chaves do servidor (no banco local do dev, use --dev-keys)'
    );
  }
  const { sql } = await import('drizzle-orm');
  const { EncryptLegacyUsers } = await import('@bytebank/core/application');
  const { db } = await import('./index');
  const { resolveBlindIndex, resolveCipher } = await import('@/server/container');
  const { DrizzleLegacyUserRepository } =
    await import('@/server/infrastructure/db/DrizzleLegacyUserRepository');

  const { rows } = await db.execute<{ column_name: string }>(
    sql`select column_name from information_schema.columns
        where table_schema = current_schema() and table_name = 'users'`
  );
  const columns = new Set(rows.map((row) => row.column_name));
  if (!columns.has('email')) {
    console.log('Nada a fazer: e-mail e nome em claro já foram removidos (0010_pii_contract).');
    return true;
  }
  if (!columns.has('email_hash')) {
    if (dryRun) {
      const { rows: all } = await db.execute<{ total: number }>(
        sql`select count(*)::int as total from users`
      );
      console.log(`Aplicaria as migrações até ${EXPAND_MIGRATION}.`);
      console.log(`Usuários legados (em claro): ${all[0].total}`);
      return true;
    }
    await migrateUpTo(db, EXPAND_MIGRATION);
    console.log(`Migrações aplicadas até ${EXPAND_MIGRATION}.`);
  }

  const legacy = new DrizzleLegacyUserRepository(db, resolveCipher(), resolveBlindIndex());
  await legacy.assertKeysMatch();
  const pending = await legacy.countLegacy();
  console.log(`Usuários legados (em claro): ${pending}`);
  if (dryRun) return true;

  if (pending > 0) {
    const report = await new EncryptLegacyUsers(legacy).execute();
    console.log(`Usuários cifrados: ${report.migrated}`);
    for (const { id, reason } of report.failed) console.error(`Falha no usuário ${id}: ${reason}`);
    if (report.failed.length > 0) {
      console.error('Contract não aplicado: e-mail e nome em claro continuam no banco.');
      return false;
    }
  }

  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  await migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  console.log('Contract aplicado: e-mail e nome em claro removidos.');
  return true;
}

backfillPii()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error('Backfill de dados pessoais falhou:', err);
    process.exit(1);
  });

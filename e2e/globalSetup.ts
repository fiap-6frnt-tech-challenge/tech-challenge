import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { eq, inArray, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../apps/shell/src/db/schema';
import { attachments, authAttempts, transactions, users } from '../apps/shell/src/db/schema';
import { DrizzleUserRepository } from '../apps/shell/src/server/infrastructure/db/DrizzleUserRepository';
import {
  AesGcmCipher,
  parseEncryptionKeys,
} from '../apps/shell/src/server/infrastructure/security/AesGcmCipher';
import {
  HmacBlindIndex,
  parseBlindIndexKey,
} from '../apps/shell/src/server/infrastructure/security/HmacBlindIndex';
import { E2E_KEYS } from './keys';

// Via env para os workers do Playwright herdarem a mesma senha.
const e2ePassword =
  (process.env.E2E_USER_PASSWORD ??= `e2e-${randomBytes(18).toString('base64url')}`);

export const E2E_USER = {
  id: 'e2e-user',
  name: 'E2E User',
  email: 'e2e.user@bytebank.test',
  password: e2ePassword,
};

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://bytebank:bytebank@localhost:5432/bytebank';

const seededTransactions = [
  {
    id: 'e2e-uber-trip',
    userId: E2E_USER.id,
    type: 'withdrawal',
    amount: 50,
    date: '2026-07-01',
    description: 'E2E Uber Trip',
    category: 'transport',
  },
  {
    id: 'e2e-market',
    userId: E2E_USER.id,
    type: 'withdrawal',
    amount: 120,
    date: '2026-07-01',
    description: 'E2E Mercado Central',
    category: 'food',
  },
  {
    id: 'e2e-salary',
    userId: E2E_USER.id,
    type: 'deposit',
    amount: 2500,
    date: '2026-07-01',
    description: 'E2E Salario Mensal',
    category: 'salary',
  },
  {
    id: 'e2e-attachment-target',
    userId: E2E_USER.id,
    type: 'withdrawal',
    amount: 89.9,
    date: '2026-07-02',
    description: 'E2E Attachment Target',
    category: 'education',
  },
] satisfies Array<typeof transactions.$inferInsert>;

async function globalSetup() {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const blindIndex = new HmacBlindIndex(parseBlindIndexKey(E2E_KEYS.BLIND_INDEX_KEY));
  const userRepository = new DrizzleUserRepository(
    db,
    new AesGcmCipher(
      parseEncryptionKeys(E2E_KEYS.DATA_ENCRYPTION_KEYS),
      Number(E2E_KEYS.DATA_ENCRYPTION_ACTIVE_KEY_ID)
    ),
    blindIndex
  );

  try {
    await db.delete(authAttempts);
    const e2eRows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.userId, E2E_USER.id));

    const transactionIds = e2eRows.map((row) => row.id);
    if (transactionIds.length > 0) {
      await db.delete(attachments).where(inArray(attachments.transactionId, transactionIds));
    }

    await db.delete(transactions).where(eq(transactions.userId, E2E_USER.id));
    await db
      .delete(users)
      .where(
        or(eq(users.id, E2E_USER.id), eq(users.emailHash, blindIndex.compute(E2E_USER.email)))
      );

    const created = await userRepository.create({
      id: E2E_USER.id,
      name: E2E_USER.name,
      email: E2E_USER.email,
      passwordHash: await hash(E2E_USER.password, 12),
    });
    if (!created) throw new Error(`${E2E_USER.email} já pertence a outro usuário`);

    await db.insert(transactions).values(seededTransactions);
  } finally {
    await pool.end();
  }
}

export default globalSetup;

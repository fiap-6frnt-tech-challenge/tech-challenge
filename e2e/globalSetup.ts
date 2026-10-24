import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { inArray, or } from 'drizzle-orm';
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
import { defaultSummaryRange } from '../packages/core/src/domain/dashboard/summaryRange';
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

export const E2E_OTHER_USER = {
  id: 'e2e-other-user',
  name: 'E2E Other User',
  email: 'e2e.other@bytebank.test',
  password: e2ePassword,
};

export type E2EUser = typeof E2E_USER;

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
  {
    id: 'e2e-other-account',
    userId: E2E_OTHER_USER.id,
    type: 'deposit',
    amount: 777.77,
    date: defaultSummaryRange().to,
    description: 'E2E Outra Conta',
    category: 'salary',
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

  const e2eUsers = [E2E_USER, E2E_OTHER_USER];
  const userIds = e2eUsers.map((user) => user.id);

  try {
    await db.delete(authAttempts);
    const e2eRows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(inArray(transactions.userId, userIds));

    const transactionIds = e2eRows.map((row) => row.id);
    if (transactionIds.length > 0) {
      await db.delete(attachments).where(inArray(attachments.transactionId, transactionIds));
    }

    await db.delete(transactions).where(inArray(transactions.userId, userIds));
    await db.delete(users).where(
      or(
        inArray(users.id, userIds),
        inArray(
          users.emailHash,
          e2eUsers.map((user) => blindIndex.compute(user.email))
        )
      )
    );

    for (const user of e2eUsers) {
      const created = await userRepository.create({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: await hash(user.password, 12),
      });
      if (!created) throw new Error(`${user.email} já pertence a outro usuário`);
    }

    await db.insert(transactions).values(seededTransactions);
  } finally {
    await pool.end();
  }
}

export default globalSetup;

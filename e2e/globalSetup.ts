import { hash } from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../apps/shell/src/db/schema';
import { attachments, transactions, users } from '../apps/shell/src/db/schema';

export const E2E_USER = {
  id: 'e2e-user',
  name: 'E2E User',
  email: 'e2e.user@bytebank.test',
  password: 'Senha123!',
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

  try {
    const e2eRows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.userId, E2E_USER.id));

    const transactionIds = e2eRows.map((row) => row.id);
    if (transactionIds.length > 0) {
      await db.delete(attachments).where(inArray(attachments.transactionId, transactionIds));
    }

    await db.delete(transactions).where(eq(transactions.userId, E2E_USER.id));
    await db.delete(users).where(eq(users.email, E2E_USER.email));

    await db.insert(users).values({
      id: E2E_USER.id,
      name: E2E_USER.name,
      email: E2E_USER.email,
      passwordHash: await hash(E2E_USER.password, 10),
    });

    await db.insert(transactions).values(seededTransactions);
  } finally {
    await pool.end();
  }
}

export default globalSetup;

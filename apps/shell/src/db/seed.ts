import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Transaction } from '@bytebank/shared';

// Carrega DATABASE_URL do .env.local ANTES de importar o client do banco.
// O `./index` cria o Pool do pg na avaliação do módulo, então ele precisa ser
// importado dinamicamente após o dotenv rodar.
config({ path: '.env.local' });

async function seed() {
  const { db } = await import('./index');
  const { transactions } = await import('./schema');

  const file = resolve(process.cwd(), 'data/transactions.json');
  const raw = JSON.parse(readFileSync(file, 'utf-8')) as { transactions: Transaction[] };
  const rows = raw.transactions;

  if (rows.length === 0) {
    console.log('Seed: nenhuma transação no JSON.');
    return;
  }

  // Idempotente: limpa e reinsere o seed.
  await db.delete(transactions);
  await db.insert(transactions).values(
    rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      description: t.description,
    }))
  );

  console.log(`Seed: ${rows.length} transações inseridas.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed falhou:', err);
    process.exit(1);
  });

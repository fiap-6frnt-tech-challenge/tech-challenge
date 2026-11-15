import { afterAll } from 'vitest';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Defina DATABASE_URL para rodar os testes de integração (ex.: postgres://bytebank:bytebank@localhost:5432/bytebank)'
  );
}

afterAll(async () => {
  const { db } = await import('@/db');
  await db.$client.end();
  globalThis.__bytebankPgPool = undefined;
});

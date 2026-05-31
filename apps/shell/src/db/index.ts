import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// node-postgres (driver `pg`) é portátil: funciona contra Postgres local (Docker)
// e contra Neon/Supabase via connection string. O Pool é criado fora do escopo
// dos handlers para ser reutilizado entre invocações (evita esgotar conexões).
declare global {
  var __bytebankPgPool: Pool | undefined;
}

const pool =
  global.__bytebankPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

// Em dev, o hot-reload do Next recria módulos; cacheamos o pool no global para
// não vazar conexões a cada reload.
if (process.env.NODE_ENV !== 'production') {
  global.__bytebankPgPool = pool;
}

export const db = drizzle(pool, { schema });

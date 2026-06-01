import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  var __bytebankPgPool: Pool | undefined;
}

const pool =
  global.__bytebankPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__bytebankPgPool = pool;
}

export const db = drizzle(pool, { schema });

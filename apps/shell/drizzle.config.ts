import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Carrega as vars do .env.local (gitignored) para os comandos drizzle-kit (generate/migrate)
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

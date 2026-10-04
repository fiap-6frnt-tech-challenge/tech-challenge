import { randomUUID } from 'node:crypto';
import { like, or } from 'drizzle-orm';
import { db } from '@/db';
import { transactions, users } from '@/db/schema';

export function integrationScope() {
  const prefix = `it-${randomUUID().slice(0, 8)}-`;
  return {
    id: (name: string) => `${prefix}${name}`,
    async cleanup() {
      await db.delete(transactions).where(like(transactions.userId, `${prefix}%`));
      await db
        .delete(users)
        .where(or(like(users.id, `${prefix}%`), like(users.email, `${prefix}%`)));
    },
  };
}

import { randomUUID } from 'node:crypto';
import { inArray, like, or } from 'drizzle-orm';
import { db } from '@/db';
import { transactions, users } from '@/db/schema';

export function integrationScope() {
  const prefix = `it-${randomUUID().slice(0, 8)}-`;
  const adoptedUserIds: string[] = [];
  return {
    id: (name: string) => `${prefix}${name}`,
    adoptUser(id: string) {
      adoptedUserIds.push(id);
    },
    async cleanup() {
      await db.delete(transactions).where(like(transactions.userId, `${prefix}%`));
      const scoped = like(users.id, `${prefix}%`);
      await db
        .delete(users)
        .where(adoptedUserIds.length > 0 ? or(scoped, inArray(users.id, adoptedUserIds)) : scoped);
    },
  };
}

import 'server-only';
import { and, eq, lte, sql } from 'drizzle-orm';
import type { SessionRepository } from '@bytebank/core/application';
import { authSessions, users } from '@/db/schema';
import type { Database } from '@/db';

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}
  async create(
    userId: string,
    sid: string,
    expiresAt: Date,
    expectedVersion?: number
  ): Promise<number | null> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ version: users.sessionVersion })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (!user || (expectedVersion !== undefined && user.version !== expectedVersion)) return null;
      await tx
        .delete(authSessions)
        .where(and(eq(authSessions.userId, userId), lte(authSessions.expiresAt, new Date())));
      await tx.insert(authSessions).values({ id: sid, userId, expiresAt });
      return user.version;
    });
  }
  async find(userId: string, sid: string) {
    const [row] = await this.db
      .select({ version: users.sessionVersion, expiresAt: authSessions.expiresAt })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(and(eq(authSessions.id, sid), eq(authSessions.userId, userId)));
    return row ?? null;
  }
  async revokeCurrent(userId: string, sid: string): Promise<void> {
    await this.db
      .delete(authSessions)
      .where(and(eq(authSessions.id, sid), eq(authSessions.userId, userId)));
  }
  async revokeAll(userId: string): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    return rows.length > 0;
  }
}

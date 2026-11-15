import 'server-only';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import type { MfaRecoveryHash, MfaRepository, MfaState } from '@bytebank/core/application';
import type { Database } from '@/db';
import { authSessions, mfaRecoveryCodes, users } from '@/db/schema';

export class DrizzleMfaRepository implements MfaRepository {
  constructor(private readonly db: Database) {}

  async find(userId: string): Promise<MfaState | null> {
    const [row] = await this.db
      .select({
        userId: users.id,
        enabled: users.mfaEnabled,
        sessionVersion: users.sessionVersion,
        secretEnc: users.mfaSecretEnc,
        pendingSecretEnc: users.mfaPendingSecretEnc,
        pendingExpiresAt: users.mfaPendingExpiresAt,
        lastUsedStep: users.mfaLastUsedStep,
        passwordHash: users.passwordHash,
        recoveryCodesRemaining: sql<number>`(select count(*)::integer from ${mfaRecoveryCodes} where ${mfaRecoveryCodes.userId} = ${userId})`,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row ?? null;
  }
  async stage(
    userId: string,
    secretEnc: string,
    expiresAt: Date,
    expectedPasswordHash: string
  ): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ mfaPendingSecretEnc: secretEnc, mfaPendingExpiresAt: expiresAt })
      .where(
        and(
          eq(users.id, userId),
          eq(users.mfaEnabled, false),
          eq(users.passwordHash, expectedPasswordHash)
        )
      )
      .returning({ id: users.id });
    return rows.length > 0;
  }
  async activate(
    userId: string,
    expectedPendingEnc: string,
    now: Date,
    step: number,
    codes: MfaRecoveryHash[],
    expectedPasswordHash: string,
    secretEnc: string,
    expectedSessionVersion: number
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(users)
        .set({
          mfaEnabled: true,
          mfaSecretEnc: secretEnc,
          mfaPendingSecretEnc: null,
          mfaPendingExpiresAt: null,
          mfaLastUsedStep: step,
          sessionVersion: sql`${users.sessionVersion} + 1`,
        })
        .where(
          and(
            eq(users.id, userId),
            eq(users.mfaEnabled, false),
            eq(users.passwordHash, expectedPasswordHash),
            eq(users.mfaPendingSecretEnc, expectedPendingEnc),
            eq(users.sessionVersion, expectedSessionVersion),
            gt(users.mfaPendingExpiresAt, now)
          )
        )
        .returning({ id: users.id });
      if (!rows.length) return false;
      await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
      if (codes.length)
        await tx.insert(mfaRecoveryCodes).values(codes.map((code) => ({ ...code, userId })));
      await tx.delete(authSessions).where(eq(authSessions.userId, userId));
      return true;
    });
  }
  async disable(
    userId: string,
    expectedSecretEnc: string,
    expectedPasswordHash: string
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(users)
        .set({
          mfaEnabled: false,
          mfaSecretEnc: null,
          mfaPendingSecretEnc: null,
          mfaPendingExpiresAt: null,
          mfaLastUsedStep: null,
          sessionVersion: sql`${users.sessionVersion} + 1`,
        })
        .where(
          and(
            eq(users.id, userId),
            eq(users.mfaEnabled, true),
            eq(users.mfaSecretEnc, expectedSecretEnc),
            eq(users.passwordHash, expectedPasswordHash)
          )
        )
        .returning({ id: users.id });
      if (!rows.length) return false;
      await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
      await tx.delete(authSessions).where(eq(authSessions.userId, userId));
      return true;
    });
  }
  async consumeTotp(
    userId: string,
    expectedSecretEnc: string,
    step: number,
    expectedPasswordHash: string
  ): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ mfaLastUsedStep: step })
      .where(
        and(
          eq(users.id, userId),
          eq(users.mfaEnabled, true),
          eq(users.mfaSecretEnc, expectedSecretEnc),
          eq(users.passwordHash, expectedPasswordHash),
          or(isNull(users.mfaLastUsedStep), lt(users.mfaLastUsedStep, step))
        )
      )
      .returning({ id: users.id });
    return rows.length > 0;
  }
  async findRecovery(userId: string, id: string): Promise<string | null> {
    const [row] = await this.db
      .select({ hash: mfaRecoveryCodes.hash })
      .from(mfaRecoveryCodes)
      .where(and(eq(mfaRecoveryCodes.userId, userId), eq(mfaRecoveryCodes.id, id)))
      .limit(1);
    return row?.hash ?? null;
  }
  async consumeRecovery(
    userId: string,
    id: string,
    expectedHash: string,
    expectedSecretEnc: string,
    expectedPasswordHash: string
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Match the same user-row-first lock order as activation, disable and session creation.
      const [owner] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.mfaEnabled, true),
            eq(users.mfaSecretEnc, expectedSecretEnc),
            eq(users.passwordHash, expectedPasswordHash)
          )
        )
        .for('update');
      if (!owner) return false;
      const rows = await tx
        .delete(mfaRecoveryCodes)
        .where(
          and(
            eq(mfaRecoveryCodes.userId, userId),
            eq(mfaRecoveryCodes.id, id),
            eq(mfaRecoveryCodes.hash, expectedHash)
          )
        )
        .returning({ id: mfaRecoveryCodes.id });
      return rows.length > 0;
    });
  }
}

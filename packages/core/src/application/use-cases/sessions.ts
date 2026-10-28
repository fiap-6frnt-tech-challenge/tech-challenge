import { AuthenticationError } from '../../domain';
import type { Actor, AuditLogger, Clock, IdGenerator, SessionRepository } from '../ports';

export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const SESSION_CHECK_MS = 5 * 60 * 1000;
export interface SessionClaims {
  userId: string;
  sid: string;
  authTime: number;
  sv: number;
  svCheckedAt: number;
}

export function validSessionClaims(value: unknown, now: number): value is SessionClaims {
  if (!value || typeof value !== 'object') return false;
  const claims = value as Partial<SessionClaims>;
  return (
    typeof claims.userId === 'string' &&
    claims.userId.length > 0 &&
    typeof claims.sid === 'string' &&
    claims.sid.length > 0 &&
    Number.isSafeInteger(claims.sv) &&
    claims.sv! >= 0 &&
    Number.isSafeInteger(claims.authTime) &&
    claims.authTime! <= now &&
    now - claims.authTime! < SESSION_ABSOLUTE_MS &&
    Number.isSafeInteger(claims.svCheckedAt) &&
    claims.svCheckedAt! >= claims.authTime! &&
    claims.svCheckedAt! <= now
  );
}

export class SessionLifecycle {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}
  async start(userId: string): Promise<SessionClaims | null> {
    if (!userId) return null;
    const authTime = this.clock.now().getTime();
    const sid = this.ids.next();
    const sv = await this.sessions.create(userId, sid, new Date(authTime + SESSION_ABSOLUTE_MS));
    return sv === null ? null : { userId, sid, sv, authTime, svCheckedAt: authTime };
  }
  async validate(value: unknown): Promise<SessionClaims | null> {
    const now = this.clock.now().getTime();
    if (!validSessionClaims(value, now)) return null;
    if (now - value.svCheckedAt < SESSION_CHECK_MS) return value;
    const record = await this.sessions.find(value.userId, value.sid);
    if (!record || record.version !== value.sv || record.expiresAt.getTime() <= now) return null;
    return { ...value, svCheckedAt: now };
  }
  async revokeCurrent(value: unknown): Promise<void> {
    if (!value || typeof value !== 'object') return;
    const { userId, sid } = value as Partial<SessionClaims>;
    if (typeof userId === 'string' && typeof sid === 'string') {
      await this.sessions.revokeCurrent(userId, sid);
    }
  }
}

export class RevokeSessions {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly audit: AuditLogger
  ) {}
  async execute(actor: Actor): Promise<void> {
    if (!actor.userId || !(await this.sessions.revokeAll(actor.userId)))
      throw new AuthenticationError();
    this.audit.record({
      event: 'auth.session.revoked',
      outcome: 'success',
      userId: actor.userId,
      reason: 'all_devices',
    });
  }
}

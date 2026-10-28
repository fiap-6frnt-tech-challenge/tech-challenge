import {
  ConflictError,
  RateLimitedError,
  TurnstileRequiredError,
  ValidationError,
} from '../../domain';
import { registerSchema } from '../../schemas';
import type {
  AuditLogger,
  CaptchaVerifier,
  IdGenerator,
  LegacyUserRepository,
  PasswordBreachChecker,
  PasswordHasher,
  RateLimiter,
  RateLimitKeyGenerator,
  UserRepository,
} from '../ports';
import type { NewUser, User } from '../types';
import { maskEmail } from '../audit';
import { parseOrThrow } from '../parseOrThrow';
import type { LegacyMigrationReport } from './attachments';

export const BREACHED_PASSWORD_MESSAGE =
  'Esta senha já apareceu em vazamentos de dados. Escolha outra senha.';

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly rateLimiter: RateLimiter,
    private readonly rateLimitKeys: RateLimitKeyGenerator,
    private readonly breachChecker: PasswordBreachChecker,
    private readonly audit: AuditLogger
  ) {}

  async execute(input: unknown, ipAddress: string): Promise<User> {
    const rateLimitKey = this.rateLimitKeys.registerIp(ipAddress);
    const limit = await this.rateLimiter.check(rateLimitKey);
    if (!limit.allowed) {
      this.audit.record({ event: 'rate_limit.hit', outcome: 'denied', reason: 'register_ip' });
      throw new RateLimitedError(limit.retryAfterSeconds);
    }
    await this.rateLimiter.registerFailure(rateLimitKey);

    const data = parseOrThrow<{ name: string; email: string; password: string }>(
      registerSchema,
      input
    );
    const email = data.email.trim().toLowerCase();
    const rejected = (reason: string) =>
      this.audit.record({
        event: 'auth.register',
        outcome: 'failure',
        email: maskEmail(email),
        reason,
      });
    if (await this.breachChecker.isBreached(data.password)) {
      rejected('breached_password');
      throw new ValidationError([
        { code: 'custom', path: ['password'], message: BREACHED_PASSWORD_MESSAGE },
      ]);
    }
    if (await this.users.findByEmail(email)) {
      rejected('email_taken');
      throw new ConflictError('E-mail');
    }
    const newUser: NewUser = {
      id: this.ids.next(),
      name: data.name.trim(),
      email,
      passwordHash: await this.passwords.hash(data.password),
    };
    const created = await this.users.create(newUser);
    if (!created) {
      rejected('email_taken');
      throw new ConflictError('E-mail');
    }
    this.audit.record({
      event: 'auth.register',
      outcome: 'success',
      userId: created.id,
      email: maskEmail(email),
    });
    return created;
  }
}

export class AuthenticateUser {
  private readonly captchaThreshold = 3;

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly rateLimiter: RateLimiter,
    private readonly rateLimitKeys: RateLimitKeyGenerator,
    private readonly audit: AuditLogger,
    private readonly captchaVerifier?: CaptchaVerifier
  ) {}

  async execute(
    email: string,
    password: string,
    ipAddress: string,
    turnstileToken?: string
  ): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const maskedEmail = maskEmail(normalizedEmail);
    const emailKey = this.rateLimitKeys.loginEmail(normalizedEmail);
    const ipKey = this.rateLimitKeys.loginIp(ipAddress);
    const limits = await Promise.all([
      this.rateLimiter.check(emailKey).then((limit) => ({ ...limit, scope: 'login_email' })),
      this.rateLimiter.check(ipKey).then((limit) => ({ ...limit, scope: 'login_ip' })),
    ]);
    const blocked = limits.filter((limit) => !limit.allowed);
    if (blocked.length > 0) {
      this.audit.record({
        event: 'rate_limit.hit',
        outcome: 'denied',
        email: maskedEmail,
        reason: blocked.map((limit) => limit.scope).join(','),
      });
      throw new RateLimitedError(Math.max(...blocked.map((limit) => limit.retryAfterSeconds)));
    }

    const failure = (reason: string, userId?: string) =>
      this.audit.record({
        event: 'auth.login.failure',
        outcome: 'failure',
        userId,
        email: maskedEmail,
        reason,
      });

    const captchaVerifier = this.captchaVerifier;
    const captchaEnabled = captchaVerifier?.isEnabled() ?? false;
    if (
      captchaEnabled &&
      (await this.rateLimiter.failureCount(emailKey)) >= this.captchaThreshold
    ) {
      if (!turnstileToken || !captchaVerifier || !(await captchaVerifier.verify(turnstileToken))) {
        failure('captcha_required');
        throw new TurnstileRequiredError();
      }
    }

    const registerFailure = async (reason: string, userId?: string) => {
      failure(reason, userId);
      await Promise.all([
        this.rateLimiter.registerFailure(emailKey),
        this.rateLimiter.registerFailure(ipKey),
      ]);
      if (!(await this.rateLimiter.check(emailKey)).allowed) {
        this.audit.record({
          event: 'auth.login.locked',
          outcome: 'denied',
          userId,
          email: maskedEmail,
          reason: 'too_many_failures',
        });
      }
      if (
        captchaEnabled &&
        (await this.rateLimiter.failureCount(emailKey)) >= this.captchaThreshold
      ) {
        throw new TurnstileRequiredError();
      }
    };

    const user = await this.users.findByEmail(normalizedEmail);
    if (!user || !user.passwordHash) {
      await this.passwords.verifyDummy(password);
      await registerFailure(user ? 'password_not_set' : 'unknown_user', user?.id);
      return null;
    }

    if (!(await this.passwords.verify(password, user.passwordHash))) {
      await registerFailure('invalid_password', user.id);
      return null;
    }

    await this.rateLimiter.reset(emailKey);
    if (!this.passwords.needsRehash(user.passwordHash)) return user;

    const passwordHash = await this.passwords.hash(password);
    await this.users.updatePasswordHash(user.id, passwordHash);
    return { ...user, passwordHash };
  }
}

export class EncryptLegacyUsers {
  constructor(private readonly legacy: LegacyUserRepository) {}

  async execute(batchSize = 100): Promise<LegacyMigrationReport> {
    const report: LegacyMigrationReport = { migrated: 0, failed: [] };
    let afterId: string | undefined;
    for (;;) {
      const batch = await this.legacy.listLegacy(batchSize, afterId);
      if (batch.length === 0) return report;
      for (const user of batch) {
        try {
          if (await this.legacy.markEncrypted(user)) report.migrated += 1;
        } catch (error) {
          report.failed.push({
            id: user.id,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
      afterId = batch[batch.length - 1].id;
    }
  }
}

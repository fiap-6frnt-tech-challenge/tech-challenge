import {
  ConflictError,
  RateLimitedError,
  TurnstileRequiredError,
  ValidationError,
} from '../../domain';
import { registerSchema } from '../../schemas';
import type {
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
    private readonly breachChecker: PasswordBreachChecker
  ) {}

  async execute(input: unknown, ipAddress: string): Promise<User> {
    const rateLimitKey = this.rateLimitKeys.registerIp(ipAddress);
    const limit = await this.rateLimiter.check(rateLimitKey);
    if (!limit.allowed) throw new RateLimitedError(limit.retryAfterSeconds);
    await this.rateLimiter.registerFailure(rateLimitKey);

    const data = parseOrThrow<{ name: string; email: string; password: string }>(
      registerSchema,
      input
    );
    if (await this.breachChecker.isBreached(data.password)) {
      throw new ValidationError([
        { code: 'custom', path: ['password'], message: BREACHED_PASSWORD_MESSAGE },
      ]);
    }
    const email = data.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) throw new ConflictError('E-mail');
    const newUser: NewUser = {
      id: this.ids.next(),
      name: data.name.trim(),
      email,
      passwordHash: await this.passwords.hash(data.password),
    };
    const created = await this.users.create(newUser);
    if (!created) throw new ConflictError('E-mail');
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
    private readonly captchaVerifier?: CaptchaVerifier
  ) {}

  async execute(
    email: string,
    password: string,
    ipAddress: string,
    turnstileToken?: string
  ): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const emailKey = this.rateLimitKeys.loginEmail(normalizedEmail);
    const ipKey = this.rateLimitKeys.loginIp(ipAddress);
    const limits = await Promise.all([
      this.rateLimiter.check(emailKey),
      this.rateLimiter.check(ipKey),
    ]);
    const blocked = limits.filter((limit) => !limit.allowed);
    if (blocked.length > 0) {
      throw new RateLimitedError(Math.max(...blocked.map((limit) => limit.retryAfterSeconds)));
    }

    const captchaVerifier = this.captchaVerifier;
    const captchaEnabled = captchaVerifier?.isEnabled() ?? false;
    if (
      captchaEnabled &&
      (await this.rateLimiter.failureCount(emailKey)) >= this.captchaThreshold
    ) {
      if (!turnstileToken || !captchaVerifier || !(await captchaVerifier.verify(turnstileToken))) {
        throw new TurnstileRequiredError();
      }
    }

    const registerFailure = async () => {
      await Promise.all([
        this.rateLimiter.registerFailure(emailKey),
        this.rateLimiter.registerFailure(ipKey),
      ]);
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
      await registerFailure();
      return null;
    }

    if (!(await this.passwords.verify(password, user.passwordHash))) {
      await registerFailure();
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

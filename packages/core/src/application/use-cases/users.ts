import { ConflictError, RateLimitedError } from '../../domain';
import { registerSchema } from '../../schemas';
import type {
  IdGenerator,
  PasswordHasher,
  RateLimiter,
  RateLimitKeyGenerator,
  UserRepository,
} from '../ports';
import type { NewUser, User } from '../types';
import { parseOrThrow } from '../parseOrThrow';

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly rateLimiter: RateLimiter,
    private readonly rateLimitKeys: RateLimitKeyGenerator
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
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly rateLimiter: RateLimiter,
    private readonly rateLimitKeys: RateLimitKeyGenerator
  ) {}

  async execute(email: string, password: string, ipAddress: string): Promise<User | null> {
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

    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      await this.passwords.verifyDummy(password);
      await Promise.all([
        this.rateLimiter.registerFailure(emailKey),
        this.rateLimiter.registerFailure(ipKey),
      ]);
      return null;
    }

    if (!(await this.passwords.verify(password, user.passwordHash))) {
      await Promise.all([
        this.rateLimiter.registerFailure(emailKey),
        this.rateLimiter.registerFailure(ipKey),
      ]);
      return null;
    }

    await this.rateLimiter.reset(emailKey);
    return user;
  }
}

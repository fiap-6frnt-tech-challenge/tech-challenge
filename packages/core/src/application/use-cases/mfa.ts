import { AuthenticationError, RateLimitedError } from '../../domain';
import type {
  AuditLogger,
  Cipher,
  Clock,
  IdGenerator,
  MfaRepository,
  MfaState,
  PasswordHasher,
  RateLimiter,
  TotpProvider,
} from '../ports';

export class MfaRequiredError extends AuthenticationError {}
export class MfaInvalidCodeError extends AuthenticationError {}

export class MfaService {
  constructor(
    private readonly repository: MfaRepository,
    private readonly passwords: PasswordHasher,
    private readonly cipher: Cipher,
    private readonly totp: TotpProvider,
    private readonly limiter: RateLimiter,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly audit: AuditLogger
  ) {}

  private async state(userId: string): Promise<MfaState> {
    const state = await this.repository.find(userId);
    if (!state) throw new AuthenticationError();
    return state;
  }
  private async check(userId: string) {
    const limit = await this.limiter.check(`mfa:${userId}`);
    if (!limit.allowed) throw new RateLimitedError(limit.retryAfterSeconds);
  }
  private async fail(
    userId: string,
    error: AuthenticationError = new MfaInvalidCodeError()
  ): Promise<never> {
    await this.limiter.registerFailure(`mfa:${userId}`);
    await this.check(userId);
    throw error;
  }
  private async password(state: MfaState, password: string) {
    if (!state.passwordHash) {
      await this.passwords.verifyDummy(password);
      return this.fail(state.userId, new AuthenticationError());
    }
    if (!(await this.passwords.verify(password, state.passwordHash)))
      return this.fail(state.userId, new AuthenticationError());
  }
  async status(userId: string) {
    const state = await this.state(userId);
    return {
      enabled: state.enabled,
      canEnroll: !!state.passwordHash,
      recoveryCodesRemaining: state.recoveryCodesRemaining,
    };
  }
  async setup(userId: string, password: string) {
    await this.check(userId);
    const state = await this.state(userId);
    await this.password(state, password);
    if (state.enabled) throw new AuthenticationError();
    const result = this.totp.create(userId);
    const encrypted = this.cipher.encryptText(
      JSON.stringify({ secret: result.secret, passwordHash: state.passwordHash }),
      `user:${userId}:mfa`
    );
    if (
      !(await this.repository.stage(
        userId,
        encrypted,
        new Date(this.clock.now().getTime() + 600_000),
        state.passwordHash
      ))
    )
      throw new AuthenticationError();
    return result;
  }
  async enable(
    userId: string,
    token: string
  ): Promise<{ recoveryCodes: string[]; sessionVersion: number }> {
    await this.check(userId);
    const state = await this.state(userId);
    const now = this.clock.now();
    if (
      state.enabled ||
      !state.pendingSecretEnc ||
      !state.pendingExpiresAt ||
      state.pendingExpiresAt <= now
    )
      return this.fail(userId);
    let pending: { secret: string; passwordHash: string };
    try {
      pending = JSON.parse(this.cipher.decryptText(state.pendingSecretEnc, `user:${userId}:mfa`));
    } catch {
      return this.fail(userId);
    }
    if (
      !pending ||
      typeof pending.secret !== 'string' ||
      pending.passwordHash !== state.passwordHash
    )
      return this.fail(userId);
    const step = this.totp.verify(pending.secret, token, now);
    if (step === null) return this.fail(userId);
    const recoveryCodes: string[] = [];
    const hashes = [];
    const identifiers = new Set<string>();
    for (let attempts = 0; recoveryCodes.length < 10; attempts++) {
      if (attempts >= 100) throw new Error('Não foi possível gerar os códigos de recuperação');
      const randomPart = () => {
        const random = this.ids.next().replace(/-/g, '').toLowerCase();
        if (!/^[0-9a-f]{24,}$/.test(random)) {
          throw new Error('Gerador de códigos de recuperação inválido');
        }
        // UUID prefixes contain 32 random bits; later UUID fields contain fixed version/variant bits.
        return random.slice(0, 8);
      };
      const id = randomPart();
      if (identifiers.has(id)) continue;
      identifiers.add(id);
      const code = `${id}-${randomPart()}-${randomPart()}`;
      recoveryCodes.push(code);
      hashes.push({ id, hash: await this.passwords.hash(code) });
    }
    const secretEnc = this.cipher.encryptText(pending.secret, `user:${userId}:mfa`);
    if (
      !(await this.repository.activate(
        userId,
        state.pendingSecretEnc,
        this.clock.now(),
        step,
        hashes,
        state.passwordHash,
        secretEnc,
        state.sessionVersion
      ))
    )
      return this.fail(userId);
    await this.limiter.reset(`mfa:${userId}`);
    return { recoveryCodes, sessionVersion: state.sessionVersion + 1 };
  }
  private async consume(state: MfaState, token: string): Promise<boolean> {
    if (!state.secretEnc) return false;
    if (/^[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{8}$/i.test(token)) {
      const normalized = token.toLowerCase();
      const id = normalized.slice(0, 8);
      const hash = await this.repository.findRecovery(state.userId, id);
      if (!hash || !(await this.passwords.verify(normalized, hash))) return false;
      return this.repository.consumeRecovery(
        state.userId,
        id,
        hash,
        state.secretEnc,
        state.passwordHash
      );
    }
    if (!/^\d{6}$/.test(token)) return false;
    let secret: string;
    try {
      secret = this.cipher.decryptText(state.secretEnc, `user:${state.userId}:mfa`);
    } catch {
      return false;
    }
    const step = this.totp.verify(secret, token, this.clock.now());
    return (
      step !== null &&
      this.repository.consumeTotp(state.userId, state.secretEnc, step, state.passwordHash)
    );
  }
  async verifyLogin(
    userId: string,
    token?: string,
    expectedPasswordHash?: string
  ): Promise<number> {
    const state = await this.state(userId);
    if (expectedPasswordHash !== undefined && state.passwordHash !== expectedPasswordHash)
      throw new AuthenticationError();
    if (!state.enabled) return this.loggedIn(userId, state.sessionVersion);
    await this.check(userId).catch((error: unknown): never => {
      if (error instanceof RateLimitedError)
        this.audit.record({ event: 'rate_limit.hit', outcome: 'denied', userId, reason: 'mfa' });
      throw error;
    });
    if (!token) {
      this.loginFailure(userId, 'mfa_required');
      throw new MfaRequiredError();
    }
    if (!(await this.consume(state, token))) {
      this.loginFailure(userId, 'mfa_invalid_code');
      return this.fail(userId).catch((error: unknown): never => {
        if (error instanceof RateLimitedError) {
          this.audit.record({
            event: 'auth.login.locked',
            outcome: 'denied',
            userId,
            reason: 'mfa_too_many_failures',
          });
        }
        throw error;
      });
    }
    await this.limiter.reset(`mfa:${userId}`);
    return this.loggedIn(userId, state.sessionVersion, 'mfa');
  }
  private loggedIn(userId: string, sessionVersion: number, reason?: string): number {
    this.audit.record({ event: 'auth.login.success', outcome: 'success', userId, reason });
    return sessionVersion;
  }
  private loginFailure(userId: string, reason: string) {
    this.audit.record({ event: 'auth.login.failure', outcome: 'failure', userId, reason });
  }
  async disable(userId: string, password: string, token: string): Promise<void> {
    await this.check(userId);
    const state = await this.state(userId);
    await this.password(state, password);
    if (!state.enabled || !state.secretEnc || !(await this.consume(state, token)))
      return this.fail(userId);
    if (!(await this.repository.disable(userId, state.secretEnc, state.passwordHash)))
      return this.fail(userId);
    await this.limiter.reset(`mfa:${userId}`);
  }
}

import 'server-only';
import { createHmac } from 'node:crypto';
import type { RateLimitKeyGenerator } from '@bytebank/core/application';

export class HmacRateLimitKeyGenerator implements RateLimitKeyGenerator {
  private readonly secretProvider: () => string;

  constructor(secret: string | (() => string)) {
    this.secretProvider = typeof secret === 'string' ? () => secret : secret;
  }

  loginEmail(email: string): string {
    const secret = this.secretProvider();
    if (!secret) throw new Error('AUTH_SECRET ou BLIND_INDEX_KEY é obrigatório para rate limit');
    const normalizedEmail = email.trim().toLowerCase();
    const digest = createHmac('sha256', secret).update(normalizedEmail).digest('base64url');
    return `login:email:${digest}`;
  }

  loginIp(ipAddress: string): string {
    return `login:ip:${ipAddress}`;
  }

  registerIp(ipAddress: string): string {
    return `register:ip:${ipAddress}`;
  }
}

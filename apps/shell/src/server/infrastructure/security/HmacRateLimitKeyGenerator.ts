import 'server-only';
import type { RateLimitKeyGenerator } from '@bytebank/core/application';
import type { HmacBlindIndex } from './HmacBlindIndex';

export class HmacRateLimitKeyGenerator implements RateLimitKeyGenerator {
  constructor(private readonly blindIndex: HmacBlindIndex) {}

  loginEmail(email: string): string {
    return `login:email:${this.blindIndex.compute(email)}`;
  }

  loginIp(ipAddress: string): string {
    return `login:ip:${ipAddress}`;
  }

  registerIp(ipAddress: string): string {
    return `register:ip:${ipAddress}`;
  }
}

import 'server-only';
import { createHash } from 'node:crypto';
import type { PasswordBreachChecker } from '@bytebank/core/application';

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';

export class HibpBreachChecker implements PasswordBreachChecker {
  constructor(
    private readonly enabled = process.env.HIBP_ENABLED !== 'false',
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 2_000
  ) {}

  async isBreached(plain: string): Promise<boolean> {
    if (!this.enabled) return false;

    const sha1 = createHash('sha1').update(plain).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    try {
      const response = await this.fetcher(`${RANGE_URL}${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return (await response.text())
        .split('\n')
        .map((line) => line.trim().split(':'))
        .some(([hashSuffix, count]) => hashSuffix === suffix && Number(count) > 0);
    } catch (error) {
      console.warn('[hibp] Checagem de senha vazada indisponível; cadastro liberado (fail-open)', {
        reason: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

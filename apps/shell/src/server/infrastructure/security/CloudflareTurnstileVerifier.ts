import 'server-only';
import type { CaptchaVerifier } from '@bytebank/core/application';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export class CloudflareTurnstileVerifier implements CaptchaVerifier {
  private readonly secretKey: string;
  private readonly fetcher: typeof fetch;
  readonly siteKey: string | undefined;

  constructor(
    siteKey = process.env.TURNSTILE_SITE_KEY ?? '',
    secretKey = process.env.TURNSTILE_SECRET_KEY ?? '',
    fetcher: typeof fetch = fetch
  ) {
    this.siteKey = siteKey && secretKey ? siteKey : undefined;
    this.secretKey = secretKey;
    this.fetcher = fetcher;
  }

  isEnabled(): boolean {
    return Boolean(this.siteKey && this.secretKey);
  }

  async verify(token: string): Promise<boolean> {
    if (!this.isEnabled() || !token.trim()) return false;

    const body = new URLSearchParams({ secret: this.secretKey, response: token });

    try {
      const response = await this.fetcher(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return false;
      const result = (await response.json()) as { success?: unknown };
      return result.success === true;
    } catch {
      return false;
    }
  }
}

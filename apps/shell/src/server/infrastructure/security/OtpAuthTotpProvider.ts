import 'server-only';
import { Secret, TOTP } from 'otpauth';
import type { TotpProvider } from '@bytebank/core/application';

export class OtpAuthTotpProvider implements TotpProvider {
  create(label: string): { secret: string; uri: string } {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: 'Bytebank',
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    return { secret: secret.base32, uri: totp.toString() };
  }
  verify(secret: string, token: string, now: Date): number | null {
    if (!/^\d{6}$/.test(token)) return null;
    const timestamp = now.getTime();
    const delta = new TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 }).validate({
      token,
      timestamp,
      window: 1,
    });
    return delta === null ? null : Math.floor(timestamp / 30_000) + delta;
  }
}

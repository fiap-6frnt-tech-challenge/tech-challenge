import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OtpAuthTotpProvider } from './OtpAuthTotpProvider';

// Independent RFC 4226 truncation; no OTPAuth generator shared with production.
function tokenAt(seconds: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(seconds / 30)));
  const digest = createHmac('sha1', '12345678901234567890').update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
describe('OtpAuthTotpProvider', () => {
  const provider = new OtpAuthTotpProvider();
  it('creates distinct 160-bit secrets and interoperable enrollment URIs', () => {
    const a = provider.create('user-1'),
      b = provider.create('user-1');
    expect(a.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(a.secret).not.toBe(b.secret);
    const uri = new URL(a.uri);
    expect(uri.protocol).toBe('otpauth:');
    expect(uri.hostname).toBe('totp');
    expect(uri.searchParams.get('secret')).toBe(a.secret);
    expect(uri.searchParams.get('issuer')).toBe('Bytebank');
    expect(uri.searchParams.get('algorithm')).toBe('SHA1');
    expect(uri.searchParams.get('digits')).toBe('6');
    expect(uri.searchParams.get('period')).toBe('30');
  });
  it('validates independent RFC vectors and returns absolute step rather than delta', () => {
    for (const seconds of [59, 1111111109, 1111111111, 1234567890, 2000000000, 20000000000]) {
      expect(provider.verify(secret, tokenAt(seconds), new Date(seconds * 1000))).toBe(
        Math.floor(seconds / 30)
      );
    }
  });
  it('accepts only one adjacent step each side and six strict digits', () => {
    const seconds = 1234567890,
      now = new Date(seconds * 1000),
      current = Math.floor(seconds / 30);
    expect(provider.verify(secret, tokenAt(seconds - 30), now)).toBe(current - 1);
    expect(provider.verify(secret, tokenAt(seconds + 30), now)).toBe(current + 1);
    expect(provider.verify(secret, tokenAt(seconds - 60), now)).toBeNull();
    expect(provider.verify(secret, tokenAt(seconds + 60), now)).toBeNull();
    for (const token of ['12345', '1234567', ' 123456', '123456 ', 'abcdef'])
      expect(provider.verify(secret, token, now)).toBeNull();
  });
});

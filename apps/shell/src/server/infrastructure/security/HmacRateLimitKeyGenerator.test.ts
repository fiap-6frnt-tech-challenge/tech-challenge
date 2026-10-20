import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HmacBlindIndex } from './HmacBlindIndex';
import { HmacRateLimitKeyGenerator } from './HmacRateLimitKeyGenerator';

const blindIndex = new HmacBlindIndex(randomBytes(32));

describe('HmacRateLimitKeyGenerator', () => {
  it('reusa o blind index do e-mail normalizado, sem o e-mail em claro', () => {
    const keys = new HmacRateLimitKeyGenerator(blindIndex);

    expect(keys.loginEmail(' ANA@Example.com ')).toBe(keys.loginEmail('ana@example.com'));
    expect(keys.loginEmail('ana@example.com')).toBe(
      `login:email:${blindIndex.compute('ana@example.com')}`
    );
    expect(keys.loginEmail('ana@example.com')).not.toContain('ana@example.com');
  });

  it('names IP keys by login and registration scope', () => {
    const keys = new HmacRateLimitKeyGenerator(blindIndex);

    expect(keys.loginIp('203.0.113.8')).toBe('login:ip:203.0.113.8');
    expect(keys.registerIp('203.0.113.8')).toBe('register:ip:203.0.113.8');
  });
});

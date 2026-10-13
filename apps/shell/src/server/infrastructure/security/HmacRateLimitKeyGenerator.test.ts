import { describe, expect, it } from 'vitest';
import { HmacRateLimitKeyGenerator } from './HmacRateLimitKeyGenerator';

describe('HmacRateLimitKeyGenerator', () => {
  it('normalizes the email and stores only its HMAC in the key', () => {
    const keys = new HmacRateLimitKeyGenerator('test-secret');

    expect(keys.loginEmail(' ANA@Example.com ')).toBe(keys.loginEmail('ana@example.com'));
    expect(keys.loginEmail('ana@example.com')).toMatch(/^login:email:[A-Za-z0-9_-]+$/);
    expect(keys.loginEmail('ana@example.com')).not.toContain('ana@example.com');
  });

  it('names IP keys by login and registration scope', () => {
    const keys = new HmacRateLimitKeyGenerator('test-secret');

    expect(keys.loginIp('203.0.113.8')).toBe('login:ip:203.0.113.8');
    expect(keys.registerIp('203.0.113.8')).toBe('register:ip:203.0.113.8');
  });
});

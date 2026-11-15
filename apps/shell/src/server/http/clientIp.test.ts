import { describe, expect, it } from 'vitest';
import { getClientIp } from './clientIp';

describe('getClientIp', () => {
  it('uses the first forwarded address', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.20, 10.0.0.1' });
    expect(getClientIp(headers)).toBe('203.0.113.20');
  });

  it('uses unknown when the forwarding header is missing or invalid', () => {
    expect(getClientIp(new Headers())).toBe('unknown');
    expect(getClientIp(new Headers({ 'x-forwarded-for': 'spoofed-value, 10.0.0.1' }))).toBe(
      'unknown'
    );
  });
});

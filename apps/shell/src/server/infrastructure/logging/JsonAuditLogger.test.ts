import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock, type AuditEvent } from '@bytebank/core/application';
import { HmacBlindIndex } from '../security/HmacBlindIndex';
import { JsonAuditLogger } from './JsonAuditLogger';

const blindIndex = new HmacBlindIndex(randomBytes(32));
const clock = new FakeClock(new Date('2026-10-28T12:00:00.000Z'));
const requestId = '6f1c2a5e-8b9d-4e3f-a1b2-c3d4e5f60718';

function capture() {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const lines = () => log.mock.calls.map(([line]) => line as string);
  return { log, lines, entries: () => lines().map((line) => JSON.parse(line)) };
}

afterEach(() => vi.restoreAllMocks());

describe('JsonAuditLogger', () => {
  it('writes one JSON line with the request id and an HMAC of the IP, never the IP itself', () => {
    const { lines, entries } = capture();
    const logger = new JsonAuditLogger(blindIndex, clock, () => ({
      requestId,
      ipAddress: '203.0.113.12',
    }));

    logger.record({
      event: 'auth.login.failure',
      outcome: 'failure',
      userId: 'u1',
      email: 'a***@e***.com',
      reason: 'invalid_password',
    });

    expect(lines()).toHaveLength(1);
    expect(entries()[0]).toEqual({
      ts: '2026-10-28T12:00:00.000Z',
      event: 'auth.login.failure',
      userId: 'u1',
      email: 'a***@e***.com',
      ipHash: blindIndex.compute('audit:ip:203.0.113.12'),
      outcome: 'failure',
      reason: 'invalid_password',
      requestId,
    });
    expect(lines()[0]).not.toContain('203.0.113.12');
    expect(entries()[0].ipHash).not.toBe(blindIndex.compute('203.0.113.12'));
  });

  it('drops any field outside the allow-list and masks a raw e-mail', () => {
    const { lines, entries } = capture();
    const logger = new JsonAuditLogger(blindIndex, clock, () => undefined);

    logger.record({
      event: 'auth.login.failure',
      outcome: 'failure',
      email: 'joana@dominio.com',
      password: 'Senha-Secreta-123',
      turnstileToken: 'token',
      cookie: 'authjs.session-token=abc',
    } as AuditEvent);

    expect(entries()[0]).toEqual({
      ts: '2026-10-28T12:00:00.000Z',
      event: 'auth.login.failure',
      email: 'j***@d***.com',
      outcome: 'failure',
    });
    for (const secret of ['Senha-Secreta-123', 'token', 'session-token', 'joana@dominio.com']) {
      expect(lines()[0]).not.toContain(secret);
    }
  });

  it('keeps attacker-controlled text on a single escaped line', () => {
    const { lines, entries } = capture();
    const logger = new JsonAuditLogger(blindIndex, clock, () => ({ requestId }));

    logger.record({
      event: 'csp.violation',
      outcome: 'failure',
      reason: 'img-src\n{"event":"auth.login.success","userId":"admin"}',
    });

    expect(lines()).toHaveLength(1);
    expect(lines()[0]).not.toContain('\n');
    expect(entries()[0].event).toBe('csp.violation');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('@/server/container', () => ({ container: { auditLogger: { record: mocks.record } } }));

import { POST } from './route';

function reportRequest(body: string, contentType = 'application/csp-report'): Request {
  return new Request('http://localhost/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
}

beforeEach(() => mocks.record.mockClear());

describe('CSP report endpoint', () => {
  it('accepts a legacy CSP report without requiring a session', async () => {
    const response = await POST(
      reportRequest(JSON.stringify({ 'csp-report': { 'blocked-uri': 'inline' } }))
    );

    expect(response.status).toBe(204);
    expect(mocks.record).toHaveBeenCalledWith({
      event: 'csp.violation',
      outcome: 'failure',
      reason: 'unknown',
    });
  });

  it('accepts the Reporting API JSON media type', async () => {
    const response = await POST(
      reportRequest(
        JSON.stringify([{ type: 'csp-violation', body: {} }]),
        'application/reports+json'
      )
    );

    expect(response.status).toBe(204);
  });

  it('rejects unsupported content types, malformed JSON, and oversized reports', async () => {
    const unsupported = await POST(reportRequest('{}', 'text/plain'));
    const malformed = await POST(reportRequest('{'));
    const oversized = await POST(reportRequest(JSON.stringify({ data: 'x'.repeat(16 * 1024) })));

    expect(unsupported.status).toBe(415);
    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it('records only the violated directive, never the blocked URL or the document', async () => {
    await POST(
      reportRequest(
        JSON.stringify({
          'csp-report': {
            'document-uri': 'https://bytebank.test/transactions?q=segredo',
            'violated-directive': "script-src-elem 'self'",
            'blocked-uri': 'https://evil.test/x.js?token=abc',
            disposition: 'enforce',
          },
        })
      )
    );

    expect(mocks.record).toHaveBeenCalledWith({
      event: 'csp.violation',
      outcome: 'denied',
      reason: 'script-src-elem',
    });
    const logged = JSON.stringify(mocks.record.mock.calls);
    expect(logged).not.toContain('segredo');
    expect(logged).not.toContain('evil.test');
  });

  it('records each Reporting API violation, ignores other report types and caps the batch', async () => {
    const violation = {
      type: 'csp-violation',
      body: { effectiveDirective: 'img-src', disposition: 'report' },
    };
    await POST(
      reportRequest(
        JSON.stringify([{ type: 'deprecation', body: { id: 'x' } }, ...Array(15).fill(violation)]),
        'application/reports+json'
      )
    );

    expect(mocks.record).toHaveBeenCalledTimes(10);
    expect(mocks.record).toHaveBeenCalledWith({
      event: 'csp.violation',
      outcome: 'failure',
      reason: 'img-src',
    });
  });

  it('rejects a forged directive instead of logging it', async () => {
    await POST(
      reportRequest(
        JSON.stringify([
          { type: 'csp-violation', body: { effectiveDirective: 'script-src"}\n{"event":"x' } },
        ]),
        'application/reports+json'
      )
    );

    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ reason: 'unknown' }));
  });
});

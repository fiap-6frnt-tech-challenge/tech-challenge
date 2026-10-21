import { describe, expect, it } from 'vitest';
import { POST } from './route';

function reportRequest(body: string, contentType = 'application/csp-report'): Request {
  return new Request('http://localhost/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
}

describe('CSP report endpoint', () => {
  it('accepts a legacy CSP report without requiring a session', async () => {
    const response = await POST(
      reportRequest(JSON.stringify({ 'csp-report': { 'blocked-uri': 'inline' } }))
    );

    expect(response.status).toBe(204);
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
  });
});

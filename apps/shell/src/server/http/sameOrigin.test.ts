import { describe, expect, it } from 'vitest';
import { isCrossOrigin, requestOrigin } from './sameOrigin';

const post = (url: string, headers: Record<string, string>) =>
  new Request(url, { method: 'POST', headers });

describe('requestOrigin', () => {
  it('usa o Host da requisição, não o endereço em que o servidor escuta', () => {
    expect(
      requestOrigin(post('http://0.0.0.0:3000/api/auth/register', { host: 'localhost:3000' }))
    ).toBe('http://localhost:3000');
  });

  it('prefere os cabeçalhos X-Forwarded do proxy', () => {
    const req = post('http://0.0.0.0:3000/api/auth/register', {
      host: '10.0.0.5:3000',
      'x-forwarded-host': 'app.example.com',
      'x-forwarded-proto': 'https, http',
    });
    expect(requestOrigin(req)).toBe('https://app.example.com');
  });

  it('cai na URL quando não há Host', () => {
    expect(requestOrigin(post('https://app.example.com/api/auth/register', {}))).toBe(
      'https://app.example.com'
    );
  });
});

describe('isCrossOrigin', () => {
  const url = 'http://0.0.0.0:3000/api/auth/sessions/revoke';

  it('aceita a origem do Host mesmo com o servidor escutando em 0.0.0.0', () => {
    expect(
      isCrossOrigin(post(url, { host: 'localhost:3000', origin: 'http://localhost:3000' }))
    ).toBe(false);
  });

  it('recusa outra origem', () => {
    expect(
      isCrossOrigin(post(url, { host: 'localhost:3000', origin: 'https://evil.example' }))
    ).toBe(true);
  });

  it('recusa Sec-Fetch-Site cross-site', () => {
    const req = post(url, {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'sec-fetch-site': 'cross-site',
    });
    expect(isCrossOrigin(req)).toBe(true);
  });

  it('aceita requisição sem Origin, a menos que ela seja exigida', () => {
    const req = post(url, { host: 'localhost:3000' });
    expect(isCrossOrigin(req)).toBe(false);
    expect(isCrossOrigin(req, { requireOrigin: true })).toBe(true);
  });
});

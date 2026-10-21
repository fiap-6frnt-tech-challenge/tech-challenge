import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { corsHeaders } from './cors';
import { readUpload } from './upload';

function uploadRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return new Request('http://localhost/api/transactions/t1/attachments', {
    method: 'POST',
    body: formData,
  }) as NextRequest;
}

describe('corsHeaders', () => {
  it('echoes an allowed MFE origin and falls back for others', () => {
    expect(corsHeaders('http://localhost:3002')['Access-Control-Allow-Origin']).toBe(
      'http://localhost:3002'
    );
    expect(corsHeaders('https://attacker.example')['Access-Control-Allow-Origin']).toBe(
      'http://localhost:3003'
    );
  });

  it('does not enable credentialed CORS in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(corsHeaders('https://tech-challenge-transactions-mfe.vercel.app')).toEqual({});
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('readUpload', () => {
  it('returns the file name and bytes, ignoring the client-declared type', async () => {
    const file = new File(['%PDF'], 'recibo.pdf', { type: 'text/html' });
    const upload = await readUpload(uploadRequest(file));
    expect(upload).toEqual({ name: 'recibo.pdf', bytes: expect.any(Uint8Array) });
    expect(Array.from(upload.bytes)).toEqual(Array.from(new TextEncoder().encode('%PDF')));
  });

  it('rejects missing files with the Phase 2 message', async () => {
    await expect(readUpload(uploadRequest())).rejects.toThrow('Arquivo não enviado');
  });

  it('rejects files above 4 MB before reading them', async () => {
    const file = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'huge.pdf', {
      type: 'application/pdf',
    });
    await expect(readUpload(uploadRequest(file))).rejects.toThrow('Arquivo excede o limite de 4MB');
  });
});

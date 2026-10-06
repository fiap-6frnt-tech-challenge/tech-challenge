import { describe, expect, it } from 'vitest';
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
});

describe('readUpload', () => {
  it('returns only the accepted file bytes and metadata', async () => {
    const file = new File(['%PDF'], 'recibo.pdf', { type: 'application/pdf' });
    const upload = await readUpload(uploadRequest(file));
    expect(upload.name).toBe('recibo.pdf');
    expect(upload.contentType).toBe('application/pdf');
    expect(Array.from(upload.bytes)).toEqual(Array.from(new TextEncoder().encode('%PDF')));
  });

  it('rejects missing files with the Phase 2 message', async () => {
    await expect(readUpload(uploadRequest())).rejects.toThrow('Arquivo não enviado');
  });

  it('rejects unsupported MIME types', async () => {
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
    await expect(readUpload(uploadRequest(file))).rejects.toThrow('Tipo de arquivo não permitido');
  });

  it('rejects files above 5 MB before reading them', async () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.pdf', {
      type: 'application/pdf',
    });
    await expect(readUpload(uploadRequest(file))).rejects.toThrow('Arquivo excede o limite de 5MB');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { NotFoundError } from '@bytebank/core';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), download: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: { downloadAttachment: { execute: mocks.download } },
}));

import { GET } from './route';

const actor = { userId: 'owner' };
const context = { params: Promise.resolve({ id: 'tx-1', attachmentId: 'att-1' }) };
const bytes = new TextEncoder().encode('%PDF-1.4 recibo');
const request = () =>
  new Request('http://localhost/api/transactions/tx-1/attachments/att-1/download') as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.download.mockResolvedValue({ name: 'recibo.pdf', mimeType: 'application/pdf', bytes });
});

describe('GET attachment download route', () => {
  it('não baixa sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(request(), context);
    expect(response.status).toBe(401);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it('responde 404 para anexo de outro usuário', async () => {
    mocks.download.mockRejectedValue(new NotFoundError('Anexo'));
    const response = await GET(request(), context);
    expect(response.status).toBe(404);
    expect(mocks.download).toHaveBeenCalledWith(actor, 'tx-1', 'att-1');
  });

  it('devolve os bytes decifrados com headers de download privado', async () => {
    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': 'application/pdf',
      'content-length': String(bytes.byteLength),
      'content-disposition': "attachment; filename*=UTF-8''recibo.pdf",
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it('neutraliza header injection e path traversal no nome do arquivo', async () => {
    mocks.download.mockResolvedValue({
      name: '../evil"\r\nSet-Cookie: x=1\\recibo (1)*.pdf',
      mimeType: 'application/pdf',
      bytes,
    });

    const response = await GET(request(), context);

    expect(response.headers.get('content-disposition')).toBe(
      "attachment; filename*=UTF-8''..evilSet-Cookie%3A%20x%3D1recibo%20%281%29%2A.pdf"
    );
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('codifica nomes com acentos e usa um nome padrão quando nada sobra', async () => {
    mocks.download.mockResolvedValueOnce({ name: 'março.png', mimeType: 'image/png', bytes });
    expect((await GET(request(), context)).headers.get('content-disposition')).toBe(
      "attachment; filename*=UTF-8''mar%C3%A7o.png"
    );
    mocks.download.mockResolvedValueOnce({ name: '/\\"', mimeType: 'image/png', bytes });
    expect((await GET(request(), context)).headers.get('content-disposition')).toBe(
      "attachment; filename*=UTF-8''anexo"
    );
  });
});

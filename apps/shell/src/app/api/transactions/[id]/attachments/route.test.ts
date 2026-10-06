import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { NotFoundError } from '@bytebank/core';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getTransaction: vi.fn(),
  add: vi.fn(),
  list: vi.fn(),
}));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: {
    getTransaction: { execute: mocks.getTransaction },
    addAttachment: { execute: mocks.add },
    listAttachments: { execute: mocks.list },
  },
}));

import { GET, OPTIONS, POST } from './route';

const actor = { userId: 'owner' };
const context = { params: Promise.resolve({ id: 'tx-1' }) };
const attachment = {
  id: 'att-1',
  url: 'https://blob.test/recibo.pdf',
  name: 'recibo.pdf',
  size: 4,
  mimeType: 'application/pdf',
  ref: 'private/ref',
  ownerId: actor.userId,
  transactionId: 'tx-1',
};
const publicAttachment = {
  id: attachment.id,
  url: attachment.url,
  name: attachment.name,
  size: attachment.size,
  mimeType: attachment.mimeType,
};

function request(file?: File): NextRequest {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return new Request('http://localhost/api/transactions/tx-1/attachments', {
    method: 'POST',
    headers: { origin: 'http://localhost:3002' },
    body: formData,
  }) as NextRequest;
}
function pdf() {
  return new File(['%PDF'], 'recibo.pdf', { type: 'application/pdf' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.getTransaction.mockResolvedValue({ id: 'tx-1', userId: actor.userId });
  mocks.add.mockResolvedValue(attachment);
  mocks.list.mockResolvedValue([attachment]);
});

describe('attachments route', () => {
  it('answers OPTIONS without authentication and keeps CORS', async () => {
    const response = await OPTIONS(request());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3002');
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it('returns 401 before reading or uploading a file without a session', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(request(pdf()), context);
    expect(response.status).toBe(401);
    expect(mocks.getTransaction).not.toHaveBeenCalled();
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it('checks ownership before accepting the upload', async () => {
    mocks.getTransaction.mockRejectedValue(new NotFoundError('Transação'));
    const response = await POST(request(pdf()), context);
    expect(response.status).toBe(404);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 'Arquivo não enviado'],
    [new File(['hi'], 'note.txt', { type: 'text/plain' }), 'Tipo de arquivo não permitido'],
  ])('returns 400 for an invalid file', async (file, message) => {
    const response = await POST(request(file), context);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it('uploads bytes through the use case and returns only public fields', async () => {
    const response = await POST(request(pdf()), context);
    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3002');
    await expect(response.json()).resolves.toEqual(publicAttachment);
    expect(mocks.add).toHaveBeenCalledWith(
      actor,
      'tx-1',
      expect.objectContaining({
        name: 'recibo.pdf',
        contentType: 'application/pdf',
        bytes: expect.any(Uint8Array),
      })
    );
  });

  it('preserves the Phase 2 empty list for a missing or foreign transaction', async () => {
    mocks.list.mockRejectedValue(new NotFoundError('Transação'));
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it('lists only public attachment fields and keeps CORS', async () => {
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([publicAttachment]);
    expect(mocks.list).toHaveBeenCalledWith(actor, 'tx-1');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3002');
  });
});

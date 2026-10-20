import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { InvalidFileError, NotFoundError } from '@bytebank/core';

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
  downloadUrl: '/api/transactions/tx-1/attachments/att-1/download',
  name: 'recibo.pdf',
  size: 4,
  mimeType: 'application/pdf',
  ref: 'https://blob.test/3f1c9d2e',
  ownerId: actor.userId,
  transactionId: 'tx-1',
  encVersion: 1,
};
const publicAttachment = {
  id: attachment.id,
  downloadUrl: attachment.downloadUrl,
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
  return new File(['%PDF-1.4'], 'recibo.pdf', { type: 'application/pdf' });
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

  it('returns 400 when no file is sent', async () => {
    const response = await POST(request(), context);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Arquivo não enviado' });
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it('returns 400 when the content signature is rejected', async () => {
    mocks.add.mockRejectedValue(new InvalidFileError('Tipo de arquivo não permitido'));
    const exe = new File([new Uint8Array([0x4d, 0x5a])], 'foto.png', { type: 'image/png' });
    const response = await POST(request(exe), context);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Tipo de arquivo não permitido' });
  });

  it('uploads bytes through the use case and returns only public fields', async () => {
    const response = await POST(request(pdf()), context);
    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3002');
    const body = await response.text();
    expect(JSON.parse(body)).toEqual(publicAttachment);
    expect(body).not.toContain(attachment.ref);
    expect(mocks.add).toHaveBeenCalledWith(actor, 'tx-1', {
      name: 'recibo.pdf',
      bytes: expect.any(Uint8Array),
    });
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
    const body = await response.text();
    expect(JSON.parse(body)).toEqual([publicAttachment]);
    expect(body).not.toContain(attachment.ref);
    expect(mocks.list).toHaveBeenCalledWith(actor, 'tx-1');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3002');
  });
});

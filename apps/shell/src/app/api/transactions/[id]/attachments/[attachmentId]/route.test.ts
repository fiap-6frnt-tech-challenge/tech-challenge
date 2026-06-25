import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('../../../store', () => ({
  getAttachment: mocks.getAttachment,
  deleteAttachment: mocks.deleteAttachment,
}));
vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage')>('@/lib/storage');
  return {
    ...actual,
    storage: { upload: vi.fn(), delete: mocks.remove },
  };
});

import { DELETE } from './route';

const USER_ID = 'user-123';
const TX_ID = 'tx-1';
const ATT_ID = 'att-1';

function params() {
  return { params: Promise.resolve({ id: TX_ID, attachmentId: ATT_ID }) };
}

function deleteRequest(): NextRequest {
  return new Request(`http://localhost/api/transactions/${TX_ID}/attachments/${ATT_ID}`, {
    method: 'DELETE',
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
  mocks.getAttachment.mockResolvedValue({
    id: ATT_ID,
    url: 'https://blob.test/file.pdf',
    name: 'file.pdf',
    size: 1024,
    mimeType: 'application/pdf',
  });
  mocks.deleteAttachment.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
});

describe('DELETE /api/transactions/[id]/attachments/[attachmentId]', () => {
  it('retorna 401 e não remove nada sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), params());

    expect(res.status).toBe(401);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteAttachment).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o anexo não existe ou não pertence ao usuário', async () => {
    mocks.getAttachment.mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), params());

    expect(res.status).toBe(404);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteAttachment).not.toHaveBeenCalled();
  });

  it('remove do storage e do banco e retorna 204', async () => {
    const res = await DELETE(deleteRequest(), params());

    expect(res.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith('https://blob.test/file.pdf');
    expect(mocks.deleteAttachment).toHaveBeenCalledWith(ATT_ID, USER_ID);
  });
});

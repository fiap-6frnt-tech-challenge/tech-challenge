import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getById: vi.fn(),
  createAttachment: vi.fn(),
  listAttachments: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('../../store', () => ({
  getById: mocks.getById,
  createAttachment: mocks.createAttachment,
  listAttachments: mocks.listAttachments,
}));
vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage')>('@/lib/storage');
  return {
    ...actual,
    storage: { upload: mocks.upload, delete: mocks.remove },
  };
});

import { GET, POST } from './route';

const USER_ID = 'user-123';
const TX_ID = 'tx-1';

function params(id = TX_ID) {
  return { params: Promise.resolve({ id }) };
}

function uploadRequest(file: File | null): NextRequest {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return new Request(`http://localhost/api/transactions/${TX_ID}/attachments`, {
    method: 'POST',
    body: formData,
  }) as NextRequest;
}

function pdf(name = 'recibo.pdf'): File {
  return new File(['%PDF-1.4 conteúdo'], name, { type: 'application/pdf' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
  mocks.getById.mockResolvedValue({ id: TX_ID, userId: USER_ID });
  mocks.upload.mockResolvedValue({
    url: 'https://blob.test/file.pdf',
    key: 'test/file.pdf',
    size: 1024,
  });
  mocks.createAttachment.mockImplementation(async (data) => ({ id: 'att-1', ...data }));
});

describe('POST /api/transactions/[id]/attachments', () => {
  it('retorna 401 e não chama o storage sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await POST(uploadRequest(pdf()), params());

    expect(res.status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.createAttachment).not.toHaveBeenCalled();
  });

  it('retorna 404 quando a transação não existe', async () => {
    mocks.getById.mockResolvedValue(null);

    const res = await POST(uploadRequest(pdf()), params());

    expect(res.status).toBe(404);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('retorna 404 quando a transação pertence a outro usuário', async () => {
    mocks.getById.mockResolvedValue({ id: TX_ID, userId: 'outro' });

    const res = await POST(uploadRequest(pdf()), params());

    expect(res.status).toBe(404);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('retorna 400 quando nenhum arquivo é enviado', async () => {
    const res = await POST(uploadRequest(null), params());

    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('retorna 400 para tipo de arquivo inválido', async () => {
    const file = new File(['oi'], 'notas.txt', { type: 'text/plain' });

    const res = await POST(uploadRequest(file), params());

    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('retorna 400 para arquivo acima de 5MB', async () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });

    const res = await POST(uploadRequest(big), params());

    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('faz upload, cria o anexo no banco e retorna 201', async () => {
    const res = await POST(uploadRequest(pdf('recibo.pdf')), params());

    expect(res.status).toBe(201);
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.upload).toHaveBeenCalledWith(expect.any(File), USER_ID);
    expect(mocks.createAttachment).toHaveBeenCalledWith({
      transactionId: TX_ID,
      url: 'https://blob.test/file.pdf',
      name: 'recibo.pdf',
      size: 1024,
      mimeType: 'application/pdf',
    });
    await expect(res.json()).resolves.toMatchObject({
      id: 'att-1',
      url: 'https://blob.test/file.pdf',
    });
  });
});

describe('GET /api/transactions/[id]/attachments', () => {
  it('retorna 401 sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);

    const req = new Request('http://localhost/api/transactions/tx-1/attachments') as NextRequest;
    const res = await GET(req, params());

    expect(res.status).toBe(401);
    expect(mocks.listAttachments).not.toHaveBeenCalled();
  });

  it('lista os anexos do usuário autenticado', async () => {
    const attachments = [
      {
        id: 'att-1',
        url: 'https://blob.test/a.pdf',
        name: 'a.pdf',
        size: 1,
        mimeType: 'application/pdf',
      },
    ];
    mocks.listAttachments.mockResolvedValue(attachments);

    const req = new Request('http://localhost/api/transactions/tx-1/attachments') as NextRequest;
    const res = await GET(req, params());

    expect(res.status).toBe(200);
    expect(mocks.listAttachments).toHaveBeenCalledWith(TX_ID, USER_ID);
    await expect(res.json()).resolves.toEqual(attachments);
  });
});

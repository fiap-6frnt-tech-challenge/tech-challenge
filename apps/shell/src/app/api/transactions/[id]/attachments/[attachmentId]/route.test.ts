import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { NotFoundError } from '@bytebank/core';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), remove: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: { removeAttachment: { execute: mocks.remove } },
}));

import { DELETE, OPTIONS } from './route';

const actor = { userId: 'owner' };
const context = { params: Promise.resolve({ id: 'tx-1', attachmentId: 'att-1' }) };
const request = () =>
  new Request('http://localhost/api/transactions/tx-1/attachments/att-1', {
    method: 'DELETE',
    headers: { origin: 'http://localhost:3003' },
  }) as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: actor.userId } });
  mocks.remove.mockResolvedValue(undefined);
});

describe('DELETE attachment route', () => {
  it('answers preflight without a session', async () => {
    const response = await OPTIONS(request());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3003');
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it('does not delete without a session', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await DELETE(request(), context);
    expect(response.status).toBe(401);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('maps an absent or foreign attachment to 404', async () => {
    mocks.remove.mockRejectedValue(new NotFoundError('Anexo'));
    const response = await DELETE(request(), context);
    expect(response.status).toBe(404);
    expect(mocks.remove).toHaveBeenCalledWith(actor, 'att-1');
  });

  it('returns 204 and CORS after removal through the use case', async () => {
    const response = await DELETE(request(), context);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3003');
    expect(mocks.remove).toHaveBeenCalledWith(actor, 'att-1');
  });
});

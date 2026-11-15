import { beforeEach, describe, expect, it, vi } from 'vitest';

const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }));
vi.mock('@vercel/blob', () => blob);

import { VercelBlobFileStorage } from './VercelBlobFileStorage';

const url = 'https://store.public.blob.vercel-storage.com/user-1/file-1';
const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const storage = new VercelBlobFileStorage();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VercelBlobFileStorage', () => {
  it('envia os bytes com acesso público e usa a URL do blob como referência', async () => {
    blob.put.mockResolvedValue({ url, pathname: 'user-1/file-1' });

    const stored = await storage.put('user-1/file-1', bytes, 'application/pdf');

    expect(blob.put).toHaveBeenCalledWith('user-1/file-1', Buffer.from(bytes), {
      access: 'public',
      contentType: 'application/pdf',
    });
    expect(stored).toEqual({
      ref: url,
      name: 'user-1/file-1',
      size: bytes.byteLength,
      contentType: 'application/pdf',
    });
  });

  it('baixa os bytes pelo SDK', async () => {
    blob.get.mockResolvedValue({ statusCode: 200, stream: new Blob([bytes]).stream() });

    expect(await storage.get(url)).toEqual(bytes);
    expect(blob.get).toHaveBeenCalledWith(url, { access: 'public' });
  });

  it('falha quando o blob não existe', async () => {
    blob.get.mockResolvedValue(null);
    await expect(storage.get(url)).rejects.toThrow('Arquivo não encontrado no Blob');
  });

  it('apaga pelo SDK', async () => {
    await storage.delete(url);
    expect(blob.del).toHaveBeenCalledWith(url);
  });
});

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalFileStorage } from './LocalFileStorage';

const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
let root: string;
let storage: LocalFileStorage;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'bytebank-storage-'));
  storage = new LocalFileStorage(root);
});

afterEach(() => rm(root, { recursive: true, force: true }));

describe('LocalFileStorage', () => {
  it('grava os bytes reais em disco e devolve a chave como referência', async () => {
    const stored = await storage.put('user-1/file-1', bytes, 'application/pdf');

    expect(stored).toEqual({
      ref: 'user-1/file-1',
      name: 'user-1/file-1',
      size: bytes.byteLength,
      contentType: 'application/pdf',
    });
    expect(new Uint8Array(await readFile(join(root, 'user-1', 'file-1')))).toEqual(bytes);
    expect(await storage.get(stored.ref)).toEqual(bytes);
  });

  it('não sobrescreve um arquivo existente', async () => {
    await storage.put('user-1/file-1', bytes, 'application/pdf');

    await expect(
      storage.put('user-1/file-1', new Uint8Array([1]), 'application/pdf')
    ).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await storage.get('user-1/file-1')).toEqual(bytes);
  });

  it('apaga o arquivo e tolera uma referência já removida', async () => {
    await storage.put('user-1/file-1', bytes, 'application/pdf');

    await storage.delete('user-1/file-1');

    await expect(storage.get('user-1/file-1')).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(storage.delete('user-1/file-1')).resolves.toBeUndefined();
  });

  it.each(['', '../fora', 'user-1/../../fora', '/etc/passwd'])(
    'recusa referência fora da pasta de uploads: "%s"',
    async (ref) => {
      await expect(storage.put(ref, bytes, 'application/pdf')).rejects.toThrow(
        'Referência de arquivo inválida'
      );
      await expect(storage.get(ref)).rejects.toThrow('Referência de arquivo inválida');
      await expect(storage.delete(ref)).rejects.toThrow('Referência de arquivo inválida');
    }
  );
});

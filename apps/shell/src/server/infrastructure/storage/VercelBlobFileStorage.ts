import 'server-only';
import { del, get, put } from '@vercel/blob';
import type { FileStorage, StoredFile } from '@bytebank/core/application';

export class VercelBlobFileStorage implements FileStorage {
  async put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredFile> {
    const blob = await put(key, Buffer.from(bytes), { access: 'public', contentType });
    return { ref: blob.url, name: blob.pathname, size: bytes.byteLength, contentType };
  }

  async get(ref: string): Promise<Uint8Array> {
    const result = await get(ref, { access: 'public' });
    if (result?.statusCode !== 200) throw new Error(`Arquivo não encontrado no Blob: ${ref}`);
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  }

  async delete(ref: string): Promise<void> {
    await del(ref);
  }
}

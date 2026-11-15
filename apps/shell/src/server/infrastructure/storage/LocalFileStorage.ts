import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { FileStorage, StoredFile } from '@bytebank/core/application';

export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredFile> {
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: 'wx' });
    return { ref: key, name: key, size: bytes.byteLength, contentType };
  }

  async get(ref: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.pathOf(ref)));
  }

  async delete(ref: string): Promise<void> {
    await rm(this.pathOf(ref), { force: true });
  }

  private pathOf(ref: string): string {
    const path = resolve(this.root, ref);
    if (!path.startsWith(this.root + sep)) {
      throw new Error(`Referência de arquivo inválida: ${ref}`);
    }
    return path;
  }
}

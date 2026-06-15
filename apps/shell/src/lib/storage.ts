import { put, del } from '@vercel/blob';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

export interface StorageProvider {
  upload(file: File, userId: string): Promise<UploadResult>;
  delete(url: string): Promise<void>;
}

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
export const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export function validateFile(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new FileValidationError('Tipo de arquivo não permitido');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new FileValidationError('Arquivo excede o limite de 5MB');
  }
}

class VercelBlobStorageProvider implements StorageProvider {
  async upload(file: File, userId: string): Promise<UploadResult> {
    const key = `${userId}/${Date.now()}-${file.name}`;
    const blob = await put(key, file, { access: 'public' });
    return { url: blob.url, key, size: file.size };
  }

  async delete(url: string): Promise<void> {
    await del(url);
  }
}

class MockStorageProvider implements StorageProvider {
  async upload(file: File, userId: string): Promise<UploadResult> {
    const key = `${userId}/${Date.now()}-${file.name}`;
    return { url: `https://blob.mock.local/${encodeURIComponent(key)}`, key, size: file.size };
  }

  async delete(): Promise<void> {}
}

export const storage: StorageProvider = process.env.BLOB_READ_WRITE_TOKEN
  ? new VercelBlobStorageProvider()
  : new MockStorageProvider();

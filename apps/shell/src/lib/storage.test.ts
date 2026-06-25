import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MIME_TYPES,
  FileValidationError,
  MAX_SIZE_BYTES,
  storage,
  validateFile,
} from './storage';

function fileWith(type: string, size: number, name = 'arquivo'): File {
  return { type, size, name } as unknown as File;
}

describe('validateFile', () => {
  it.each(ALLOWED_MIME_TYPES)('aceita o tipo permitido %s', (type) => {
    expect(() => validateFile(fileWith(type, 1024))).not.toThrow();
  });

  it('aceita arquivo no limite exato de 5MB', () => {
    expect(() => validateFile(fileWith('application/pdf', MAX_SIZE_BYTES))).not.toThrow();
  });

  it('rejeita tipo não permitido com FileValidationError', () => {
    expect(() => validateFile(fileWith('text/plain', 1024))).toThrow(FileValidationError);
    expect(() => validateFile(fileWith('text/plain', 1024))).toThrow(
      'Tipo de arquivo não permitido'
    );
  });

  it('rejeita arquivo acima de 5MB com FileValidationError', () => {
    expect(() => validateFile(fileWith('application/pdf', MAX_SIZE_BYTES + 1))).toThrow(
      FileValidationError
    );
    expect(() => validateFile(fileWith('application/pdf', MAX_SIZE_BYTES + 1))).toThrow(
      'Arquivo excede o limite de 5MB'
    );
  });
});

describe('storage (MockStorageProvider em ambiente de teste)', () => {
  it('upload retorna { url, key, size } com o key namespaced pelo userId', async () => {
    const file = fileWith('application/pdf', 2048, 'recibo.pdf');

    const result = await storage.upload(file, 'joana');

    expect(result.size).toBe(2048);
    expect(result.key).toMatch(/^joana\/\d+-recibo\.pdf$/);
    expect(result.url).toContain('joana');
    expect(result.url.startsWith('http')).toBe(true);
  });

  it('delete resolve sem erro', async () => {
    await expect(storage.delete('https://blob.mock.local/qualquer')).resolves.toBeUndefined();
  });
});

import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveCipher, resolveFileStorage } from './container';
import { LocalFileStorage } from './infrastructure/storage/LocalFileStorage';
import { VercelBlobFileStorage } from './infrastructure/storage/VercelBlobFileStorage';

const missingToken = 'BLOB_READ_WRITE_TOKEN é obrigatório em produção';

function stubStorageEnv(env: { token?: string; uploadsDir?: string; nodeEnv: string }) {
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', env.token ?? '');
  vi.stubEnv('LOCAL_UPLOADS_DIR', env.uploadsDir ?? '');
  vi.stubEnv('NODE_ENV', env.nodeEnv);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('resolveFileStorage', () => {
  it('usa o Vercel Blob quando há token, mesmo com LOCAL_UPLOADS_DIR', () => {
    stubStorageEnv({
      token: 'vercel_blob_rw_token',
      uploadsDir: '/srv/uploads',
      nodeEnv: 'production',
    });
    expect(resolveFileStorage()).toBeInstanceOf(VercelBlobFileStorage);
  });

  it('grava em LOCAL_UPLOADS_DIR quando definido, inclusive em produção (Docker/CI)', () => {
    stubStorageEnv({ uploadsDir: '/srv/uploads', nodeEnv: 'production' });
    expect(resolveFileStorage()).toEqual(new LocalFileStorage('/srv/uploads'));
  });

  it('cai em .uploads no desenvolvimento sem token', () => {
    stubStorageEnv({ nodeEnv: 'development' });
    expect(resolveFileStorage()).toEqual(new LocalFileStorage('.uploads'));
  });

  it('falha de forma clara em produção sem token nem LOCAL_UPLOADS_DIR', () => {
    stubStorageEnv({ nodeEnv: 'production' });
    expect(() => resolveFileStorage()).toThrow(missingToken);
  });
});

describe('resolveCipher', () => {
  const key = randomBytes(32).toString('base64');
  const context = 'attachment:a1';
  const plain = new TextEncoder().encode('recibo');

  function stubCipherEnv(env: { keys?: string; active?: string; nodeEnv: string; phase?: string }) {
    vi.stubEnv('DATA_ENCRYPTION_KEYS', env.keys ?? '');
    vi.stubEnv('DATA_ENCRYPTION_ACTIVE_KEY_ID', env.active ?? '');
    vi.stubEnv('NODE_ENV', env.nodeEnv);
    vi.stubEnv('NEXT_PHASE', env.phase ?? '');
  }

  it('usa a chave ativa configurada', () => {
    stubCipherEnv({ keys: `1:${key}`, active: '1', nodeEnv: 'production' });
    const cipher = resolveCipher();
    const payload = cipher.encrypt(plain, context);
    expect(payload[1]).toBe(1);
    expect(new Uint8Array(cipher.decrypt(payload, context))).toEqual(plain);
  });

  it.each([
    [
      'chave com tamanho errado',
      `1:${randomBytes(16).toString('base64')}`,
      '1',
      'exatamente 32 bytes',
    ],
    ['chave ativa ausente', `1:${key}`, '', 'DATA_ENCRYPTION_ACTIVE_KEY_ID'],
    ['chave ativa inexistente', `1:${key}`, '2', 'DATA_ENCRYPTION_ACTIVE_KEY_ID'],
  ])('falha no boot com %s', (_name, keys, active, message) => {
    stubCipherEnv({ keys, active, nodeEnv: 'development' });
    expect(() => resolveCipher()).toThrow(message);
  });

  it('exige as chaves em produção', () => {
    stubCipherEnv({ nodeEnv: 'production' });
    expect(() => resolveCipher()).toThrow('DATA_ENCRYPTION_KEYS');
  });

  it.each([
    ['no desenvolvimento', 'development', undefined],
    ['no build de produção', 'production', 'phase-production-build'],
  ])('usa a chave local de desenvolvimento %s', (_name, nodeEnv, phase) => {
    stubCipherEnv({ nodeEnv, phase });
    const payload = resolveCipher().encrypt(plain, context);
    expect(payload[1]).toBe(0);
    expect(new Uint8Array(resolveCipher().decrypt(payload, context))).toEqual(plain);
  });
});

describe('container', () => {
  it('não carrega em produção sem token, o que derruba o build das rotas que o importam', async () => {
    stubStorageEnv({ nodeEnv: 'production' });
    vi.stubEnv('DATA_ENCRYPTION_KEYS', `1:${randomBytes(32).toString('base64')}`);
    vi.stubEnv('DATA_ENCRYPTION_ACTIVE_KEY_ID', '1');
    vi.resetModules();
    await expect(import('./container')).rejects.toThrow(missingToken);
  });

  it('não atende requisições em produção sem as chaves de cifra', async () => {
    stubStorageEnv({ uploadsDir: '/srv/uploads', nodeEnv: 'production' });
    vi.stubEnv('DATA_ENCRYPTION_KEYS', '');
    vi.stubEnv('NEXT_PHASE', 'phase-production-server');
    vi.resetModules();
    await expect(import('./container')).rejects.toThrow('DATA_ENCRYPTION_KEYS');
  });
});

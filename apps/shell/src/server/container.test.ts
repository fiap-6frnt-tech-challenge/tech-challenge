import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveFileStorage } from './container';
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

describe('container', () => {
  it('não carrega em produção sem token, o que derruba o build das rotas que o importam', async () => {
    stubStorageEnv({ nodeEnv: 'production' });
    vi.resetModules();
    await expect(import('./container')).rejects.toThrow(missingToken);
  });
});

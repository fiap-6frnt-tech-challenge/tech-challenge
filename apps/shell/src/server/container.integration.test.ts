import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { integrationScope } from './testing/integrationScope';

const scope = integrationScope();
const actor = { userId: scope.id('owner') };
let uploadsDir: string;
let container: typeof import('./container').container;

beforeAll(async () => {
  uploadsDir = await mkdtemp(join(tmpdir(), 'bytebank-uploads-'));
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
  vi.stubEnv('LOCAL_UPLOADS_DIR', uploadsDir);
  ({ container } = await import('./container'));
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await scope.cleanup();
  await rm(uploadsDir, { recursive: true, force: true });
});

describe('container (Postgres + disco local, sem BLOB_READ_WRITE_TOKEN)', () => {
  it('anexa, lista e remove um arquivo com os bytes gravados em disco', async () => {
    const transaction = await container.createTransaction.execute(actor, {
      type: 'withdrawal',
      category: 'food',
      amount: 42.5,
      date: '2026-01-15',
      description: 'Mercado',
    });
    const bytes = new TextEncoder().encode('%PDF-1.4 recibo de teste');

    const attachment = await container.addAttachment.execute(actor, transaction.id, {
      name: 'recibo.pdf',
      bytes,
      contentType: 'application/pdf',
    });

    expect(attachment).toMatchObject({
      name: 'recibo.pdf',
      size: bytes.byteLength,
      mimeType: 'application/pdf',
      transactionId: transaction.id,
      ownerId: actor.userId,
    });
    expect(new Uint8Array(await readFile(join(uploadsDir, attachment.ref)))).toEqual(bytes);
    expect(await container.listAttachments.execute(actor, transaction.id)).toEqual([attachment]);

    await container.removeAttachment.execute(actor, attachment.id);

    expect(await container.listAttachments.execute(actor, transaction.id)).toEqual([]);
    await expect(stat(join(uploadsDir, attachment.ref))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('registra e autentica um usuário com a senha em bcrypt', async () => {
    const email = `${scope.id('ana')}@bytebank.test`;

    const user = await container.registerUser.execute({
      name: 'Ana Souza',
      email,
      password: 'Senha123!',
    });

    expect(user.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(await container.authenticateUser.execute(email.toUpperCase(), 'Senha123!')).toEqual(
      user
    );
    expect(await container.authenticateUser.execute(email, 'senha-errada')).toBeNull();
  });
});

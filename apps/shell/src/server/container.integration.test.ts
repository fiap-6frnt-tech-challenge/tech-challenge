import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema';
import { integrationScope } from './testing/integrationScope';

const scope = integrationScope();
const actor = { userId: scope.id('owner') };
let uploadsDir: string;
let container: typeof import('./container').container;

beforeAll(async () => {
  uploadsDir = await mkdtemp(join(tmpdir(), 'bytebank-uploads-'));
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
  vi.stubEnv('LOCAL_UPLOADS_DIR', uploadsDir);
  vi.stubEnv('HIBP_ENABLED', 'false');
  ({ container } = await import('./container'));
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await scope.cleanup();
  await rm(uploadsDir, { recursive: true, force: true });
});

describe('container (Postgres + disco local, sem BLOB_READ_WRITE_TOKEN)', () => {
  it('anexa cifrado em disco, baixa decifrado, lista e remove', async () => {
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
    });

    expect(attachment).toMatchObject({
      name: 'recibo.pdf',
      size: bytes.byteLength,
      mimeType: 'application/pdf',
      transactionId: transaction.id,
      ownerId: actor.userId,
      encVersion: 1,
    });
    expect(attachment.ref).not.toContain('recibo');
    expect(attachment.ref).not.toContain(actor.userId);
    const onDisk = await readFile(join(uploadsDir, attachment.ref));
    expect(onDisk.byteLength).toBe(bytes.byteLength + 30);
    expect(onDisk.includes(Buffer.from('recibo de teste'))).toBe(false);
    const downloaded = await container.downloadAttachment.execute(
      actor,
      transaction.id,
      attachment.id
    );
    expect(downloaded).toMatchObject({ name: 'recibo.pdf', mimeType: 'application/pdf' });
    expect(new Uint8Array(downloaded.bytes)).toEqual(bytes);
    await expect(
      container.downloadAttachment.execute(
        { userId: scope.id('intruso') },
        transaction.id,
        attachment.id
      )
    ).rejects.toThrow('Anexo não encontrado');
    expect(await container.listAttachments.execute(actor, transaction.id)).toEqual([attachment]);

    await container.removeAttachment.execute(actor, attachment.id);

    expect(await container.listAttachments.execute(actor, transaction.id)).toEqual([]);
    await expect(stat(join(uploadsDir, attachment.ref))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('registra e autentica um usuário com a senha em bcrypt custo 12', async () => {
    const email = `${scope.id('ana')}@bytebank.test`;
    const password = 'Bytebank-Teste-2026';

    const user = await container.registerUser.execute(
      {
        name: 'Ana Souza',
        email,
        password,
      },
      '127.0.0.1'
    );

    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(
      await container.authenticateUser.execute(email.toUpperCase(), password, '127.0.0.1')
    ).toEqual(user);
    expect(await container.authenticateUser.execute(email, 'senha-errada', '127.0.0.1')).toBeNull();
  });

  it('migra para custo 12 o hash antigo no primeiro login com a senha antiga', async () => {
    const legacy = {
      id: scope.id('legado'),
      name: 'Conta Antiga',
      email: `${scope.id('legado')}@bytebank.test`,
      passwordHash: '$2b$10$WOxndslfeNrIgvZqXM9V.OiXmBY1Lch/Eg9QrMqrAz36Xn29dJdzK',
    };
    await db.insert(users).values(legacy);

    const authenticated = await container.authenticateUser.execute(
      legacy.email,
      'Senha123!',
      '127.0.0.1'
    );

    const [row] = await db.select().from(users).where(eq(users.id, legacy.id));
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(authenticated).toMatchObject({ id: legacy.id, passwordHash: row.passwordHash });
    expect(
      await container.authenticateUser.execute(legacy.email, 'Senha123!', '127.0.0.1')
    ).toMatchObject({ id: legacy.id, passwordHash: row.passwordHash });
  });
});

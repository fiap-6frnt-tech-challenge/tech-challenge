import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@bytebank/core';
import { db } from '@/db';
import { attachments, transactions } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import { AesGcmCipher } from '../security/AesGcmCipher';
import { DrizzleAttachmentRepository } from './DrizzleAttachmentRepository';

const scope = integrationScope();
const owner = scope.id('owner');
const other = scope.id('other');
const cipher = new AesGcmCipher(new Map([[1, randomBytes(32)]]), 1);
const repository = new DrizzleAttachmentRepository(db, cipher);

const listed = scope.id('listed');
const uploads = scope.id('uploads');
const empty = scope.id('empty');
const foreign = scope.id('foreign');
const missing = scope.id('missing');
const legacyTx = scope.id('legacy');

const downloadUrl = (transactionId: string, id: string) =>
  `/api/transactions/${encodeURIComponent(transactionId)}/attachments/${encodeURIComponent(id)}/download`;

function file(name: string) {
  return {
    id: scope.id(`att-${name}`),
    name,
    size: 2048,
    mimeType: 'application/pdf',
    ref: `blob-${name}`,
  };
}

async function rawRow(id: string) {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, id));
  return row;
}

beforeAll(async () => {
  const base = {
    type: 'withdrawal',
    category: 'food',
    amount: 10,
    date: '2026-01-10',
    description: 'Mercado',
  };
  await db.insert(transactions).values([
    { ...base, id: listed, userId: owner },
    { ...base, id: uploads, userId: owner },
    { ...base, id: empty, userId: owner },
    { ...base, id: foreign, userId: other },
    { ...base, id: legacyTx, userId: other },
  ]);
  await db.insert(attachments).values([
    {
      id: scope.id('older'),
      transactionId: listed,
      ref: `${owner}/antigo`,
      name: 'antigo.pdf',
      size: 1,
      mimeType: 'application/pdf',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      id: scope.id('newer'),
      transactionId: listed,
      ref: `${owner}/novo`,
      name: 'novo.png',
      size: 2,
      mimeType: 'image/png',
      createdAt: new Date('2026-01-02T10:00:00Z'),
    },
  ]);
});

afterAll(() => scope.cleanup());

describe('DrizzleAttachmentRepository', () => {
  it('cria o anexo com nome e referência cifrados no banco', async () => {
    const data = file('recibo março.pdf');
    const created = await repository.create(uploads, owner, data);

    expect(created).toEqual({
      id: data.id,
      downloadUrl: downloadUrl(uploads, data.id),
      ref: data.ref,
      name: data.name,
      size: 2048,
      mimeType: 'application/pdf',
      transactionId: uploads,
      ownerId: owner,
      encVersion: 1,
    });
    expect(await repository.findById(created.id, owner)).toEqual(created);

    const row = await rawRow(data.id);
    expect(row.encVersion).toBe(1);
    expect(row.name).not.toContain('recibo');
    expect(row.ref).not.toContain(data.ref);
    expect(cipher.decryptText(row.name, `attachment:${data.id}:name`)).toBe(data.name);
  });

  it('recusa ler um nome cifrado copiado de outra linha', async () => {
    const source = await repository.create(uploads, owner, file('origem.pdf'));
    const target = await repository.create(uploads, owner, file('destino.pdf'));
    await db
      .update(attachments)
      .set({ name: (await rawRow(source.id)).name })
      .where(eq(attachments.id, target.id));

    await expect(repository.findById(target.id, owner)).rejects.toThrow();
  });

  it('recusa anexar em transação de outro usuário ou inexistente', async () => {
    await expect(repository.create(foreign, owner, file('intruso.pdf'))).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(repository.create(missing, owner, file('fantasma.pdf'))).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(
      await db.select().from(attachments).where(eq(attachments.transactionId, foreign))
    ).toEqual([]);
  });

  it('lista os anexos legados (em claro) do mais recente para o mais antigo', async () => {
    expect(await repository.list(listed, owner)).toEqual([
      {
        id: scope.id('newer'),
        downloadUrl: downloadUrl(listed, scope.id('newer')),
        ref: `${owner}/novo`,
        name: 'novo.png',
        size: 2,
        mimeType: 'image/png',
        transactionId: listed,
        ownerId: owner,
        encVersion: 0,
      },
      {
        id: scope.id('older'),
        downloadUrl: downloadUrl(listed, scope.id('older')),
        ref: `${owner}/antigo`,
        name: 'antigo.pdf',
        size: 1,
        mimeType: 'application/pdf',
        transactionId: listed,
        ownerId: owner,
        encVersion: 0,
      },
    ]);
  });

  it('devolve lista vazia para a transação do dono sem anexos', async () => {
    expect(await repository.list(empty, owner)).toEqual([]);
  });

  it('devolve null quando a transação é de outro usuário ou não existe', async () => {
    expect(await repository.list(listed, other)).toBeNull();
    expect(await repository.list(missing, owner)).toBeNull();
  });

  it('não encontra nem apaga o anexo de outro usuário', async () => {
    expect(await repository.findById(scope.id('older'), other)).toBeNull();
    expect(await repository.delete(scope.id('older'), other)).toBe(false);
    expect(await repository.findById(scope.id('older'), owner)).not.toBeNull();
  });

  it('apaga o anexo do dono', async () => {
    const created = await repository.create(uploads, owner, file('descartavel.pdf'));

    expect(await repository.delete(created.id, owner)).toBe(true);
    expect(await repository.findById(created.id, owner)).toBeNull();
    expect(await repository.delete(created.id, owner)).toBe(false);
  });
});

describe('DrizzleAttachmentRepository — migração de legados', () => {
  const legacyIds = ['l1', 'l2', 'l3'].map((name) => scope.id(`mig-${name}`));

  beforeAll(async () => {
    await db.insert(attachments).values(
      legacyIds.map((id) => ({
        id,
        transactionId: legacyTx,
        ref: `https://blob.test/${other}/${id}.pdf`,
        name: `${id}.pdf`,
        size: 3,
        mimeType: 'application/pdf',
      }))
    );
  });

  async function scopedLegacy(limit: number, afterId?: string) {
    const all = await repository.listLegacy(limit, afterId);
    return all.filter((row) => legacyIds.includes(row.id));
  }

  it('lista legados em ordem de id com paginação por cursor', async () => {
    const page = await repository.listLegacy(1000, legacyIds[0]);
    expect(page.map((row) => row.id)).toEqual(expect.arrayContaining([legacyIds[1], legacyIds[2]]));
    expect(page.map((row) => row.id)).not.toContain(legacyIds[0]);
    expect(await scopedLegacy(1000)).toContainEqual({
      id: legacyIds[0],
      name: `${legacyIds[0]}.pdf`,
      mimeType: 'application/pdf',
      ref: `https://blob.test/${other}/${legacyIds[0]}.pdf`,
    });
  });

  it('cifra a linha uma única vez e a tira da lista de legados', async () => {
    const id = legacyIds[1];
    const data = { name: `${id}.pdf`, mimeType: 'image/png', ref: 'novo-blob' };

    expect(await repository.markEncrypted(id, data)).toBe(true);
    expect(await repository.markEncrypted(id, data)).toBe(false);

    expect((await scopedLegacy(1000)).map((row) => row.id)).not.toContain(id);
    expect(await repository.findById(id, other)).toMatchObject({
      name: `${id}.pdf`,
      ref: 'novo-blob',
      mimeType: 'image/png',
      encVersion: 1,
    });
    expect((await rawRow(id)).ref).not.toContain('novo-blob');
  });
});

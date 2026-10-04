import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@bytebank/core';
import { db } from '@/db';
import { attachments, transactions } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import { DrizzleAttachmentRepository } from './DrizzleAttachmentRepository';

const scope = integrationScope();
const owner = scope.id('owner');
const other = scope.id('other');
const repository = new DrizzleAttachmentRepository(db);

const listed = scope.id('listed');
const uploads = scope.id('uploads');
const empty = scope.id('empty');
const foreign = scope.id('foreign');
const missing = scope.id('missing');

function file(name: string) {
  return { name, size: 2048, mimeType: 'application/pdf', ref: `${owner}/${name}` };
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
  ]);
  await db.insert(attachments).values([
    {
      id: scope.id('older'),
      transactionId: listed,
      url: `${owner}/antigo`,
      name: 'antigo.pdf',
      size: 1,
      mimeType: 'application/pdf',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      id: scope.id('newer'),
      transactionId: listed,
      url: `${owner}/novo`,
      name: 'novo.png',
      size: 2,
      mimeType: 'image/png',
      createdAt: new Date('2026-01-02T10:00:00Z'),
    },
  ]);
});

afterAll(() => scope.cleanup());

describe('DrizzleAttachmentRepository', () => {
  it('cria o anexo na transação do dono guardando a referência do storage', async () => {
    const created = await repository.create(uploads, owner, file('recibo.pdf'));

    expect(created).toEqual({
      id: expect.any(String),
      url: `${owner}/recibo.pdf`,
      ref: `${owner}/recibo.pdf`,
      name: 'recibo.pdf',
      size: 2048,
      mimeType: 'application/pdf',
      transactionId: uploads,
      ownerId: owner,
    });
    expect(await repository.findById(created.id, owner)).toEqual(created);
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

  it('lista os anexos do mais recente para o mais antigo', async () => {
    expect(await repository.list(listed, owner)).toEqual([
      {
        id: scope.id('newer'),
        url: `${owner}/novo`,
        ref: `${owner}/novo`,
        name: 'novo.png',
        size: 2,
        mimeType: 'image/png',
        transactionId: listed,
        ownerId: owner,
      },
      {
        id: scope.id('older'),
        url: `${owner}/antigo`,
        ref: `${owner}/antigo`,
        name: 'antigo.pdf',
        size: 1,
        mimeType: 'application/pdf',
        transactionId: listed,
        ownerId: owner,
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

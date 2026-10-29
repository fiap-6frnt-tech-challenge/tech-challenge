import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { attachments, transactions } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import { DrizzleResourceOwnership } from './DrizzleResourceOwnership';

const scope = integrationScope();
const owner = scope.id('owner');
const transactionId = scope.id('tx');
const attachmentId = scope.id('att');
const ownership = new DrizzleResourceOwnership(db);

beforeAll(async () => {
  await db.insert(transactions).values({
    id: transactionId,
    userId: owner,
    type: 'withdrawal',
    category: 'food',
    amount: 10,
    date: '2026-01-10',
    description: 'Mercado',
  });
  await db.insert(attachments).values({
    id: attachmentId,
    transactionId,
    ref: 'blob-ownership',
    name: 'recibo.pdf',
    size: 2048,
    mimeType: 'application/pdf',
  });
});
afterAll(() => scope.cleanup());

describe('DrizzleResourceOwnership', () => {
  it('finds the owner of a transaction and of an attachment through its transaction', async () => {
    await expect(ownership.ownerOf('transaction', transactionId)).resolves.toBe(owner);
    await expect(ownership.ownerOf('attachment', attachmentId)).resolves.toBe(owner);
  });

  it('returns null for ids that do not exist, without mixing resource kinds', async () => {
    await expect(ownership.ownerOf('transaction', scope.id('missing'))).resolves.toBeNull();
    await expect(ownership.ownerOf('attachment', scope.id('missing'))).resolves.toBeNull();
    await expect(ownership.ownerOf('attachment', transactionId)).resolves.toBeNull();
    await expect(ownership.ownerOf('transaction', attachmentId)).resolves.toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../domain';
import type { AttachmentRecord } from '../types';
import type { AttachmentRepository, FileStorage, TransactionRepository } from '../ports';
import { SequentialIdGenerator } from '../testing';
import { AddAttachment, ListAttachments, RemoveAttachment } from './attachments';

const row: AttachmentRecord = {
  id: 'a1',
  transactionId: 't1',
  ownerId: 'u1',
  name: 'receipt.pdf',
  size: 3,
  mimeType: 'application/pdf',
  ref: 'blob-1',
  url: 'https://files.test/blob-1',
};
const tx = (exists: boolean): TransactionRepository =>
  ({ findById: async () => exists }) as unknown as TransactionRepository;

describe('attachment use cases', () => {
  it('adds a file only to a transaction owned by the actor', async () => {
    const put = vi.fn(async () => ({
      ref: 'blob-1',
      name: 'receipt.pdf',
      size: 3,
      contentType: 'application/pdf',
    }));
    const create = vi.fn(async () => row);
    const result = await new AddAttachment(
      tx(true),
      { create } as unknown as AttachmentRepository,
      { put } as unknown as FileStorage,
      new SequentialIdGenerator()
    ).execute({ userId: 'u1' }, 't1', {
      name: 'receipt.pdf',
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'application/pdf',
    });
    expect(result).toEqual(row);
    expect(put).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith('t1', 'u1', expect.objectContaining({ ref: 'blob-1' }));
  });

  it('rejects an attachment to another user transaction', async () => {
    const useCase = new AddAttachment(
      tx(false),
      {} as AttachmentRepository,
      {} as FileStorage,
      new SequentialIdGenerator()
    );
    await expect(
      useCase.execute({ userId: 'u2' }, 't1', {
        name: 'x',
        bytes: new Uint8Array(),
        contentType: 'text/plain',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lists attachments and reports inaccessible transaction as not found', async () => {
    const repo = { list: vi.fn(async () => [row]) } as unknown as AttachmentRepository;
    await expect(new ListAttachments(repo).execute({ userId: 'u1' }, 't1')).resolves.toEqual([row]);
    const missing = { list: async () => null } as unknown as AttachmentRepository;
    await expect(
      new ListAttachments(missing).execute({ userId: 'u2' }, 't1')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('removes only an attachment owned by the actor', async () => {
    const removeFile = vi.fn(async () => undefined);
    const removeRow = vi.fn(async () => true);
    const repo = {
      findById: async () => row,
      delete: removeRow,
    } as unknown as AttachmentRepository;
    await expect(
      new RemoveAttachment(repo, { delete: removeFile } as unknown as FileStorage).execute(
        { userId: 'u1' },
        'a1'
      )
    ).resolves.toBeUndefined();
    expect(removeFile).toHaveBeenCalledWith('blob-1');
    const missing = { findById: async () => null } as unknown as AttachmentRepository;
    await expect(
      new RemoveAttachment(missing, { delete: removeFile } as unknown as FileStorage).execute(
        { userId: 'u2' },
        'a1'
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

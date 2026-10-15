import { describe, expect, it, vi } from 'vitest';
import type { Attachment, NewTransaction, Transaction } from '@bytebank/core';
import { saveTransactionWithAttachments } from './saveTransactionWithAttachments';
import { UploadSessionEndedError } from '../uploadSession';

const input: NewTransaction = {
  type: 'withdrawal',
  amount: 50,
  date: '2026-10-01',
  description: 'Mercado',
  category: 'food',
};

const created: Transaction = { ...input, id: 'tx-1', userId: 'user-1' };

function file(name: string): File {
  return new File(['conteúdo'], name, { type: 'application/pdf' });
}

function fakeDeps(
  result = {
    succeededFiles: [] as File[],
    failedFiles: [] as File[],
    cancelledFiles: [] as File[],
  },
  reconciled: Attachment[] = []
) {
  return {
    transactions: { create: vi.fn(async () => created) },
    attachments: {
      uploadFiles: vi.fn(async () => result),
      reconcile: vi.fn(async () => reconciled),
    },
  };
}

describe('saveTransactionWithAttachments', () => {
  it('stops the save flow when the session ends during reconciliation', async () => {
    const deps = fakeDeps();
    deps.attachments.reconcile.mockRejectedValueOnce(new UploadSessionEndedError());
    await expect(
      saveTransactionWithAttachments(deps)(input, [file('receipt.pdf')])
    ).rejects.toMatchObject({ name: 'UploadSessionEndedError' });
  });
  it('creates the transaction and uploads every file through the queue', async () => {
    const deps = fakeDeps();
    const files = [file('recibo.pdf'), file('nota.pdf')];

    const result = await saveTransactionWithAttachments(deps)(input, files);

    expect(deps.transactions.create).toHaveBeenCalledWith(input);
    expect(deps.attachments.uploadFiles).toHaveBeenCalledWith('tx-1', files);
    expect(deps.attachments.reconcile).toHaveBeenCalledWith('tx-1');
    expect(result).toEqual({
      transaction: created,
      failedFiles: [],
      cancelledFiles: [],
    });
  });

  it('returns failed and cancelled files for retry', async () => {
    const failed = file('nota.pdf');
    const cancelled = file('extrato.pdf');
    const deps = fakeDeps({
      succeededFiles: [],
      failedFiles: [failed],
      cancelledFiles: [cancelled],
    });

    const result = await saveTransactionWithAttachments(deps)(input, [
      file('recibo.pdf'),
      failed,
      cancelled,
    ]);

    expect(result).toEqual({
      transaction: created,
      failedFiles: [failed],
      cancelledFiles: [cancelled],
    });
  });

  it('does not offer a cancelled file for retry if reconciliation found it on the server', async () => {
    const cancelled = file('late.pdf');
    const deps = fakeDeps({ succeededFiles: [], failedFiles: [], cancelledFiles: [cancelled] }, [
      {
        id: 'late-attachment',
        url: '/attachments/late',
        name: 'late.pdf',
        size: cancelled.size,
        mimeType: 'application/pdf',
      },
    ]);

    const result = await saveTransactionWithAttachments(deps)(input, [cancelled]);

    expect(result.cancelledFiles).toEqual([]);
  });

  it('skips uploads and reconciliation when there are no files', async () => {
    const deps = fakeDeps();

    const result = await saveTransactionWithAttachments(deps)(input, []);

    expect(deps.attachments.uploadFiles).not.toHaveBeenCalled();
    expect(deps.attachments.reconcile).not.toHaveBeenCalled();
    expect(result.failedFiles).toEqual([]);
    expect(result.cancelledFiles).toEqual([]);
  });

  it('does not upload anything when the transaction cannot be created', async () => {
    const deps = fakeDeps();
    deps.transactions.create.mockRejectedValueOnce(new Error('falhou'));

    await expect(saveTransactionWithAttachments(deps)(input, [file('recibo.pdf')])).rejects.toThrow(
      'falhou'
    );
    expect(deps.attachments.uploadFiles).not.toHaveBeenCalled();
  });
});

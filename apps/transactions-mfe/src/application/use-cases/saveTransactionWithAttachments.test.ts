import { describe, expect, it, vi } from 'vitest';
import type { Attachment, NewTransaction, Transaction } from '@bytebank/core';
import { saveTransactionWithAttachments } from './saveTransactionWithAttachments';

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

function attachment(transactionId: string, name: string): Attachment {
  return {
    id: `${transactionId}-${name}`,
    url: `/attachments/${name}`,
    name,
    size: 8,
    mimeType: 'application/pdf',
  };
}

function fakeGateways(failing: string[] = []) {
  const transactions = { create: vi.fn(async () => created) };
  const attachments = {
    upload: vi.fn(async (transactionId: string, upload: File) => {
      if (failing.includes(upload.name)) throw new Error('upload falhou');
      return attachment(transactionId, upload.name);
    }),
  };
  return { transactions, attachments };
}

describe('saveTransactionWithAttachments', () => {
  it('creates the transaction and uploads every file to it', async () => {
    const deps = fakeGateways();
    const files = [file('recibo.pdf'), file('nota.pdf')];

    const result = await saveTransactionWithAttachments(deps)(input, files);

    expect(deps.transactions.create).toHaveBeenCalledWith(input);
    expect(deps.attachments.upload).toHaveBeenCalledTimes(2);
    expect(deps.attachments.upload).toHaveBeenCalledWith('tx-1', files[0]);
    expect(deps.attachments.upload).toHaveBeenCalledWith('tx-1', files[1]);
    expect(result).toEqual({ transaction: created, failedFiles: [] });
  });

  it('returns only the files that failed to upload', async () => {
    const deps = fakeGateways(['nota.pdf']);
    const files = [file('recibo.pdf'), file('nota.pdf'), file('extrato.pdf')];

    const result = await saveTransactionWithAttachments(deps)(input, files);

    expect(result.transaction).toBe(created);
    expect(result.failedFiles).toEqual([files[1]]);
  });

  it('skips uploads when there are no files', async () => {
    const deps = fakeGateways();

    const result = await saveTransactionWithAttachments(deps)(input, []);

    expect(deps.attachments.upload).not.toHaveBeenCalled();
    expect(result.failedFiles).toEqual([]);
  });

  it('does not upload anything when the transaction cannot be created', async () => {
    const deps = fakeGateways();
    deps.transactions.create.mockRejectedValueOnce(new Error('falhou'));

    await expect(saveTransactionWithAttachments(deps)(input, [file('recibo.pdf')])).rejects.toThrow(
      'falhou'
    );
    expect(deps.attachments.upload).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientSessionEndedError } from '@bytebank/stores';
import { useTransactionFlow, type FlowUploadResult } from './useTransactionFlow';

type Draft = { description: string };

const draft: Draft = { description: 'Mercado' };
const file = (name: string) => new File(['conteúdo'], name, { type: 'application/pdf' });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup({ strict = false } = {}) {
  const saves: ReturnType<typeof deferred<{ id: string }>>[] = [];
  const uploads: ReturnType<typeof deferred<FlowUploadResult>>[] = [];
  const progress: ((done: number) => void)[] = [];
  const save = vi.fn<(draft: Draft) => Promise<{ id: string }>>(() => {
    const next = deferred<{ id: string }>();
    saves.push(next);
    return next.promise;
  });
  const uploadAttachments = vi.fn(
    (_id: string, _files: File[], onProgress: (done: number) => void) => {
      const next = deferred<FlowUploadResult>();
      uploads.push(next);
      progress.push(onProgress);
      return next.promise;
    }
  );
  const cancelUploads = vi.fn();
  const onFinish = vi.fn();
  const wrapper = strict
    ? ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
    : undefined;
  const hook = renderHook(
    () => useTransactionFlow<Draft>({ save, uploadAttachments, cancelUploads, onFinish }),
    { wrapper }
  );
  return { ...hook, saves, uploads, progress, save, uploadAttachments, cancelUploads, onFinish };
}

afterEach(() => {
  cleanup();
});

describe('useTransactionFlow', () => {
  it('saves a transaction without attachments and finishes with success', async () => {
    const { result, saves, save, uploadAttachments, onFinish } = setup();

    act(() => result.current.send({ type: 'SUBMIT', draft, files: [] }));
    expect(result.current.state).toEqual({ value: 'confirming', draft, files: [] });
    act(() => result.current.send({ type: 'CONFIRM' }));
    expect(result.current.state.value).toBe('saving');
    expect(save).toHaveBeenCalledWith(draft);

    await act(async () => saves[0].resolve({ id: 'tx-1' }));

    expect(uploadAttachments).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledExactlyOnceWith('success');
    expect(result.current.state).toEqual({ value: 'editing' });
  });

  it('uploads the attachments after saving and reports progress', async () => {
    const { result, saves, uploads, progress, uploadAttachments, onFinish } = setup();
    const files = [file('a.pdf'), file('b.pdf'), file('c.pdf')];

    act(() => {
      result.current.send({ type: 'SUBMIT', draft, files });
      result.current.send({ type: 'CONFIRM' });
    });
    await act(async () => saves[0].resolve({ id: 'tx-1' }));

    expect(uploadAttachments).toHaveBeenCalledExactlyOnceWith('tx-1', files, expect.any(Function));
    expect(result.current.state).toMatchObject({ value: 'uploading', done: 0, total: 3 });
    act(() => progress[0](1));
    expect(result.current.state).toMatchObject({ value: 'uploading', done: 1, total: 3 });

    await act(async () => uploads[0].resolve({ failedFiles: [], cancelledFiles: [] }));

    expect(uploadAttachments).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledExactlyOnceWith('success');
  });

  it('keeps the transaction on partial failure and retries only the failed files', async () => {
    const { result, saves, uploads, uploadAttachments, onFinish } = setup();
    const ok = file('ok.pdf');
    const failed = file('failed.pdf');
    const cancelled = file('cancelled.pdf');

    act(() => {
      result.current.send({ type: 'SUBMIT', draft, files: [ok, failed, cancelled] });
      result.current.send({ type: 'CONFIRM' });
    });
    await act(async () => saves[0].resolve({ id: 'tx-1' }));
    await act(async () =>
      uploads[0].resolve({ failedFiles: [failed], cancelledFiles: [cancelled] })
    );

    expect(result.current.state).toEqual({
      value: 'partialSuccess',
      transactionId: 'tx-1',
      failed: [failed, cancelled],
    });
    expect(onFinish).not.toHaveBeenCalled();

    act(() => result.current.send({ type: 'RETRY_FAILED' }));
    expect(uploadAttachments).toHaveBeenLastCalledWith(
      'tx-1',
      [failed, cancelled],
      expect.any(Function)
    );
    await act(async () => uploads[1].resolve({ failedFiles: [], cancelledFiles: [] }));

    expect(uploadAttachments).toHaveBeenCalledTimes(2);
    expect(onFinish).toHaveBeenCalledExactlyOnceWith('success');
  });

  it('goes to error when saving fails and saves again after retrying', async () => {
    const { result, saves, save, onFinish } = setup();

    act(() => {
      result.current.send({ type: 'SUBMIT', draft, files: [] });
      result.current.send({ type: 'CONFIRM' });
    });
    await act(async () => saves[0].reject(new Error('503')));

    expect(result.current.state).toMatchObject({ value: 'error', draft });
    expect(result.current.state.value === 'error' && result.current.state.reason).toMatch(
      /Tente de novo/
    );

    act(() => result.current.send({ type: 'RETRY' }));
    expect(result.current.state.value).toBe('confirming');
    act(() => result.current.send({ type: 'CONFIRM' }));
    await act(async () => saves[1].resolve({ id: 'tx-1' }));

    expect(save).toHaveBeenCalledTimes(2);
    expect(onFinish).toHaveBeenCalledExactlyOnceWith('success');
  });

  it('saves once when CONFIRM arrives twice', async () => {
    const { result, saves, save } = setup();

    act(() => result.current.send({ type: 'SUBMIT', draft, files: [] }));
    act(() => {
      result.current.send({ type: 'CONFIRM' });
      result.current.send({ type: 'CONFIRM' });
    });
    act(() => result.current.send({ type: 'CONFIRM' }));
    await act(async () => saves[0].resolve({ id: 'tx-1' }));

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('runs each step once under StrictMode', async () => {
    const { result, saves, uploads, save, uploadAttachments, onFinish } = setup({
      strict: true,
    });

    act(() => {
      result.current.send({ type: 'SUBMIT', draft, files: [file('a.pdf')] });
      result.current.send({ type: 'CONFIRM' });
    });
    await act(async () => saves[0].resolve({ id: 'tx-1' }));
    await act(async () => uploads[0].resolve({ failedFiles: [], cancelledFiles: [] }));

    expect(save).toHaveBeenCalledTimes(1);
    expect(uploadAttachments).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('cancels the queue when closing during uploads and explains the partial result', async () => {
    const { result, saves, uploads, cancelUploads, onFinish } = setup();
    const pending = file('pending.pdf');

    act(() => {
      result.current.send({ type: 'SUBMIT', draft, files: [pending] });
      result.current.send({ type: 'CONFIRM' });
    });
    await act(async () => saves[0].resolve({ id: 'tx-1' }));
    act(() => result.current.send({ type: 'CANCEL' }));
    act(() => result.current.send({ type: 'CANCEL' }));

    expect(cancelUploads).toHaveBeenCalledTimes(1);
    expect(result.current.state).toMatchObject({ value: 'uploading', cancelling: true });

    await act(async () => uploads[0].resolve({ failedFiles: [], cancelledFiles: [pending] }));

    expect(result.current.state).toEqual({
      value: 'partialSuccess',
      transactionId: 'tx-1',
      failed: [pending],
    });
    act(() => result.current.send({ type: 'CANCEL' }));
    expect(onFinish).toHaveBeenCalledExactlyOnceWith('closed');
    expect(result.current.state).toEqual({ value: 'editing' });
  });

  it('returns to editing without an error when the session ends while saving', async () => {
    const { result, saves, onFinish } = setup();

    act(() => {
      result.current.send({ type: 'SUBMIT', draft, files: [] });
      result.current.send({ type: 'CONFIRM' });
    });
    await act(async () => saves[0].reject(new ClientSessionEndedError()));

    expect(result.current.state).toEqual({ value: 'editing' });
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('ignores a save that resolves after the flow was reset', async () => {
    const { result, saves, uploadAttachments, onFinish } = setup();

    act(() => {
      result.current.send({ type: 'SUBMIT', draft, files: [file('a.pdf')] });
      result.current.send({ type: 'CONFIRM' });
    });
    act(() => result.current.send({ type: 'RESET' }));
    await act(async () => saves[0].resolve({ id: 'tx-1' }));

    expect(result.current.state).toEqual({ value: 'editing' });
    expect(uploadAttachments).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Observable, Subject } from 'rxjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AttachmentService,
  AttachmentHttpGateway,
  type AttachmentUploadEvent,
} from '@bytebank/api-client';
import {
  cancelPendingUploads,
  createAppStore,
  selectAllUploads,
  selectHasPendingUploads,
  selectOverallUploadProgress,
  invalidateClientSession,
} from '@bytebank/stores';
import { useUploadQueue } from './useUploadQueue';
import { useAttachments } from './useAttachments';

const api = vi.hoisted(() => ({ uploadStream: vi.fn(), reconcileAttachments: vi.fn() }));
vi.mock('@bytebank/api-client', async (original) => ({
  ...(await original<typeof import('@bytebank/api-client')>()),
  useUploadAttachment: () => api,
}));

const transfers = new Map<File, Subject<AttachmentUploadEvent>>();
const started: File[] = [];
const aborted: File[] = [];
const file = (name: string) => new File([new Uint8Array(100)], name, { type: 'application/pdf' });
function setup(strict = false) {
  const { store } = createAppStore();
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {strict ? <StrictMode>{children}</StrictMode> : children}
      </QueryClientProvider>
    </Provider>
  );
  return { store, wrapper };
}
function done(file: File) {
  transfers.get(file)!.next({
    type: 'done',
    attachment: {
      id: file.name,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      url: `/uploads/${file.name}`,
    },
  });
  transfers.get(file)!.complete();
}
beforeEach(() => {
  started.length = 0;
  aborted.length = 0;
  transfers.clear();
  api.reconcileAttachments.mockReset().mockResolvedValue([]);
  api.uploadStream.mockReset().mockImplementation(
    (_transactionId: string, item: File) =>
      new Observable<AttachmentUploadEvent>((subscriber) => {
        started.push(item);
        const events$ = new Subject<AttachmentUploadEvent>();
        transfers.set(item, events$);
        const subscription = events$.subscribe(subscriber);
        return () => {
          aborted.push(item);
          subscription.unsubscribe();
        };
      })
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('normalized upload queue integration', () => {
  it('rejects attachment removal errors from the session that has ended', async () => {
    let reject!: (error: Error) => void;
    vi.spyOn(AttachmentHttpGateway.prototype, 'remove').mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      })
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useAttachments('tx'), { wrapper });
    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.removeAttachment('att').catch((error: unknown) => error);
    });
    await act(async () => {});
    invalidateClientSession();
    act(() => cancelPendingUploads());
    let error: unknown;
    await act(async () => {
      reject(new Error('Late remove failure'));
      error = await outcome;
    });
    expect(error).toMatchObject({ name: 'ClientSessionEndedError' });
  });
  it('stores serializable metadata and derives progress from the shared state', async () => {
    const { store, wrapper } = setup(true);
    const { result } = renderHook(() => useUploadQueue(), { wrapper });
    const files = [file('a.pdf'), file('b.pdf'), file('c.pdf')];
    let batch!: ReturnType<typeof result.current.uploadFiles>;
    act(() => {
      batch = result.current.uploadFiles('tx', files);
    });
    expect(
      selectAllUploads(store.getState()).map(({ fileName, status }) => ({ fileName, status }))
    ).toEqual([
      { fileName: 'a.pdf', status: 'uploading' },
      { fileName: 'b.pdf', status: 'uploading' },
      { fileName: 'c.pdf', status: 'queued' },
    ]);
    expect(selectAllUploads(store.getState()).every((item) => !('file' in item))).toBe(true);
    act(() => transfers.get(files[0])!.next({ type: 'progress', loaded: 40, total: 100 }));
    expect(result.current.uploads[0].progress).toBe(40);
    expect(selectOverallUploadProgress(store.getState())).toBe(0.2);
    act(() => done(files[0]));
    expect(started).toEqual(files);
    act(() => {
      done(files[1]);
      done(files[2]);
    });
    expect((await batch).succeededFiles).toEqual(files);
    expect(selectHasPendingUploads(store.getState())).toBe(false);
    act(() => result.current.resetUploads());
    expect(selectAllUploads(store.getState())).toEqual([]);
  });

  it('tracks failure, retry and per-file cancellation without serializing errors', async () => {
    const { store, wrapper } = setup();
    const { result } = renderHook(() => useUploadQueue(), { wrapper });
    const item = file('failed.pdf');
    let batch!: ReturnType<typeof result.current.uploadFiles>;
    act(() => {
      batch = result.current.uploadFiles('tx', [item]);
    });
    act(() => transfers.get(item)!.error(new Error('Invalid file')));
    expect((await batch).failedFiles).toEqual([item]);
    const [metadata] = selectAllUploads(store.getState());
    expect(metadata).toMatchObject({ status: 'failed', error: 'Invalid file' });
    act(() => {
      batch = result.current.retryUpload(metadata.id, 'tx');
    });
    expect(selectHasPendingUploads(store.getState())).toBe(true);
    act(() => result.current.cancelUpload(metadata.id));
    expect((await batch).cancelledFiles).toEqual([item]);
    expect(selectAllUploads(store.getState())[0].status).toBe('cancelled');
    act(() => result.current.markAlreadyUploaded([item]));
    expect(selectAllUploads(store.getState())[0].status).toBe('done');
  });

  it('uses distinct IDs across concurrent queue instances and clears only owned entries', async () => {
    const { store, wrapper } = setup();
    const { result } = renderHook(() => ({ first: useUploadQueue(), second: useUploadQueue() }), {
      wrapper,
    });
    const a = file('same.pdf');
    const b = file('same.pdf');
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.first.uploadFiles('tx-a', [a]);
      second = result.current.second.uploadFiles('tx-b', [b]);
    });
    expect(new Set(selectAllUploads(store.getState()).map((item) => item.id)).size).toBe(2);
    act(() => {
      done(a);
      done(b);
    });
    await Promise.all([first, second]);
    act(() => result.current.first.resetUploads());
    expect(selectAllUploads(store.getState()).map((item) => item.transactionId)).toEqual(['tx-b']);
  });

  it('cancels active and queued work on session end without starting queued transfers', async () => {
    const { store, wrapper } = setup();
    const { result } = renderHook(() => useUploadQueue(), { wrapper });
    const files = [file('a.pdf'), file('b.pdf'), file('c.pdf')];
    let batch!: ReturnType<typeof result.current.uploadFiles>;
    act(() => {
      batch = result.current.uploadFiles('tx', files);
    });
    const rejected = expect(batch).rejects.toMatchObject({ name: 'UploadSessionEndedError' });
    act(() => cancelPendingUploads());
    await rejected;
    expect(started).toEqual(files.slice(0, 2));
    expect(aborted).toEqual(files.slice(0, 2));
    expect(selectAllUploads(store.getState())).toEqual([]);
    expect(result.current.uploads).toEqual([]);
  });

  it('discards reconciliation that finishes after session cancellation', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useUploadQueue(), { wrapper });
    let release!: (value: never[]) => void;
    api.reconcileAttachments.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const promise = result.current.reconcile('tx');
    const rejected = expect(promise).rejects.toMatchObject({ name: 'UploadSessionEndedError' });
    act(() => cancelPendingUploads());
    release([]);
    await rejected;
  });

  it('does not restore attachments when the session ends while reconciling a finished batch', async () => {
    const { wrapper } = setup();
    let release!: (value: never[]) => void;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    api.reconcileAttachments.mockReturnValue(pending);
    vi.spyOn(AttachmentService, 'list').mockReturnValue(pending as Promise<never[]>);
    const { result } = renderHook(() => useAttachments('tx'), { wrapper });
    const item = file('receipt.pdf');
    let batch!: ReturnType<typeof result.current.uploadFiles>;
    act(() => {
      batch = result.current.uploadFiles([item]);
    });
    await act(async () => {
      done(item);
    });
    const rejected = expect(batch).rejects.toMatchObject({ name: 'UploadSessionEndedError' });
    act(() => cancelPendingUploads());
    await act(async () => {
      release([]);
      await rejected;
    });
    expect(result.current.uploadedAttachments).toEqual([]);
  });
});

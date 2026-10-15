import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { QueryClient } from '@tanstack/react-query';
import type { DomainEvent } from '@bytebank/core';
import {
  createAppStore,
  logout,
  notificationAdded,
  selectAllNotifications,
  setSession,
  uploadQueued,
  uploadFailed,
  uploadCancelled,
} from '@bytebank/stores';
import { registerEventBridges } from './eventBridges';
import { registerClientListeners, registerPendingUploadWarning } from './clientListeners';

const transaction = {
  id: 'tx',
  userId: 'u1',
  type: 'withdrawal' as const,
  category: 'food',
  amount: 24,
  date: '2026-10-15',
  description: 'Lunch',
};
const metadata = {
  id: 'upload',
  transactionId: 'tx',
  fileName: 'receipt.pdf',
  loaded: 0,
  total: 100,
  status: 'queued' as const,
};

describe('domain event bridge', () => {
  it('creates one notification per event after mount-cleanup-mount and stops after cleanup', () => {
    const { store } = createAppStore();
    const events$ = new Subject<DomainEvent>();
    store.dispatch(setSession({ id: 'u1', name: 'Name', email: 'email@example.com' }));
    registerEventBridges(store, events$)();
    const stop = registerEventBridges(store, events$);
    events$.next({ type: 'transaction.created', version: 1, transaction });
    expect(selectAllNotifications(store.getState())).toMatchObject([
      { type: 'success', title: 'Transação adicionada!' },
    ]);
    stop();
    events$.next({ type: 'transaction.deleted', version: 1, id: 'tx' });
    expect(selectAllNotifications(store.getState())).toHaveLength(1);
  });

  it('ignores mutation events that arrive after client state is reset', () => {
    const { store, startListening } = createAppStore();
    const events$ = new Subject<DomainEvent>();
    store.dispatch(setSession({ id: 'u1', name: 'Name', email: 'email@example.com' }));
    const stopBridge = registerEventBridges(store, events$);
    const stopListeners = registerClientListeners({
      startListening,
      queryClient: new QueryClient(),
      cancelUploads: () => undefined,
    });
    store.dispatch(logout.pending('request'));
    events$.next({ type: 'transaction.created', version: 1, transaction });
    expect(selectAllNotifications(store.getState())).toEqual([]);
    stopBridge();
    stopListeners();
  });

  it('maps transaction update/delete and attachment success events', () => {
    const { store } = createAppStore();
    const events$ = new Subject<DomainEvent>();
    store.dispatch(setSession({ id: 'u1', name: 'Name', email: 'email@example.com' }));
    const stop = registerEventBridges(store, events$);
    events$.next({ type: 'transaction.updated', version: 1, transaction });
    events$.next({ type: 'transaction.deleted', version: 1, id: 'tx' });
    events$.next({ type: 'attachment.added', version: 1, transactionId: 'tx', attachmentId: 'a1' });
    events$.next({
      type: 'attachment.removed',
      version: 1,
      transactionId: 'tx',
      attachmentId: 'a1',
    });
    expect(selectAllNotifications(store.getState()).map((item) => item.title)).toEqual([
      'Transação atualizada',
      'Transação excluída',
      'Anexo enviado',
      'Anexo removido',
    ]);
    stop();
  });
});

describe('client listener composition', () => {
  it('warns before leaving only while a queued or active upload exists and removes its handler', () => {
    const { store } = createAppStore();
    const target = new EventTarget();
    const stop = registerPendingUploadWarning(store, target);
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);
    store.dispatch(uploadQueued(metadata));
    expect(unload()).toBe(true);
    store.dispatch(uploadCancelled('upload'));
    expect(unload()).toBe(false);
    store.dispatch(uploadQueued(metadata));
    stop();
    expect(unload()).toBe(false);
  });
  it('cancels transfers and empties Redux and TanStack as soon as logout starts', () => {
    const { store, startListening } = createAppStore();
    const queryClient = new QueryClient();
    queryClient.setQueryData(['transactions'], [{ id: 'private' }]);
    queryClient.getMutationCache().build(queryClient, { mutationKey: ['private'] });
    store.dispatch(setSession({ id: 'u1', name: 'Name', email: 'email@example.com' }));
    store.dispatch(notificationAdded({ type: 'success', title: 'Private feedback' }));
    store.dispatch(uploadQueued(metadata));
    let cancelled = false;
    const stop = registerClientListeners({
      startListening,
      queryClient,
      cancelUploads: () => {
        cancelled = true;
        store.dispatch(uploadCancelled('upload'));
      },
    });
    store.dispatch(logout.pending('request'));
    expect(cancelled).toBe(true);
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(queryClient.getMutationCache().getAll()).toEqual([]);
    expect(store.getState()).toEqual(createAppStore().store.getState());
    stop();
  });

  it('notifies each real upload failure once and tears down listeners', () => {
    const { store, startListening } = createAppStore();
    const stop = registerClientListeners({
      startListening,
      queryClient: new QueryClient(),
      cancelUploads: () => undefined,
    });
    store.dispatch(uploadFailed({ id: 'missing', message: 'Ignored' }));
    expect(selectAllNotifications(store.getState())).toEqual([]);
    store.dispatch(uploadQueued(metadata));
    store.dispatch(uploadFailed({ id: 'upload', message: 'Network failed' }));
    store.dispatch(uploadFailed({ id: 'upload', message: 'Duplicate' }));
    expect(selectAllNotifications(store.getState())).toMatchObject([
      { type: 'error', message: 'Network failed' },
    ]);
    stop();
    store.dispatch(uploadQueued(metadata));
    store.dispatch(uploadFailed({ id: 'upload', message: 'After cleanup' }));
    expect(selectAllNotifications(store.getState())).toHaveLength(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  notificationAdded,
  notificationDismissed,
  selectAllNotifications,
  selectOldestNotification,
} from './notificationsSlice';
import {
  uploadQueued,
  uploadStarted,
  uploadProgress,
  uploadCompleted,
  uploadFailed,
  uploadCancelled,
  uploadsRemoved,
  selectAllUploads,
  selectActiveUploads,
  selectHasPendingUploads,
  selectOverallUploadProgress,
} from './uploadsSlice';
import { createAppStore, resetClientState } from './store';
import { showFeedback, hideFeedback, selectFeedback, setFilterPanelOpen } from './uiSlice';
import { setSession } from './authSlice';

const queued = (id: string, total = 100) => ({
  id,
  transactionId: 'tx-1',
  fileName: `${id}.pdf`,
  loaded: 0,
  total,
  status: 'queued' as const,
});

describe('normalized notifications', () => {
  it('keeps FIFO notifications and dismisses only the visible one through legacy aliases', () => {
    const { store } = createAppStore();
    const first = showFeedback({ type: 'success', title: 'Created' });
    const second = notificationAdded({ type: 'error', title: 'Upload failed' });
    store.dispatch(first);
    store.dispatch(second);
    expect(store.getState().notifications.ids).toEqual([first.payload.id, second.payload.id]);
    expect(selectFeedback(store.getState())?.title).toBe('Created');
    store.dispatch(hideFeedback());
    expect(selectOldestNotification(store.getState())?.title).toBe('Upload failed');
    store.dispatch(notificationDismissed(second.payload.id));
    expect(selectFeedback(store.getState())).toBeNull();
  });

  it('does not lose notifications sharing a timestamp and preserves selector identity', () => {
    const { store } = createAppStore();
    store.dispatch({
      type: notificationAdded.type,
      payload: { id: 'a', createdAt: 10, type: 'info', title: 'A' },
    });
    store.dispatch({
      type: notificationAdded.type,
      payload: { id: 'b', createdAt: 10, type: 'info', title: 'B' },
    });
    const all = selectAllNotifications(store.getState());
    store.dispatch(setFilterPanelOpen(true));
    expect(selectAllNotifications(store.getState())).toBe(all);
    expect(all.map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('normalized uploads', () => {
  it('tracks queued, progress and terminal metadata without discarding other transfers', () => {
    const { store } = createAppStore();
    store.dispatch(uploadQueued(queued('one')));
    store.dispatch(uploadQueued(queued('two')));
    expect(selectHasPendingUploads(store.getState())).toBe(true);
    expect(selectActiveUploads(store.getState())).toEqual([]);
    store.dispatch(uploadStarted('one'));
    store.dispatch(uploadProgress({ id: 'one', loaded: 40, total: 100 }));
    expect(selectOverallUploadProgress(store.getState())).toBe(0.4);
    store.dispatch(uploadCompleted('one'));
    store.dispatch(uploadFailed({ id: 'two', message: 'Unavailable' }));
    expect(selectHasPendingUploads(store.getState())).toBe(false);
    expect(selectOverallUploadProgress(store.getState())).toBeNull();
    expect(selectAllUploads(store.getState()).map(({ status }) => status)).toEqual([
      'done',
      'failed',
    ]);
    store.dispatch(uploadQueued(queued('two')));
    store.dispatch(uploadCancelled('two'));
    store.dispatch(uploadsRemoved(['one']));
    expect(selectAllUploads(store.getState()).map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'two', status: 'cancelled' },
    ]);
  });

  it('computes weighted progress for active transfers and safely handles empty totals', () => {
    const { store } = createAppStore();
    store.dispatch(uploadQueued(queued('one', 100)));
    store.dispatch(uploadQueued(queued('two', 300)));
    store.dispatch(uploadStarted('one'));
    store.dispatch(uploadStarted('two'));
    store.dispatch(uploadProgress({ id: 'one', loaded: 50, total: 100 }));
    store.dispatch(uploadProgress({ id: 'two', loaded: 150, total: 300 }));
    expect(selectOverallUploadProgress(store.getState())).toBe(0.5);
    store.dispatch(uploadProgress({ id: 'one', loaded: 200, total: 100 }));
    expect(selectOverallUploadProgress(store.getState())).toBe(0.625);
    store.dispatch(uploadCompleted('one'));
    store.dispatch(uploadCancelled('two'));
    store.dispatch(uploadQueued(queued('empty', 0)));
    store.dispatch(uploadStarted('empty'));
    expect(selectOverallUploadProgress(store.getState())).toBeNull();
  });

  it('memoizes derived arrays when unrelated state changes and ignores late events for removed jobs', () => {
    const { store } = createAppStore();
    store.dispatch(uploadQueued(queued('one')));
    store.dispatch(uploadStarted('one'));
    const all = selectAllUploads(store.getState());
    const active = selectActiveUploads(store.getState());
    store.dispatch(showFeedback({ type: 'info', title: 'Hello' }));
    expect(selectAllUploads(store.getState())).toBe(all);
    expect(selectActiveUploads(store.getState())).toBe(active);
    store.dispatch(uploadsRemoved(['one']));
    store.dispatch(uploadProgress({ id: 'one', loaded: 50, total: 100 }));
    expect(selectAllUploads(store.getState())).toEqual([]);
  });
});

it('resets every client slice and keeps independent store instances isolated', () => {
  const { store } = createAppStore();
  const clean = createAppStore().store.getState();
  store.dispatch(setSession({ id: 'u1', name: 'Test', email: 'test@example.com' }));
  store.dispatch(setFilterPanelOpen(true));
  store.dispatch(showFeedback({ type: 'success', title: 'Saved' }));
  store.dispatch(uploadQueued(queued('one')));
  store.dispatch(resetClientState());
  expect(store.getState()).toEqual(clean);
});

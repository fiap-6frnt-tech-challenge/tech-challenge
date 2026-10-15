# @bytebank/stores

Shared **Redux Toolkit** slices, store and typed hooks for apps in the Bytebank monorepo.

## Usage

```ts
import {
  useAppDispatch,
  useAppSelector,
  setSession,
  selectUser,
  showFeedback,
  selectFeedback,
} from '@bytebank/stores';

const user = useAppSelector(selectUser);
const feedback = useAppSelector(selectFeedback);

const dispatch = useAppDispatch();
dispatch(showFeedback({ type: 'success', title: 'Pronto', message: 'Salvo com sucesso' }));
```

The package exports the configured singleton; the shell wraps the app in `<Provider store={store}>`.
MFEs consume the same store as a shared singleton via Module Federation
(`@reduxjs/toolkit`/`react-redux` must be `singleton: true`).

## Exports

- `authSlice` — `setSession`, `clearSession`, `logout` (thunk), selectors `selectUser` / `selectIsAuthenticated`.
- `uiSlice` — filter-panel actions and selector. `showFeedback`, `hideFeedback` and `selectFeedback` remain compatible aliases for the notification queue.
- `notificationsSlice` — normalized FIFO notifications, `notificationAdded`, `notificationDismissed(id?)`, `selectAllNotifications` and `selectOldestNotification`.
- `uploadsSlice` — normalized upload metadata and lifecycle actions; memoized `selectActiveUploads`, `selectHasPendingUploads` and weighted `selectOverallUploadProgress`.
- `store` — singleton `store` / `startListening`, isolated `createAppStore()`, `resetClientState`, and `RootState` / `AppStore` / `AppDispatch` / `AppStartListening` types. DevTools is disabled in production.
- `hooks` — typed `useAppDispatch`, `useAppSelector` and `useAppStore`.
- `uploadCancellation` — external callback registry for cancelling queues; callbacks and Files never enter Redux.
- `clientSession` — `invalidateClientSession`, `createClientSessionGuard` and `ClientSessionEndedError` for rejecting work started in an ended client session.
- `events/domainEvents` — shared RxJS domain event bus; the shell bridges successful operations to notifications.

## State ownership and logout

Redux contains client state only: authentication, filters, notifications and serializable upload metadata (`ids` / `entities`). Server data remains in TanStack Query. Files and RxJS subscriptions remain in the upload hook.

The shell registers listeners and the event bridge in `ClientEffects`, with cleanup on unmount. `logout.pending` and `clearSession` invalidate the client session, cancel active and queued uploads, clear the QueryClient, then reset every Redux slice. API mutations use session guards to prevent late success events, optimistic rollbacks or UI feedback from restoring data after logout. Session guards suppress stale results; they do not undo a request already accepted by the server.

The shell unmounts private content when authentication is cleared so query observers cannot fetch data again while logout redirects to the login page.

Notifications are shown oldest first. Dismissing one reveals the next; successful upload notifications wait until pending transfers finish. The shell also warns before closing a tab while uploads are queued or active.

## Scripts

```bash
npm run test -w @bytebank/stores
npm run build -w @bytebank/stores
```

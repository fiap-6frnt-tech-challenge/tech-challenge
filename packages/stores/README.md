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

The shell instantiates the store (`configureStore`) and wraps the app in `<Provider store={store}>`.
MFEs consume the same store as a shared singleton via Module Federation
(`@reduxjs/toolkit`/`react-redux` must be `singleton: true`).

## Exports

- `authSlice` — `setSession`, `clearSession`, `logout` (thunk), selectors `selectUser` / `selectIsAuthenticated`.
- `uiSlice` — `setFilterPanelOpen`, `toggleFilterPanel`, `showFeedback`, `hideFeedback`, selectors `selectFilterPanelOpen` / `selectFeedback`.
- `store` — configured root store plus `RootState` / `AppDispatch` types.
- `hooks` — typed `useAppDispatch` / `useAppSelector`.

## Scripts

```bash
npm run test -w @bytebank/stores   # Vitest (reducers as pure functions)
npm run build -w @bytebank/stores  # tsc type-check
```

See conventions in `docs/phase-2/state-conventions.md`.

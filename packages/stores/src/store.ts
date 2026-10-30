import {
  combineReducers,
  configureStore,
  createAction,
  createListenerMiddleware,
  type UnknownAction,
} from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import notificationsReducer from './notificationsSlice';
import uploadsReducer from './uploadsSlice';

const combinedReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  notifications: notificationsReducer,
  uploads: uploadsReducer,
});
export type RootState = ReturnType<typeof combinedReducer>;
export const resetClientState = createAction('client/resetClientState');
const rootReducer = (state: RootState | undefined, action: UnknownAction): RootState => {
  if (!resetClientState.match(action)) return combinedReducer(state, action);
  const reset = combinedReducer(undefined, action);
  return state?.auth.sessionEnded
    ? { ...reset, auth: { ...reset.auth, sessionEnded: true } }
    : reset;
};

export function createAppStore() {
  const listeners = createListenerMiddleware<RootState>();
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listeners.middleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
  return { store, startListening: listeners.startListening };
}

export const { store, startListening } = createAppStore();
export type AppStore = typeof store;
export type AppStartListening = typeof startListening;
export type AppDispatch = typeof store.dispatch;

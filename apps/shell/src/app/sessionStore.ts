import type { Session } from 'next-auth';
import {
  createAppStore,
  setSession,
  store,
  type AppStore,
  type UserSession,
} from '@bytebank/stores';

export function toUserSession(user: Session['user'] | undefined): UserSession | null {
  if (!user) return null;
  return {
    id: user.id ?? '',
    name: user.name ?? '',
    email: user.email ?? '',
    image: user.image ?? undefined,
  };
}

export function isSameUser(a: UserSession | null, b: UserSession | null): boolean {
  return a?.id === b?.id && a?.name === b?.name && a?.email === b?.email && a?.image === b?.image;
}

let seeded = false;

export function storeForSession(session: Session | null): AppStore {
  const user = toUserSession(session?.user);
  if (typeof window === 'undefined') {
    const requestStore = createAppStore().store;
    if (user) requestStore.dispatch(setSession(user));
    return requestStore;
  }
  if (!seeded) {
    seeded = true;
    if (user) store.dispatch(setSession(user));
  }
  return store;
}

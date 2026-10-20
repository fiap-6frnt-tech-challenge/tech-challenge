import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { signOut } from 'next-auth/react';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  logoutError?: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

const LOGOUT_FAILED = 'Não foi possível confirmar o encerramento da sessão.';
const SIGN_OUT_ATTEMPTS = 3;

async function hasActiveSession(): Promise<boolean> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!response.ok) return false;
  const session = (await response.json()) as { user?: unknown } | null;
  return Boolean(session?.user);
}

let logoutInFlight = false;
export const isClientLogoutInProgress = () => logoutInFlight;
export const logout = createAsyncThunk(
  'auth/logout',
  async (reason?: 'expired' | 'idle') => {
    logoutInFlight = true;
    const callbackUrl =
      reason === 'expired'
        ? '/login?reason=session-expired'
        : reason === 'idle'
          ? '/login?reason=inactive'
          : '/login';
    try {
      const response = await fetch('/api/auth/sessions/current/revoke', { method: 'POST' });
      if (!response.ok) throw new Error(LOGOUT_FAILED);
      for (let attempt = 1; ; attempt += 1) {
        await signOut({ redirect: false });
        if (!(await hasActiveSession())) break;
        if (attempt === SIGN_OUT_ATTEMPTS) throw new Error(LOGOUT_FAILED);
      }
      window.location.assign(callbackUrl);
    } finally {
      logoutInFlight = false;
    }
  },
  { condition: () => !logoutInFlight }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<UserSession | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      delete state.logoutError;
    },
    clearSession: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout.rejected, (state) => {
      state.logoutError = true;
    });
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      delete state.logoutError;
    });
  },
});

export const { setSession, clearSession } = authSlice.actions;

export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;

export default authSlice.reducer;

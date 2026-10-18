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
      if (!response.ok) throw new Error('Não foi possível confirmar o encerramento da sessão.');
      await signOut({ callbackUrl });
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

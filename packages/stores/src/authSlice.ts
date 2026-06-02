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
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut({ callbackUrl: '/login' });
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<UserSession | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearSession: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });
  },
});

export const { setSession, clearSession } = authSlice.actions;

export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;

export default authSlice.reducer;

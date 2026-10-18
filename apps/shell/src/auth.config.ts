import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { validSessionClaims } from '@bytebank/core/application';

type GoogleAuthEnv = Record<string, string | undefined>;

export function isGoogleAuthConfigured(env: GoogleAuthEnv = process.env) {
  return Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
}

export const isGoogleAuthEnabled = isGoogleAuthConfigured();

export const authConfig = {
  providers: [
    ...(isGoogleAuthEnabled
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
    updateAge: 15 * 60,
  },
  callbacks: {
    async jwt({ token }) {
      return validSessionClaims(token, Date.now()) ? token : null;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

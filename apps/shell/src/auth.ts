import NextAuth, { CredentialsSignin } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getToken } from 'next-auth/jwt';
import { RateLimitedError, TurnstileRequiredError } from '@bytebank/core';
import { authConfig } from './auth.config';
import { container } from '@/server/container';
import { getClientIp } from '@/server/http/clientIp';

class RateLimitedSignin extends CredentialsSignin {
  code = 'rate_limited';
}

class TurnstileRequiredSignin extends CredentialsSignin {
  code = 'turnstile_required';
}

export async function revokeCurrentRequestSession(req: Request): Promise<void> {
  const secureCookie = new URL(process.env.AUTH_URL ?? req.url).protocol === 'https:';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });
  // A missing/expired cookie is already unusable; the sign-out flow still clears it.
  if (token) await container.sessionLifecycle.revokeCurrent(token);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return true;
      if (profile?.email_verified !== true || !user.email) return false;
      const local = await container.resolveOAuthUser.execute(user);
      user.id = local.id;
      return true;
    },
    async jwt({ token, user }) {
      const claims = user?.id
        ? await container.sessionLifecycle.start(user.id)
        : await container.sessionLifecycle.validate(token);
      return claims ? { ...token, ...claims } : null;
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message) await container.sessionLifecycle.revokeCurrent(message.token);
    },
  },
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
        turnstileToken: { label: 'Turnstile token', type: 'text' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        let user: Awaited<ReturnType<typeof container.authenticateUser.execute>> = null;

        try {
          user = await container.authenticateUser.execute(
            credentials.email as string,
            credentials.password as string,
            getClientIp(request.headers),
            typeof credentials.turnstileToken === 'string' ? credentials.turnstileToken : undefined
          );
        } catch (error) {
          if (error instanceof RateLimitedError) throw new RateLimitedSignin();
          if (error instanceof TurnstileRequiredError) throw new TurnstileRequiredSignin();
          console.error('[auth] Falha ao verificar credenciais no banco:', error);
        }

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? undefined,
          };
        }

        return null;
      },
    }),
  ],
});

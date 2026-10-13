import NextAuth, { CredentialsSignin } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { container } from '@/server/container';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user: Awaited<ReturnType<typeof container.authenticateUser.execute>> = null;

        try {
          user = await container.authenticateUser.execute(
            credentials.email as string,
            credentials.password as string
          );
        } catch (error) {
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

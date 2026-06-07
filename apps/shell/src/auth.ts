import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { verifyCredentials } from '@/db/users';

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

        const user = await verifyCredentials(
          credentials.email as string,
          credentials.password as string
        );
        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? undefined,
          };
        }

        if (process.env.NODE_ENV !== 'production' && credentials.password === 'senha123') {
          return {
            id: 'joana', // Garantindo o userId igual ao do seed das transações
            name: 'Joana da Silva',
            email: credentials.email as string,
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          };
        }
        return null;
      },
    }),
  ],
});

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button, ErrorState } from '@bytebank/design-system';

function getAuthErrorMessage(error: string | null) {
  if (error === 'CredentialsSignin') {
    return 'Usuário ou senha inválidos. Por favor, verifique suas credenciais.';
  }

  if (error === 'OAuthSignin' || error === 'OAuthCallback') {
    return 'Não foi possível completar o login com sua conta do Google.';
  }

  return 'Ocorreu um erro desconhecido durante a autenticação.';
}

export function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = getAuthErrorMessage(searchParams.get('error'));

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-md py-xl">
      <section className="w-full max-w-[28rem] rounded-md border border-border bg-surface p-xl shadow-sm">
        <ErrorState
          title="Falha na autenticação"
          description={errorMessage}
          action={<Button onClick={() => router.push('/login')}>Voltar para o login</Button>}
          className="border-0 bg-transparent p-0 shadow-none"
        />
      </section>
    </main>
  );
}

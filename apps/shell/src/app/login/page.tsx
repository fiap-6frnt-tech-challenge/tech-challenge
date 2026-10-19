import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import { isGoogleAuthEnabled } from '../../auth.config';
import { container } from '@/server/container';
import { loginWithGoogleAction } from './actions';
import { LoginPageClient } from './LoginPageClient';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const session = await auth();

  if (session?.user?.id) {
    redirect('/');
  }
  const { reason } = await searchParams;

  return (
    <LoginPageClient
      sessionNotice={
        reason === 'session-expired'
          ? 'Sua sessão expirou. Entre novamente.'
          : reason === 'inactive'
            ? 'Sua sessão foi encerrada por inatividade.'
            : undefined
      }
      isGoogleAuthEnabled={isGoogleAuthEnabled}
      turnstileSiteKey={container.turnstileVerifier.siteKey}
      loginWithGoogleAction={loginWithGoogleAction}
    />
  );
}

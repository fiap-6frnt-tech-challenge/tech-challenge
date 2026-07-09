import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import { isGoogleAuthEnabled } from '../../auth.config';
import { loginWithGoogleAction } from './actions';
import { LoginPageClient } from './LoginPageClient';

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  return (
    <LoginPageClient
      isGoogleAuthEnabled={isGoogleAuthEnabled}
      loginWithGoogleAction={loginWithGoogleAction}
    />
  );
}

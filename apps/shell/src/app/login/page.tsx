import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import { loginWithCredentialsAction, loginWithGoogleAction } from './actions';
import { LoginPageClient } from './LoginPageClient';

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  return (
    <LoginPageClient
      loginWithCredentialsAction={loginWithCredentialsAction}
      loginWithGoogleAction={loginWithGoogleAction}
    />
  );
}

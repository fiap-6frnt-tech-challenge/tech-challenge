import { redirect } from 'next/navigation';
import { currentSession } from '@/server/session';
import { RegisterPageClient } from './RegisterPageClient';

export default async function RegisterPage() {
  const session = await currentSession();

  if (session) {
    redirect('/');
  }

  return <RegisterPageClient />;
}

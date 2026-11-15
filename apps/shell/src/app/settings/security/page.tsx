import { redirect } from 'next/navigation';
import { container } from '@/server/container';
import { currentSession } from '@/server/session';
import { SecuritySettings } from './SecuritySettings';
export default async function SecurityPage() {
  const session = await currentSession();
  if (!session?.user?.id) redirect('/login');
  const status = await container.mfa.status(session.user.id);
  return (
    <div className="flex w-full flex-col gap-lg">
      <h1 className="heading">Segurança da conta</h1>
      <SecuritySettings initialStatus={status} />
    </div>
  );
}

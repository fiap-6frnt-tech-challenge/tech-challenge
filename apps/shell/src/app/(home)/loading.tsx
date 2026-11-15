import { AccountOverviewSkeleton } from '@/components/AccountOverviewRemote';

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-xl">
      <AccountOverviewSkeleton />
    </div>
  );
}

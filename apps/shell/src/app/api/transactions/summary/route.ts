import { container } from '@/server/container';
import { route } from '@/server/http/route';

export const GET = route(({ actor, req }) => {
  const { searchParams } = new URL(req.url);
  return container.getTransactionsSummary.execute(actor, {
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });
});

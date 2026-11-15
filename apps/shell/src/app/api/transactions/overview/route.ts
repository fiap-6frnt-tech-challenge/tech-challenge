import { container } from '@/server/container';
import { route } from '@/server/http/route';

export const GET = route(({ actor }) => container.getAccountOverview.execute(actor), {
  version: ({ actor }) => container.getTransactionsVersion.execute(actor),
});

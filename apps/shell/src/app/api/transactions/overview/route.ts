import { container } from '@/server/container';
import { route } from '@/server/http/route';

export const GET = route(({ actor }) => container.getAccountOverview.execute(actor));

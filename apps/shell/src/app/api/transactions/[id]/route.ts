import { container } from '@/server/container';
import { route } from '@/server/http/route';
import { readJson } from '../../read-json';

type Params = { id: string };

export const GET = route<Params>(({ actor, params }) =>
  container.getTransaction.execute(actor, params.id)
);

export const PATCH = route<Params>(async ({ actor, req, params }) =>
  container.updateTransaction.execute(actor, params.id, await readJson(req))
);

export const DELETE = route<Params>(async ({ actor, params }) => {
  await container.deleteTransaction.execute(actor, params.id);
});

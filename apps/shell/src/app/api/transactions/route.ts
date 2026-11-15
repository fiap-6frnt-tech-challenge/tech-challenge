import { fromSearchParams } from '@bytebank/core';
import { container } from '@/server/container';
import { route } from '@/server/http/route';
import { publicTransactionsPage } from '@/server/http/transactionsPage';
import { readJson } from '../read-json';

export const GET = route(
  async ({ actor, req }) => {
    const { filter, page } = fromSearchParams(req.nextUrl.searchParams);
    return publicTransactionsPage(await container.listTransactions.execute(actor, filter, page));
  },
  { version: ({ actor }) => container.getTransactionsVersion.execute(actor) }
);

export const POST = route(
  async ({ actor, req }) => container.createTransaction.execute(actor, await readJson(req)),
  { status: 201 }
);

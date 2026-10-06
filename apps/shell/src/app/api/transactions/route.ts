import { fromSearchParams } from '@bytebank/core';
import { container } from '@/server/container';
import { route } from '@/server/http/route';
import { readJson } from '../read-json';

export const GET = route(async ({ actor, req }) => {
  const { searchParams } = req.nextUrl;
  const { filter, page } = fromSearchParams(searchParams);
  if (!searchParams.has('_page')) return container.getAllTransactions.execute(actor);

  const result = await container.listTransactions.execute(actor, filter, page);
  return { data: result.items, pages: result.totalPages, items: result.total };
});

export const POST = route(
  async ({ actor, req }) => container.createTransaction.execute(actor, await readJson(req)),
  { status: 201 }
);

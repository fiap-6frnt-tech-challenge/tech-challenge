import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTransactionSchema, listTransactionsQuerySchema } from '@bytebank/shared';
import { auth } from '@/auth';
import * as store from './store';
import { JsonRequestError, readJson } from '../read-json';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = req.nextUrl;

  const rawQuery: Record<string, unknown> = Object.fromEntries(searchParams);
  if (searchParams.has('category')) rawQuery.category = searchParams.getAll('category');
  const parsed = listTransactionsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: z.flattenError(parsed.error) },
      { status: 422 }
    );
  }

  if (!searchParams.has('_page')) {
    return NextResponse.json(await store.getAllByUser(userId));
  }

  const query = parsed.data;
  const sort = query._sort;
  const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';
  const sortBy = sort.endsWith('amount') ? 'amount' : 'date';

  const result = await store.listTransactions({
    userId,
    page: query._page,
    perPage: query._per_page,
    type: query.type,
    dateFrom: query.date_gte,
    dateTo: query.date_lte,
    q: query.q,
    category: query.category,
    amount_gte: query.amount_gte,
    amount_lte: query.amount_lte,
    sortBy,
    sortOrder,
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch (error) {
    if (error instanceof JsonRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: z.flattenError(parsed.error) },
      { status: 422 }
    );
  }

  const transaction = await store.create({ ...parsed.data, userId: session.user.id });
  return NextResponse.json(transaction, { status: 201 });
}

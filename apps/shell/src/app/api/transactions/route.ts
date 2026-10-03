import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTransactionSchema } from '@bytebank/shared';
import { fromSearchParams } from '@bytebank/core';
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

  let decoded: ReturnType<typeof fromSearchParams>;
  try {
    decoded = fromSearchParams(searchParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', issues: z.flattenError(error) },
        { status: 422 }
      );
    }
    throw error;
  }

  if (!searchParams.has('_page')) {
    return NextResponse.json(await store.getAllByUser(userId));
  }

  const { filter, page } = decoded;
  const result = await store.listTransactions({
    userId,
    page: page.page,
    perPage: page.perPage,
    type: filter.type === 'all' ? undefined : filter.type,
    dateFrom: filter.dateFrom || undefined,
    dateTo: filter.dateTo || undefined,
    q: filter.q || undefined,
    category: filter.category,
    amount_gte: filter.amount_gte,
    amount_lte: filter.amount_lte,
    sortBy: filter.sortBy,
    sortOrder: filter.sortOrder,
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

import { NextRequest, NextResponse } from 'next/server';
import type { TransactionType } from '@bytebank/shared';
import { auth } from '@/auth';
import * as store from './store';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page = searchParams.get('_page');
  const perPage = searchParams.get('_per_page');

  if (!page || !perPage) {
    return NextResponse.json(await store.getAll());
  }

  const sort = searchParams.get('_sort') ?? '-date';
  const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';
  const sortBy = sort.replace(/^-/, '') as 'date' | 'amount';

  const amountGte = searchParams.get('amount_gte');
  const amountLte = searchParams.get('amount_lte');

  const result = await store.listTransactions({
    page: Number(page),
    perPage: Number(perPage),
    type: (searchParams.get('type') as TransactionType) ?? undefined,
    dateFrom: searchParams.get('date_gte') ?? undefined,
    dateTo: searchParams.get('date_lte') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    category: searchParams.getAll('category'),
    amount_gte: amountGte !== null ? Number(amountGte) : undefined,
    amount_lte: amountLte !== null ? Number(amountLte) : undefined,
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

  const body = await req.json();
  const transaction = await store.create({ ...body, userId: session.user.id });
  return NextResponse.json(transaction, { status: 201 });
}

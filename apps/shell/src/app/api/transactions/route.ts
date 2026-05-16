import { NextRequest, NextResponse } from 'next/server';
import type { Transaction } from '@/types';
import * as store from './store';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page = searchParams.get('_page');
  const perPage = searchParams.get('_per_page');
  const type = searchParams.get('type');
  const dateFrom = searchParams.get('date_gte');
  const dateTo = searchParams.get('date_lte');
  const sort = searchParams.get('_sort');

  let transactions = store.getAll();

  if (type) transactions = transactions.filter((t) => t.type === type);
  if (dateFrom) transactions = transactions.filter((t) => t.date >= dateFrom);
  if (dateTo) transactions = transactions.filter((t) => t.date <= dateTo);

  if (sort) {
    const desc = sort.startsWith('-');
    const field = (desc ? sort.slice(1) : sort) as keyof Transaction;
    transactions = [...transactions].sort((a, b) => {
      if (a[field] < b[field]) return desc ? 1 : -1;
      if (a[field] > b[field]) return desc ? -1 : 1;
      return 0;
    });
  }

  if (page && perPage) {
    const pageNum = Number(page);
    const perPageNum = Number(perPage);
    const total = transactions.length;
    const pages = Math.ceil(total / perPageNum);
    const start = (pageNum - 1) * perPageNum;
    const data = transactions.slice(start, start + perPageNum);
    return NextResponse.json({ data, pages, items: total });
  }

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const transaction = store.create(body);
  return NextResponse.json(transaction, { status: 201 });
}

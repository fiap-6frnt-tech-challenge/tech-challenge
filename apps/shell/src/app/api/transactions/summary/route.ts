import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  aggregateByMonth,
  cumulativeBalance,
  groupByCategory,
  calculateBalance,
} from '@bytebank/shared';
import { getAllByUser } from '../store';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const all = await getAllByUser(session.user.id, { from, to });

  const byMonth = aggregateByMonth(all);
  const current = byMonth.at(-1);
  const previous = byMonth.at(-2);

  return NextResponse.json({
    balance: calculateBalance(all),
    incomeMonth: current?.income ?? 0,
    expenseMonth: current?.expense ?? 0,
    savingsMonth: (current?.income ?? 0) - (current?.expense ?? 0),
    deltaIncome: (current?.income ?? 0) - (previous?.income ?? 0),
    deltaExpense: (current?.expense ?? 0) - (previous?.expense ?? 0),
    byMonth,
    balanceOverTime: cumulativeBalance(all),
    byCategory: groupByCategory(all),
  });
}

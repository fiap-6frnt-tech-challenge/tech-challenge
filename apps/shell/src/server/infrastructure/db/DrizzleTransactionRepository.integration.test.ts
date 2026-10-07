import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  normalizeTransactionFilter,
  type Transaction,
  type TransactionFilter,
} from '@bytebank/core';
import { db } from '@/db';
import { attachments, transactions } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import { DrizzleTransactionRepository } from './DrizzleTransactionRepository';

const scope = integrationScope();
const owner = scope.id('owner');
const other = scope.id('other');
const editor = scope.id('editor');
const repository = new DrizzleTransactionRepository(db);
const all = normalizeTransactionFilter({});

const names = (items: Transaction[]) => items.map((item) => item.id.replace(scope.id(''), ''));

const receipt = {
  id: scope.id('receipt'),
  url: 'https://example.test/recibo.pdf',
  name: 'recibo.pdf',
  size: 1024,
  mimeType: 'application/pdf',
};

async function insertEditable(name: string) {
  const [row] = await db
    .insert(transactions)
    .values({
      id: scope.id(name),
      userId: editor,
      type: 'withdrawal',
      category: 'health',
      amount: 75,
      date: '2026-03-02',
      description: 'Farmácia',
    })
    .returning();
  return row;
}

beforeAll(async () => {
  await db.insert(transactions).values([
    {
      id: scope.id('salary'),
      userId: owner,
      type: 'deposit',
      category: 'salary',
      amount: 5000,
      date: '2026-01-05',
      description: 'Salário janeiro',
    },
    {
      id: scope.id('market'),
      userId: owner,
      type: 'withdrawal',
      category: 'food',
      amount: 320.5,
      date: '2026-01-10',
      description: 'Mercado do bairro',
    },
    {
      id: scope.id('uber'),
      userId: owner,
      type: 'withdrawal',
      category: 'transport',
      amount: 45.9,
      date: '2026-02-03',
      description: 'Uber para o trabalho',
    },
    {
      id: scope.id('savings'),
      userId: owner,
      type: 'transfer',
      category: 'transfer',
      amount: 1000,
      date: '2026-02-15',
      description: 'Transferência para poupança',
    },
    {
      id: scope.id('bonus'),
      userId: owner,
      type: 'deposit',
      category: 'salary',
      amount: 800,
      date: '2026-03-01',
      description: 'Bônus trimestral',
    },
    {
      id: scope.id('foreign'),
      userId: other,
      type: 'deposit',
      category: 'salary',
      amount: 99999,
      date: '2026-01-20',
      description: 'Salário de outra pessoa',
    },
  ]);
  await db.insert(attachments).values({ ...receipt, transactionId: scope.id('market') });
});

afterAll(() => scope.cleanup());

describe('DrizzleTransactionRepository — leitura', () => {
  it('busca a transação do dono com os anexos', async () => {
    expect(await repository.findById(scope.id('market'), owner)).toEqual({
      id: scope.id('market'),
      userId: owner,
      type: 'withdrawal',
      category: 'food',
      amount: 320.5,
      date: '2026-01-10',
      description: 'Mercado do bairro',
      attachments: [receipt],
    });
  });

  it('não enxerga a transação de outro usuário', async () => {
    expect(await repository.findById(scope.id('foreign'), owner)).toBeNull();
  });

  it('pagina só as transações do dono, da mais recente para a mais antiga', async () => {
    const page = await repository.list(owner, all, { page: 1, perPage: 2 });

    expect(names(page.items)).toEqual(['bonus', 'savings']);
    expect(page).toMatchObject({ page: 1, perPage: 2, total: 5, totalPages: 3 });
  });

  const filters: Array<[string, Partial<TransactionFilter>, string[]]> = [
    ['tipo', { type: 'withdrawal' }, ['uber', 'market']],
    ['período', { dateFrom: '2026-01-06', dateTo: '2026-02-14' }, ['uber', 'market']],
    ['texto, sem diferenciar maiúsculas', { q: 'MERCADO' }, ['market']],
    ['categorias', { category: ['transport', 'transfer'] }, ['savings', 'uber']],
    ['faixa de valor', { amount_gte: 45.9, amount_lte: 800 }, ['bonus', 'uber', 'market']],
    [
      'valor crescente',
      { sortBy: 'amount', sortOrder: 'asc' },
      ['uber', 'market', 'bonus', 'savings', 'salary'],
    ],
  ];

  it.each(filters)('filtra e ordena por %s', async (_name, filter, expected) => {
    const page = await repository.list(owner, { ...all, ...filter }, { page: 1, perPage: 10 });
    expect(names(page.items)).toEqual(expected);
  });

  it('devolve página vazia com totalPages 1, como a Fase 2', async () => {
    expect(
      await repository.list(owner, { ...all, q: 'inexistente' }, { page: 1, perPage: 10 })
    ).toEqual({ items: [], page: 1, perPage: 10, total: 0, totalPages: 1 });
  });

  it('resume saldo e recentes só do dono, com a transferência neutra', async () => {
    const overview = await repository.overview(owner, 2);

    expect(overview.balance).toBe(5433.6);
    expect(names(overview.recent)).toEqual(['bonus', 'savings']);
  });

  it('agrega por mês, categoria e saldo acumulado dentro do período', async () => {
    const range = { from: '2026-01-01', to: '2026-02-28' };

    expect(await repository.monthlyTotals(owner, range)).toEqual([
      { month: '2026-01', income: 5000, expense: 320.5 },
      { month: '2026-02', income: 0, expense: 45.9 },
    ]);
    expect(await repository.categoryTotals(owner, range)).toEqual([
      { category: 'food', total: 320.5 },
      { category: 'transport', total: 45.9 },
    ]);
    expect(await repository.balanceSeries(owner, range)).toEqual([
      { date: '2026-01-05', balance: 5000 },
      { date: '2026-01-10', balance: 4679.5 },
      { date: '2026-02-03', balance: 4633.6 },
      { date: '2026-02-15', balance: 4633.6 },
    ]);
  });

  it('agrega todo o histórico quando o período não tem limites', async () => {
    expect(await repository.monthlyTotals(owner, {})).toEqual([
      { month: '2026-01', income: 5000, expense: 320.5 },
      { month: '2026-02', income: 0, expense: 45.9 },
      { month: '2026-03', income: 800, expense: 0 },
    ]);
    expect((await repository.balanceSeries(owner, { from: '2026-02-01' })).at(-1)).toEqual({
      date: '2026-03-01',
      balance: 754.1,
    });
  });

  it('acumula o saldo do dia na ordem de criação e arredonda em centavos', async () => {
    const day = scope.id('same-day');
    await db.insert(transactions).values([
      {
        id: scope.id('day-1'),
        userId: day,
        type: 'deposit',
        amount: 0.1,
        date: '2026-04-01',
        description: 'Primeiro',
        createdAt: new Date('2026-04-01T10:00:00Z'),
      },
      {
        id: scope.id('day-2'),
        userId: day,
        type: 'deposit',
        amount: 0.2,
        date: '2026-04-01',
        description: 'Segundo',
        createdAt: new Date('2026-04-01T11:00:00Z'),
      },
      {
        id: scope.id('day-3'),
        userId: day,
        type: 'withdrawal',
        amount: 0.05,
        date: '2026-04-01',
        description: 'Terceiro',
        createdAt: new Date('2026-04-01T12:00:00Z'),
      },
    ]);

    expect(await repository.balanceSeries(day, {})).toEqual([
      { date: '2026-04-01', balance: 0.1 },
      { date: '2026-04-01', balance: 0.3 },
      { date: '2026-04-01', balance: 0.25 },
    ]);
    expect((await repository.overview(day, 0)).balance).toBe(0.25);
  });
});

describe('DrizzleTransactionRepository — escrita', () => {
  it('cria a transação para o dono informado, sem anexos', async () => {
    const created = await repository.create(
      {
        id: scope.id('created'),
        type: 'withdrawal',
        category: 'health',
        amount: 75,
        date: '2026-03-02',
        description: 'Farmácia',
      },
      editor
    );

    expect(created).toEqual({
      id: scope.id('created'),
      userId: editor,
      type: 'withdrawal',
      category: 'health',
      amount: 75,
      date: '2026-03-02',
      description: 'Farmácia',
      attachments: [],
    });
    expect(await repository.findById(created.id, editor)).toEqual(created);
  });

  it('atualiza só os campos enviados e mantém os anexos', async () => {
    const row = await insertEditable('updated');
    await db
      .insert(attachments)
      .values({ ...receipt, id: scope.id('bill'), transactionId: row.id });

    const updated = await repository.update(row.id, editor, {
      amount: 80,
      description: 'Farmácia 24h',
    });

    expect(updated).toMatchObject({
      amount: 80,
      description: 'Farmácia 24h',
      category: 'health',
      date: '2026-03-02',
    });
    expect(updated?.attachments?.map((attachment) => attachment.id)).toEqual([scope.id('bill')]);
  });

  it('não troca o id mesmo quando o patch traz um', async () => {
    const row = await insertEditable('rekeyed');

    const updated = await repository.update(row.id, editor, {
      id: scope.id('hijacked'),
      category: 'other',
    });

    expect(updated).toMatchObject({ id: row.id, category: 'other' });
    expect(await repository.findById(scope.id('hijacked'), editor)).toBeNull();
  });

  it('não altera nem apaga a transação de outro usuário', async () => {
    const row = await insertEditable('guarded');

    expect(await repository.update(row.id, owner, { amount: 1 })).toBeNull();
    expect(await repository.delete(row.id, owner)).toBe(false);
    expect(await repository.findById(row.id, editor)).toMatchObject({ amount: 75 });
  });

  it('apaga a transação do dono junto com os anexos', async () => {
    const row = await insertEditable('deleted');
    await db
      .insert(attachments)
      .values({ ...receipt, id: scope.id('orphan'), transactionId: row.id });

    expect(await repository.delete(row.id, editor)).toBe(true);
    expect(await repository.findById(row.id, editor)).toBeNull();
    expect(
      await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, scope.id('orphan')))
    ).toEqual([]);
    expect(await repository.delete(row.id, editor)).toBe(false);
  });
});

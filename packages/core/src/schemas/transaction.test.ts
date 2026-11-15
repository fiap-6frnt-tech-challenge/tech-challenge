import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from './transaction';

const validApiInput = {
  type: 'withdrawal',
  category: 'food',
  amount: 42.5,
  date: '2026-01-15',
  description: 'Mercado da esquina',
};

afterEach(() => vi.useRealTimers());

describe('transaction API schemas', () => {
  it('aceita a criação com os campos públicos', () => {
    expect(createTransactionSchema.parse(validApiInput)).toEqual(validApiInput);
  });

  it.each(['userId', 'id', 'attachments', 'createdAt'])(
    'rejeita o campo extra %s na criação',
    (field) => {
      expect(
        createTransactionSchema.safeParse({ ...validApiInput, [field]: 'injetado' }).success
      ).toBe(false);
    }
  );

  it.each([0, -1, '42', 1_000_000_001])('rejeita amount inválido %s', (amount) => {
    expect(createTransactionSchema.safeParse({ ...validApiInput, amount }).success).toBe(false);
  });

  it('rejeita descrição com mais de 140 caracteres após trim', () => {
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, description: 'x'.repeat(141) }).success
    ).toBe(false);
  });

  it('rejeita byte NUL na descrição e na busca', () => {
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, description: 'Compra\u0000extra' })
        .success
    ).toBe(false);
    expect(updateTransactionSchema.safeParse({ description: 'Compra\u0000extra' }).success).toBe(
      false
    );
    expect(listTransactionsQuerySchema.safeParse({ q: 'Compra\u0000extra' }).success).toBe(false);
  });

  it('rejeita datas futuras no calendário de São Paulo', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-28T02:30:00.000Z'));
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, date: '2026-09-27' }).success
    ).toBe(true);
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, date: '2026-09-28' }).success
    ).toBe(false);
  });

  it('aceita PATCH parcial válido e rejeita objeto vazio', () => {
    expect(updateTransactionSchema.parse({ description: '  Nova descrição  ' })).toEqual({
      description: 'Nova descrição',
    });
    expect(updateTransactionSchema.safeParse({}).success).toBe(false);
  });

  it.each(['userId', 'id', 'attachments'])('rejeita o campo extra %s no PATCH', (field) => {
    expect(updateTransactionSchema.safeParse({ description: 'Nova', [field]: 'x' }).success).toBe(
      false
    );
  });

  it('aceita filtros válidos e limita a paginação', () => {
    expect(listTransactionsQuerySchema.parse({ _page: '2', _per_page: '100' })).toMatchObject({
      _page: 2,
      _per_page: 100,
      _sort: '-date',
      category: [],
    });
    expect(listTransactionsQuerySchema.safeParse({ _per_page: '100000' }).success).toBe(false);
  });

  it.each([
    { _page: '0' },
    { _page: '1.5' },
    { _sort: 'userId' },
    { category: ['unknown'] },
    { category: Array(21).fill('food') },
    { q: 'q'.repeat(101) },
  ])('rejeita filtro inválido %j', (query) => {
    expect(listTransactionsQuerySchema.safeParse(query).success).toBe(false);
  });
});

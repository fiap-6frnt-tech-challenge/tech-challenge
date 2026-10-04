import { z } from 'zod';
import { CATEGORIES } from '../domain/category/categories';
import { TRANSACTION_TYPE } from '../domain/transaction/TransactionType';

const transactionTypes = [
  TRANSACTION_TYPE.DEPOSIT,
  TRANSACTION_TYPE.WITHDRAWAL,
  TRANSACTION_TYPE.TRANSFER,
] as const;

const categoryIds = CATEGORIES.map((category) => category.id) as [string, ...string[]];
const hasNoNullByte = (value: string) => !value.includes('\u0000');

function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function buildCreateTransactionSchema(getToday: () => string) {
  return z.strictObject({
    type: z.enum(transactionTypes),
    category: z.enum(categoryIds),
    amount: z.number().positive().max(1_000_000_000),
    date: z.iso.date().refine((date) => date <= getToday(), 'Data não pode ser futura'),
    description: z.string().trim().min(3).max(140).refine(hasNoNullByte, 'Texto inválido'),
  });
}

export function createTransactionSchemaForDate(today: string) {
  return buildCreateTransactionSchema(() => today);
}

export const createTransactionSchema = buildCreateTransactionSchema(todayISO);

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nada para atualizar');

export const listTransactionsQuerySchema = z.strictObject({
  _page: z.coerce.number().int().min(1).default(1),
  _per_page: z.coerce.number().int().min(1).max(100).default(10),
  _sort: z.enum(['date', '-date', 'amount', '-amount']).default('-date'),
  type: z.enum(transactionTypes).optional(),
  date_gte: z.iso.date().optional(),
  date_lte: z.iso.date().optional(),
  q: z.string().trim().max(100).refine(hasNoNullByte, 'Texto inválido').optional(),
  category: z.array(z.enum(categoryIds)).max(20).default([]),
  amount_gte: z.coerce.number().nonnegative().optional(),
  amount_lte: z.coerce.number().nonnegative().optional(),
});

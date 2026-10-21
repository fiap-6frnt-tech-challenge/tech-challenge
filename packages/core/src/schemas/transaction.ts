import './configureZod';
import { z } from 'zod';
import { ValidationError } from '../domain/errors';
import { parseTransactionQuery } from '../domain/filter/parseTransactionQuery';
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

export const listTransactionsQuerySchema = z.unknown().transform((input, context) => {
  try {
    return parseTransactionQuery(input);
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    for (const issue of error.issues as { path: string[]; message: string }[]) {
      context.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    }
    return z.NEVER;
  }
});

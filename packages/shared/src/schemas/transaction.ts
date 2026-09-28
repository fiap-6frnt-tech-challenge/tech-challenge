import { z } from 'zod';
import { CATEGORIES } from '../categories';
import { TRANSACTION_TYPE } from '../constants/transaction';

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

export const createTransactionSchema = z.strictObject({
  type: z.enum(transactionTypes),
  category: z.enum(categoryIds),
  amount: z.number().positive().max(1_000_000_000),
  date: z.iso.date().refine((date) => date <= todayISO(), 'Data não pode ser futura'),
  description: z.string().trim().min(3).max(140).refine(hasNoNullByte, 'Texto inválido'),
});

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

export const attachmentSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  name: z.string(),
  size: z.number().positive(),
  mimeType: z.string(),
});

export const transactionFormSchema = z.object({
  type: z.enum(transactionTypes, { message: 'Tipo inválido' }),
  category: z.enum(categoryIds, { message: 'Categoria é obrigatória' }),
  amount: z
    .number({ message: 'Informe um valor' })
    .positive({ message: 'Valor deve ser positivo' })
    .max(1_000_000_000, 'Valor máximo de 1.000.000.000'),
  date: z
    .string()
    .min(1, 'Data é obrigatória')
    .refine((value) => !value || new Date(value) <= new Date(), {
      message: 'Data não pode ser futura',
    }),
  description: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(140, 'Máximo 140 caracteres')
    .refine(hasNoNullByte, 'Texto inválido'),
  attachments: z.array(attachmentSchema).max(5, 'Máximo 5 anexos').optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

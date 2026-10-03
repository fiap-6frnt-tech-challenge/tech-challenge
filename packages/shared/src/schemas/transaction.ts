import { z } from 'zod';
import { CATEGORIES, TRANSACTION_TYPE } from '@bytebank/core';
export {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from '@bytebank/core/schemas';

const transactionTypes = [
  TRANSACTION_TYPE.DEPOSIT,
  TRANSACTION_TYPE.WITHDRAWAL,
  TRANSACTION_TYPE.TRANSFER,
] as const;
const categoryIds = CATEGORIES.map((category) => category.id) as [string, ...string[]];
const hasNoNullByte = (value: string) => !value.includes('\u0000');

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

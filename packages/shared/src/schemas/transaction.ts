import { z } from 'zod';
import { CATEGORIES } from '../categories';
import { TRANSACTION_TYPE } from '../constants/transaction';

const transactionTypes = [
  TRANSACTION_TYPE.DEPOSIT,
  TRANSACTION_TYPE.WITHDRAWAL,
  TRANSACTION_TYPE.TRANSFER,
] as const;

const categoryIds = CATEGORIES.map((category) => category.id) as [string, ...string[]];

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
    .positive({ message: 'Valor deve ser positivo' }),
  date: z
    .string()
    .min(1, 'Data é obrigatória')
    .refine((value) => !value || new Date(value) <= new Date(), {
      message: 'Data não pode ser futura',
    }),
  description: z.string().min(3, 'Mínimo 3 caracteres').max(140, 'Máximo 140 caracteres'),
  attachments: z.array(attachmentSchema).max(5, 'Máximo 5 anexos').optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

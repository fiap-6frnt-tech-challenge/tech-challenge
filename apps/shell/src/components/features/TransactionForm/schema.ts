import { z } from 'zod';
import { TRANSACTION_TYPE } from '@/shared/constants/transaction';

const TRANSACTION_TYPES = [
  TRANSACTION_TYPE.DEPOSIT,
  TRANSACTION_TYPE.WITHDRAWAL,
  TRANSACTION_TYPE.TRANSFER,
] as const;

export const transactionFormSchema = z.object({
  type: z
    .enum(TRANSACTION_TYPES, { message: 'Selecione um tipo de transação' })
    .refine((val) => !!val, {
      message: 'Selecione um tipo de transação',
    }),
  amount: z
    .number({ message: 'O valor deve ser maior que zero' })
    .positive({ message: 'O valor deve ser maior que zero' })
    .multipleOf(0.01, { message: 'O valor deve ter no máximo 2 casas decimais' }),
  date: z.string().min(1, 'Selecione uma data'),
  description: z.string().min(1, 'Adicione uma descrição'),
});

export type TransactionFormSchemaValues = z.infer<typeof transactionFormSchema>;

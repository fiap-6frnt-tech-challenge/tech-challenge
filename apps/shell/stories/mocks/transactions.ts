import type { Transaction } from '@/types';

export const DELETE_DEPOSIT_TRANSACTION: Transaction = {
  id: '1',
  type: 'deposit',
  description: 'Salário mensal',
  amount: 5000,
  date: '2025-03-01',
};

export const DELETE_WITHDRAWAL_TRANSACTION: Transaction = {
  id: '2',
  type: 'withdrawal',
  description: 'Aluguel',
  amount: 1500,
  date: '2025-03-05',
};

export const DELETE_TRANSFER_TRANSACTION: Transaction = {
  id: '3',
  type: 'transfer',
  description: 'Transferência para conta poupança',
  amount: 800,
  date: '2025-03-10',
};

export const DELETE_LONG_DESCRIPTION_TRANSACTION: Transaction = {
  id: '4',
  type: 'withdrawal',
  description: 'Pagamento de fatura do cartão de crédito referente ao mês de fevereiro de 2025',
  amount: 3200,
  date: '2025-03-15',
};

export const EDIT_DEPOSIT_TRANSACTION: Transaction = {
  id: '1',
  type: 'deposit',
  description: 'Salario mensal',
  amount: 5000,
  date: '2025-03-01',
};

export const EDIT_WITHDRAWAL_TRANSACTION: Transaction = {
  id: '2',
  type: 'withdrawal',
  description: 'Aluguel',
  amount: 1800,
  date: '2025-03-05',
};

export const EDIT_LONG_DESCRIPTION_TRANSACTION: Transaction = {
  id: '3',
  type: 'transfer',
  description: 'Transferencia para reserva de emergencia da conta conjunta',
  amount: 950.75,
  date: '2025-03-10',
};

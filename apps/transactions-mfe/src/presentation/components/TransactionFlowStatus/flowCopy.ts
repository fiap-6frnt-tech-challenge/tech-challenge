export type TransactionFlowMode = 'create' | 'edit';

export const TRANSACTION_FLOW_COPY = {
  create: {
    confirmTitle: 'Confirmar transação',
    confirmQuestion: 'Deseja confirmar a adição desta transação?',
    errorTitle: 'Erro ao adicionar transação',
    success: 'Transação criada',
  },
  edit: {
    confirmTitle: 'Confirmar alteração',
    confirmQuestion: 'Deseja salvar as alterações desta transação?',
    errorTitle: 'Erro ao atualizar transação',
    success: 'Alterações salvas',
  },
} as const satisfies Record<TransactionFlowMode, Record<string, string>>;

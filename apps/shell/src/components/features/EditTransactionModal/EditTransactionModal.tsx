'use client';

import { Modal } from '@/components/ui';
import { EditTransactionModalProps } from './IEditTransactionModal';
import { TransactionForm } from '../TransactionForm/TransactionForm';

export function EditTransactionModal({
  transaction,
  onConfirm,
  onCancel,
  isSubmitting,
}: EditTransactionModalProps) {
  return (
    <Modal isOpen={!!transaction} onClose={onCancel} title="Editar Transação">
      <TransactionForm
        onSubmit={onConfirm}
        onCancel={onCancel}
        initialValues={transaction || undefined}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
}

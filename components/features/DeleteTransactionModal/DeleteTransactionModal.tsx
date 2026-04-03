'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TransactionInfo } from '@/components/features/TransactionInfo';
import type { DeleteTransactionModalProps } from './IDeleteTransactionModal';

export function DeleteTransactionModal({
  transaction,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteTransactionModalProps) {
  return (
    <Modal isOpen={transaction !== null} onClose={onCancel} title="Excluir transação">
      <p className="body-default text-content-secondary mb-lg">
        Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
      </p>

      {transaction && <TransactionInfo transaction={transaction} />}

      <div className="flex flex-col gap-sm mt-lg sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={isDeleting} loading={isDeleting}>
          Excluir
        </Button>
      </div>
    </Modal>
  );
}

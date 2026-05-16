'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TransactionInfo } from '@/components/features/TransactionInfo';
import type { ConfirmTransactionModalProps } from './IConfirmTransactionModal';

export function ConfirmTransactionModal({
  isOpen,
  transaction,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ConfirmTransactionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Confirmar transação">
      <p className="body-default text-content-secondary mb-lg">
        Deseja confirmar a adição desta transação?
      </p>

      {transaction && <TransactionInfo transaction={transaction} />}

      <div className="flex flex-col gap-sm mt-lg sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isSubmitting} loading={isSubmitting}>
          {isSubmitting ? 'Confirmando...' : 'Confirmar'}
        </Button>
      </div>
    </Modal>
  );
}

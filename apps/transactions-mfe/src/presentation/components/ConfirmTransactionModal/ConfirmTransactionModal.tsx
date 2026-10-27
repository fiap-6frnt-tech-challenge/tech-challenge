'use client';

import { Button } from '@bytebank/design-system';
import { Modal } from '@bytebank/design-system';
import { TransactionInfo } from '../TransactionInfo';
import { TRANSACTION_FLOW_COPY } from '../TransactionFlowStatus';
import type { ConfirmTransactionModalProps } from './IConfirmTransactionModal';

export function ConfirmTransactionModal({
  isOpen,
  transaction,
  onConfirm,
  onCancel,
  isSubmitting = false,
  mode = 'create',
  error = null,
  onRetry,
}: ConfirmTransactionModalProps) {
  const copy = TRANSACTION_FLOW_COPY[mode];

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={copy.confirmTitle}>
      {error ? (
        <div
          role="alert"
          className="mb-lg flex flex-col gap-xs rounded-default border border-feedback-danger bg-feedback-danger/10 px-md py-sm"
        >
          <p className="body-semibold text-feedback-danger">{copy.errorTitle}</p>
          <p className="label-default text-content-primary">{error}</p>
        </div>
      ) : (
        <p className="body-default text-content-secondary mb-lg">{copy.confirmQuestion}</p>
      )}

      {transaction && <TransactionInfo transaction={transaction} />}

      <div className="flex flex-col gap-sm mt-lg sm:flex-row sm:justify-end">
        {error ? (
          <>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Voltar
            </Button>
            <Button type="button" onClick={onRetry}>
              Tentar de novo
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

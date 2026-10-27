'use client';

import { useState } from 'react';
import type { FlowState } from '../../../application/transactionFlow';
import { TRANSACTION_FLOW_COPY, type TransactionFlowMode } from './flowCopy';
import type { TransactionFlowStatusProps } from './ITransactionFlowStatus';

export function describeTransactionFlow(
  state: FlowState<unknown>,
  mode: TransactionFlowMode
): string | null {
  const copy = TRANSACTION_FLOW_COPY[mode];
  switch (state.value) {
    case 'saving':
      return 'Salvando…';
    case 'uploading':
      return state.cancelling
        ? 'Cancelando o envio dos anexos…'
        : `Enviando anexos ${Math.min(state.done + 1, state.total)} de ${state.total}`;
    case 'partialSuccess':
      return state.failed.length === 1
        ? `${copy.success}, mas 1 anexo não foi enviado`
        : `${copy.success}, mas ${state.failed.length} anexos não foram enviados`;
    case 'success':
      return copy.success;
    default:
      return null;
  }
}

export function TransactionFlowStatus({ state, mode }: TransactionFlowStatusProps) {
  const next = describeTransactionFlow(state, mode);
  const [message, setMessage] = useState(next ?? '');
  if (next && next !== message) setMessage(next);

  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}

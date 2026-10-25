import type { FlowState } from '../../../application/transactionFlow';
import type { TransactionFlowMode } from './flowCopy';

export interface TransactionFlowStatusProps {
  state: FlowState<unknown>;
  mode: TransactionFlowMode;
}

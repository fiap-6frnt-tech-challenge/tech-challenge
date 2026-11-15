export type FlowState<D> =
  | { value: 'editing' }
  | { value: 'confirming'; draft: D; files: File[] }
  | { value: 'saving'; draft: D; files: File[] }
  | {
      value: 'uploading';
      transactionId: string;
      files: File[];
      done: number;
      total: number;
      cancelling: boolean;
    }
  | { value: 'partialSuccess'; transactionId: string; failed: File[] }
  | { value: 'success' }
  | { value: 'error'; draft: D; files: File[]; reason: string }
  | { value: 'closed' };

export type FlowEvent<D> =
  | { type: 'SUBMIT'; draft: D; files: File[] }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'SAVED'; transactionId: string }
  | { type: 'FAILED'; reason: string }
  | { type: 'PROGRESS'; done: number }
  | { type: 'UPLOADS_DONE'; failed: File[] }
  | { type: 'RETRY_FAILED' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

export type FlowStatus = FlowState<unknown>['value'];

export const initialFlowState: FlowState<never> = { value: 'editing' };

export function transactionFlow<D>(state: FlowState<D>, event: FlowEvent<D>): FlowState<D> {
  if (event.type === 'RESET') return state.value === 'editing' ? state : { value: 'editing' };

  switch (state.value) {
    case 'editing':
      if (event.type === 'SUBMIT')
        return { value: 'confirming', draft: event.draft, files: event.files };
      if (event.type === 'CANCEL') return { value: 'closed' };
      return state;
    case 'confirming':
      if (event.type === 'CONFIRM')
        return { value: 'saving', draft: state.draft, files: state.files };
      if (event.type === 'BACK') return { value: 'editing' };
      return state;
    case 'saving':
      if (event.type === 'SAVED')
        return state.files.length > 0
          ? {
              value: 'uploading',
              transactionId: event.transactionId,
              files: state.files,
              done: 0,
              total: state.files.length,
              cancelling: false,
            }
          : { value: 'success' };
      if (event.type === 'FAILED')
        return { value: 'error', draft: state.draft, files: state.files, reason: event.reason };
      return state;
    case 'uploading':
      if (event.type === 'PROGRESS') {
        const done = Math.min(Math.max(event.done, 0), state.total);
        return done === state.done ? state : { ...state, done };
      }
      if (event.type === 'UPLOADS_DONE')
        return event.failed.length > 0
          ? { value: 'partialSuccess', transactionId: state.transactionId, failed: event.failed }
          : { value: 'success' };
      if (event.type === 'CANCEL') return state.cancelling ? state : { ...state, cancelling: true };
      return state;
    case 'partialSuccess':
      if (event.type === 'RETRY_FAILED')
        return {
          value: 'uploading',
          transactionId: state.transactionId,
          files: state.failed,
          done: 0,
          total: state.failed.length,
          cancelling: false,
        };
      if (event.type === 'CANCEL') return { value: 'closed' };
      return state;
    case 'error':
      if (event.type === 'RETRY')
        return { value: 'confirming', draft: state.draft, files: state.files };
      if (event.type === 'BACK') return { value: 'editing' };
      if (event.type === 'CANCEL') return { value: 'closed' };
      return state;
    case 'success':
    case 'closed':
      return state;
  }
}

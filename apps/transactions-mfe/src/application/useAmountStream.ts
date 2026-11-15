import { useMemo } from 'react';
import { useEventStream, useSubscription } from '@bytebank/stores';
import { startWith, switchMap } from 'rxjs';
import { amountPipeline } from './reactiveFilterPipelines';

export function useAmountStream(onAmount: (value: number | undefined) => void) {
  const [emit, input$] = useEventStream<number | undefined>();
  const [emitReset, reset$] = useEventStream<void>();
  const amount$ = useMemo(
    () =>
      reset$.pipe(
        startWith(undefined),
        switchMap(() => amountPipeline(input$))
      ),
    [input$, reset$]
  );
  useSubscription(amount$, onAmount);
  return useMemo(() => ({ emit, reset: () => emitReset(undefined) }), [emit, emitReset]);
}

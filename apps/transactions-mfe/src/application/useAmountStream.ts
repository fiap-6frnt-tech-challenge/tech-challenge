import { useMemo } from 'react';
import { useEventStream, useSubscription } from '@bytebank/stores';
import { amountPipeline } from './reactiveFilterPipelines';

export function useAmountStream(
  onAmount: (value: number | undefined) => void
): (value: number | undefined) => void {
  const [emit, input$] = useEventStream<number | undefined>();
  const amount$ = useMemo(() => amountPipeline(input$), [input$]);
  useSubscription(amount$, onAmount);
  return emit;
}

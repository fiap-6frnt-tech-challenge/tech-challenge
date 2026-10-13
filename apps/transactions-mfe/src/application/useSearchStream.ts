import { useMemo } from 'react';
import { useEventStream, useSubscription } from '@bytebank/stores';
import { startWith, switchMap } from 'rxjs';
import { searchPipeline } from './reactiveFilterPipelines';

export function useSearchStream(onSearch: (value: string) => void) {
  const [emit, input$] = useEventStream<string>();
  const [emitReset, reset$] = useEventStream<void>();
  const search$ = useMemo(
    () =>
      reset$.pipe(
        startWith(undefined),
        switchMap(() => searchPipeline(input$))
      ),
    [input$, reset$]
  );
  useSubscription(search$, onSearch);
  return useMemo(() => ({ emit, reset: () => emitReset(undefined) }), [emit, emitReset]);
}

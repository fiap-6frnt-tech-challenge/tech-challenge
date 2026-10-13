import { useMemo } from 'react';
import { useEventStream, useSubscription } from '@bytebank/stores';
import { searchPipeline } from './reactiveFilterPipelines';

export function useSearchStream(onSearch: (value: string) => void): (value: string) => void {
  const [emit, input$] = useEventStream<string>();
  const search$ = useMemo(() => searchPipeline(input$), [input$]);
  useSubscription(search$, onSearch);
  return emit;
}

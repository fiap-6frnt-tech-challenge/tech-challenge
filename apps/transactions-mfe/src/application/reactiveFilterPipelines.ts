import {
  asyncScheduler,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  type Observable,
  type SchedulerLike,
} from 'rxjs';

export function searchPipeline(
  input$: Observable<string>,
  scheduler: SchedulerLike = asyncScheduler
): Observable<string> {
  return input$.pipe(
    map((query) => query.trim()),
    debounceTime(300, scheduler),
    distinctUntilChanged(),
    filter((query) => query.length === 0 || query.length >= 2)
  );
}

export function amountPipeline(
  input$: Observable<number | undefined>,
  scheduler: SchedulerLike = asyncScheduler
): Observable<number | undefined> {
  return input$.pipe(debounceTime(400, scheduler), distinctUntilChanged());
}

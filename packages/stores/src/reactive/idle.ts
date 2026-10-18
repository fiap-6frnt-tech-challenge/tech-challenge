import {
  asyncScheduler,
  concat,
  defer,
  map,
  of,
  startWith,
  switchMap,
  takeWhile,
  throttleTime,
  timer,
  type Observable,
  type SchedulerLike,
} from 'rxjs';

export type IdleState = 'active' | 'warn' | 'expire';
export function idleTimeoutMs(value: string | undefined): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 1 ? minutes * 60_000 : 15 * 60_000;
}

export function idle$(
  activity$: Observable<unknown>,
  idleMs: number,
  warnMs: number,
  scheduler: SchedulerLike = asyncScheduler,
  now: () => number = () => scheduler.now()
): Observable<IdleState> {
  return defer(() => {
    let deadline: number | undefined;
    return activity$.pipe(
      startWith(undefined),
      throttleTime(1000, scheduler, { leading: true, trailing: true }),
      switchMap(() => {
        const current = now();
        if (deadline !== undefined && current >= deadline) return of<IdleState>('expire');
        deadline = current + idleMs;
        return concat(
          of<IdleState>('active'),
          timer(idleMs - warnMs, scheduler).pipe(
            map((): IdleState => (now() >= deadline! ? 'expire' : 'warn'))
          ),
          defer(() => timer(Math.max(0, deadline! - now()), scheduler)).pipe(
            map((): IdleState => 'expire')
          )
        );
      }),
      takeWhile((state) => state !== 'expire', true)
    );
  });
}

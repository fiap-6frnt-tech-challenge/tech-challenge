import { useEffect, useRef, useState } from 'react';
import { Subject, type Observable } from 'rxjs';

export function useObservable<T>(source$: Observable<T>, initial: T): T {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const subscription = source$.subscribe(setValue);
    return () => subscription.unsubscribe();
  }, [source$]);
  return value;
}

export function useSubscription<T>(source$: Observable<T>, next: (value: T) => void): void {
  const callback = useRef(next);
  useEffect(() => {
    callback.current = next;
  }, [next]);
  useEffect(() => {
    const subscription = source$.subscribe((value) => callback.current(value));
    return () => subscription.unsubscribe();
  }, [source$]);
}

export function useEventStream<T>(): [emit: (value: T) => void, stream$: Observable<T>] {
  const [channel] = useState<[emit: (value: T) => void, stream$: Observable<T>]>(() => {
    const subject = new Subject<T>();
    return [(value) => subject.next(value), subject.asObservable()];
  });
  return channel;
}

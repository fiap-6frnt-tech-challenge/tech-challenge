// @vitest-environment jsdom
import { StrictMode, useLayoutEffect } from 'react';
import { Observable, Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEventStream, useObservable, useSubscription } from './hooks';

afterEach(cleanup);

describe('useObservable', () => {
  it('receives scheduled values and retains the latest one', () => {
    const scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    scheduler.run(({ cold, flush }) => {
      const source$ = cold<number>('-a-b-|', { a: 1, b: 2 });
      const { result } = renderHook(() => useObservable(source$, 0));
      expect(result.current).toBe(0);
      act(() => flush());
      expect(result.current).toBe(2);
    });
  });

  it('preserves a function-valued initial state', () => {
    const initial = () => 1;
    const source = new Subject<() => number>();
    const { result } = renderHook(() => useObservable(source, initial));
    expect(result.current).toBe(initial);
  });

  it('preserves function values emitted by an Observable', () => {
    const source = new Subject<() => number>();
    const { result } = renderHook(() => useObservable(source, () => 0));
    const next = () => 2;
    act(() => source.next(next));
    expect(result.current).toBe(next);
  });

  it('unsubscribes from the old source when the Observable changes', () => {
    const first = new Subject<number>();
    const second = new Subject<number>();
    const { result, rerender, unmount } = renderHook(({ source$ }) => useObservable(source$, 0), {
      initialProps: { source$: first as Observable<number> },
    });
    act(() => first.next(1));
    expect(result.current).toBe(1);
    rerender({ source$: second });
    act(() => first.next(2));
    expect(result.current).toBe(1);
    act(() => second.next(3));
    expect(result.current).toBe(3);
    unmount();
    expect(first.observed).toBe(false);
    expect(second.observed).toBe(false);
  });

  it('leaves one active subscription in StrictMode and none after unmount', () => {
    let active = 0;
    const source$ = new Observable<number>(() => {
      active += 1;
      return () => {
        active -= 1;
      };
    });
    const { unmount } = renderHook(() => useObservable(source$, 0), {
      wrapper: StrictMode,
    });
    expect(active).toBe(1);
    unmount();
    expect(active).toBe(0);
  });
});

describe('useSubscription', () => {
  it('tears down the StrictMode rehearsal and final subscription', () => {
    let active = 0;
    const source$ = new Observable<number>(() => {
      active += 1;
      return () => {
        active -= 1;
      };
    });
    const { unmount } = renderHook(() => useSubscription(source$, () => {}), {
      wrapper: StrictMode,
    });
    expect(active).toBe(1);
    unmount();
    expect(active).toBe(0);
  });

  it('uses the latest callback when a layout effect publishes during commit', () => {
    const source = new Subject<number>();
    const previous = vi.fn();
    const latest = vi.fn();
    function Probe({ next, value }: { next: (value: number) => void; value: number }) {
      useSubscription(source, next);
      useLayoutEffect(() => {
        if (value > 0) source.next(value);
      }, [value]);
      return null;
    }
    const view = render(<Probe next={previous} value={0} />);
    view.rerender(<Probe next={latest} value={1} />);
    expect(previous).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('uses the latest callback without resubscribing on rerender', () => {
    const source = new Subject<number>();
    const first = vi.fn();
    const second = vi.fn();
    let subscriptions = 0;
    const source$ = new Observable<number>((subscriber) => {
      subscriptions += 1;
      const subscription = source.subscribe(subscriber);
      return () => subscription.unsubscribe();
    });
    const { rerender, unmount } = renderHook(({ next }) => useSubscription(source$, next), {
      initialProps: { next: first },
    });
    act(() => source.next(1));
    rerender({ next: second });
    act(() => source.next(2));
    expect(first).toHaveBeenCalledOnce();
    expect(first).toHaveBeenCalledWith(1);
    expect(second).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledWith(2);
    expect(subscriptions).toBe(1);
    unmount();
    expect(source.observed).toBe(false);
  });
});

describe('useEventStream', () => {
  it('keeps emitter and stream stable and does not replay old values', () => {
    const { result, rerender, unmount } = renderHook(() => useEventStream<number>());
    const channel = result.current;
    act(() => channel[0](1));
    const received: number[] = [];
    const subscription = channel[1].subscribe((value) => received.push(value));
    expect(received).toEqual([]);
    act(() => channel[0](2));
    rerender();
    expect(result.current[0]).toBe(channel[0]);
    expect(result.current[1]).toBe(channel[1]);
    act(() => result.current[0](3));
    expect(received).toEqual([2, 3]);
    subscription.unsubscribe();
    unmount();
  });
});

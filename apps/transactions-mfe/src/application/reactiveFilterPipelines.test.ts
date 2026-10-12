import { describe, expect, it } from 'vitest';
// Test-only virtual scheduler; production MFE imports RxJS from the root entry point.
// eslint-disable-next-line no-restricted-imports
import { TestScheduler } from 'rxjs/testing';
import { amountPipeline, searchPipeline } from './reactiveFilterPipelines';

describe('searchPipeline', () => {
  it('emits only the last term from rapid typing after 300 ms', () => {
    const scheduler = new TestScheduler(() => undefined);
    scheduler.run(({ hot, flush }) => {
      const input$ = hot('a 100ms b 100ms c', {
        a: 'su',
        b: 'super',
        c: 'supermercado',
      });
      const received: Array<{ value: string; at: number }> = [];
      searchPipeline(input$, scheduler).subscribe((value) =>
        received.push({ value, at: scheduler.now() })
      );
      flush();
      expect(received).toEqual([{ value: 'supermercado', at: 502 }]);
    });
  });

  it('trims before suppressing a repeated term', () => {
    const scheduler = new TestScheduler(() => undefined);
    scheduler.run(({ hot, flush }) => {
      const received: string[] = [];
      searchPipeline(hot('a 400ms b', { a: 'mercado', b: ' mercado  ' }), scheduler).subscribe(
        (value) => received.push(value)
      );
      flush();
      expect(received).toEqual(['mercado']);
    });
  });

  it('does not emit one-character terms', () => {
    const scheduler = new TestScheduler(() => undefined);
    scheduler.run(({ hot, flush }) => {
      const received: string[] = [];
      searchPipeline(hot('a 400ms b', { a: 's', b: 'su' }), scheduler).subscribe((value) =>
        received.push(value)
      );
      flush();
      expect(received).toEqual(['su']);
    });
  });

  it('emits an empty term to restore the full list', () => {
    const scheduler = new TestScheduler(() => undefined);
    scheduler.run(({ hot, flush }) => {
      const received: string[] = [];
      searchPipeline(hot('a 400ms b', { a: 'uber', b: '' }), scheduler).subscribe((value) =>
        received.push(value)
      );
      flush();
      expect(received).toEqual(['uber', '']);
    });
  });
});

describe('amountPipeline', () => {
  it('debounces edits for 400 ms and preserves zero and clearing', () => {
    const scheduler = new TestScheduler(() => undefined);
    scheduler.run(({ hot, flush }) => {
      const received: Array<number | undefined> = [];
      amountPipeline(
        hot('a 100ms b 500ms c 500ms d', { a: 1, b: 12, c: 0, d: undefined }),
        scheduler
      ).subscribe((value) => received.push(value));
      flush();
      expect(received).toEqual([12, 0, undefined]);
    });
  });

  it('suppresses repeated amount values', () => {
    const scheduler = new TestScheduler(() => undefined);
    scheduler.run(({ hot, flush }) => {
      const received: Array<number | undefined> = [];
      amountPipeline(hot('a 500ms b', { a: 120, b: 120 }), scheduler).subscribe((value) =>
        received.push(value)
      );
      flush();
      expect(received).toEqual([120]);
    });
  });
});

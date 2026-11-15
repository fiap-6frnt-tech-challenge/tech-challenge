import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { idle$, idleTimeoutMs } from './idle';

describe('idle stream', () => {
  it('does not grant an extra warning period when the warning timer resumes after the deadline', () => {
    const scheduler = new TestScheduler(() => {});
    const activity = new Subject<void>();
    let wallTime = 0;
    const events: Array<[number, string]> = [];
    idle$(activity, 10_000, 1000, scheduler, () => wallTime).subscribe((state) =>
      events.push([scheduler.now(), state])
    );
    scheduler.schedule(() => {
      wallTime = 20_000;
    }, 8999);
    scheduler.maxFrames = 30_000;
    scheduler.flush();
    expect(events).toEqual([
      [0, 'active'],
      [9000, 'expire'],
    ]);
  });
  it('warns one minute before expiry and completes on expiry', () => {
    const scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    scheduler.run(({ hot, expectObservable }) => {
      expectObservable(idle$(hot('----------------'), 900_000, 60_000, scheduler)).toBe(
        'a 839999ms w 59999ms (e|)',
        { a: 'active', w: 'warn', e: 'expire' }
      );
    });
  });
  it('resets warning and expiry when activity resumes and tears down on unsubscribe', () => {
    const scheduler = new TestScheduler(() => {});
    const activity = new Subject<void>();
    const events: Array<[number, string]> = [];
    const subscription = idle$(activity, 10_000, 1000, scheduler).subscribe((state) =>
      events.push([scheduler.now(), state])
    );
    scheduler.schedule(() => activity.next(), 9500);
    scheduler.schedule(() => subscription.unsubscribe(), 18_000);
    scheduler.maxFrames = 30_000;
    scheduler.flush();
    expect(events).toEqual([
      [0, 'active'],
      [9000, 'warn'],
      [9500, 'active'],
    ]);
    expect(activity.observed).toBe(false);
  });
  it('expires on resumed activity when the wall-clock deadline passed while timers were suspended', () => {
    const scheduler = new TestScheduler(() => {});
    const activity = new Subject<void>();
    let wallTime = 0;
    const events: string[] = [];
    idle$(activity, 10_000, 1000, scheduler, () => wallTime).subscribe((state) =>
      events.push(state)
    );
    scheduler.schedule(() => {
      wallTime = 20_000;
      activity.next();
    }, 2000);
    scheduler.maxFrames = 30_000;
    scheduler.flush();
    expect(events).toEqual(['active', 'expire']);
  });
  it('uses 15 minutes by default and rejects invalid or too-short configuration', () => {
    expect(idleTimeoutMs(undefined)).toBe(900_000);
    expect(idleTimeoutMs('2')).toBe(120_000);
    for (const input of ['0', '1', '-1', 'NaN', 'Infinity', ''])
      expect(idleTimeoutMs(input)).toBe(900_000);
  });
});

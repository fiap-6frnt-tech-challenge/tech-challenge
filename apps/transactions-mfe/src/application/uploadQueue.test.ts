import { describe, expect, it } from 'vitest';
import { Observable, ReplaySubject, defer, of, throwError, timer } from 'rxjs';
// Test-only virtual scheduler; production MFE imports RxJS from the root entry point.
// eslint-disable-next-line no-restricted-imports
import { TestScheduler } from 'rxjs/testing';
import type { Attachment } from '@bytebank/core';
import { uploadQueue$, type UploadQueueEvent, type UploadQueueJob } from './uploadQueue';

const attachment: Attachment = {
  id: 'attachment-1',
  downloadUrl: '/api/transactions/tx-1/attachments/attachment-1/download',
  name: 'receipt.pdf',
  size: 12,
  mimeType: 'application/pdf',
};

function file(name: string): File {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' });
}

function job(id: string, uploadFile: File, cancel$ = new ReplaySubject<void>(1)): UploadQueueJob {
  return { id, file: uploadFile, cancel$ };
}

function statusError(status: number): Error & { status: number } {
  return Object.assign(new Error(`ajax error ${status}`), { status });
}

function isTransientTestError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'status' in error &&
    (error.status === 0 || (typeof error.status === 'number' && error.status >= 500))
  );
}

describe('uploadQueue$', () => {
  it('keeps at most two uploads active', () => {
    const scheduler = new TestScheduler(() => undefined);
    let active = 0;
    let maximumActive = 0;
    const files = [file('a.pdf'), file('b.pdf'), file('c.pdf'), file('d.pdf')];
    const jobs = files.map((uploadFile, index) => job(String(index), uploadFile));

    scheduler.run(() => {
      uploadQueue$(
        jobs,
        (uploadFile) =>
          new Observable((subscriber) => {
            active += 1;
            maximumActive = Math.max(maximumActive, active);
            let completed = false;
            const task = timer(10).subscribe(() => {
              completed = true;
              subscriber.next({
                type: 'done',
                attachment: { ...attachment, name: uploadFile.name },
              });
              subscriber.complete();
            });
            return () => {
              if (completed) active -= 1;
              else {
                task.unsubscribe();
                active -= 1;
              }
            };
          })
      ).subscribe();
    });

    expect(maximumActive).toBe(2);
    expect(active).toBe(0);
  });

  it('retries a transient 503 twice with backoff, then emits success', () => {
    const scheduler = new TestScheduler(() => undefined);
    const events: UploadQueueEvent[] = [];
    let attempts = 0;
    let successFrame = -1;

    scheduler.run(() => {
      uploadQueue$(
        [job('retry', file('retry.pdf'))],
        () =>
          defer(() => {
            attempts += 1;
            return attempts < 3
              ? throwError(() => statusError(503))
              : of({ type: 'done' as const, attachment });
          }),
        isTransientTestError
      ).subscribe((event) => {
        events.push(event);
        if (event.type === 'done') successFrame = scheduler.frame;
      });
    });

    expect(attempts).toBe(3);
    expect(successFrame).toBe(3000);
    expect(events.at(-1)).toMatchObject({ type: 'done', id: 'retry' });
  });

  it('does not retry a 400 response', () => {
    const events: UploadQueueEvent[] = [];
    let attempts = 0;

    uploadQueue$(
      [job('bad-request', file('invalid.pdf'))],
      () =>
        defer(() => {
          attempts += 1;
          return throwError(() => statusError(400));
        }),
      isTransientTestError
    ).subscribe((event) => events.push(event));

    expect(attempts).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: 'failed', id: 'bad-request' });
  });

  it('does not retry a 413 response with a plain-text platform body', () => {
    const events: UploadQueueEvent[] = [];
    let attempts = 0;

    uploadQueue$(
      [job('payload-too-large', file('large.pdf'))],
      () =>
        defer(() => {
          attempts += 1;
          return throwError(() =>
            Object.assign(statusError(413), { response: 'payload too large' })
          );
        }),
      isTransientTestError
    ).subscribe((event) => events.push(event));

    expect(attempts).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: 'failed', id: 'payload-too-large' });
  });

  it('cancels one file without cancelling the others', () => {
    const scheduler = new TestScheduler(() => undefined);
    const cancelA = new ReplaySubject<void>(1);
    const events: UploadQueueEvent[] = [];
    const aborted: string[] = [];
    const jobs = [job('a', file('a.pdf'), cancelA), job('b', file('b.pdf'))];

    scheduler.run(() => {
      uploadQueue$(
        jobs,
        (uploadFile) =>
          new Observable((subscriber) => {
            let completed = false;
            const task = timer(20).subscribe(() => {
              completed = true;
              subscriber.next({
                type: 'done',
                attachment: { ...attachment, name: uploadFile.name },
              });
              subscriber.complete();
            });
            return () => {
              if (!completed) aborted.push(uploadFile.name);
              task.unsubscribe();
            };
          })
      ).subscribe((event) => events.push(event));
      scheduler.schedule(() => cancelA.next(), 5);
    });

    expect(events).toContainEqual({ type: 'cancelled', id: 'a', file: jobs[0].file });
    expect(events).toContainEqual({
      type: 'done',
      id: 'b',
      file: jobs[1].file,
      attachment: { ...attachment, name: 'b.pdf' },
    });
    expect(aborted).toEqual(['a.pdf']);
  });

  it('unsubscribing aborts the active uploader', () => {
    let aborted = false;
    const subscription = uploadQueue$(
      [job('active', file('active.pdf'))],
      () =>
        new Observable(() => () => {
          aborted = true;
        })
    ).subscribe();

    subscription.unsubscribe();

    expect(aborted).toBe(true);
  });
});

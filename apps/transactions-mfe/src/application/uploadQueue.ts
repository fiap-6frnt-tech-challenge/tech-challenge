import {
  catchError,
  concat,
  defer,
  from,
  map,
  mergeMap,
  of,
  retry,
  take,
  takeUntil,
  tap,
  throwError,
  timer,
  type Observable,
} from 'rxjs';
import type { Attachment } from '@bytebank/core';
import { isTransientUploadError, type AttachmentUploadEvent } from '@bytebank/api-client';

export interface UploadQueueJob {
  id: string;
  file: File;
  cancel$: Observable<unknown>;
}

export type UploadQueueEvent =
  | { type: 'started'; id: string; file: File }
  | { type: 'progress'; id: string; file: File; loaded: number; total: number }
  | { type: 'done'; id: string; file: File; attachment: Attachment }
  | { type: 'failed'; id: string; file: File; error: unknown }
  | { type: 'cancelled'; id: string; file: File };

export function uploadQueue$(
  jobs: UploadQueueJob[],
  upload: (file: File) => Observable<AttachmentUploadEvent>,
  isTransient: (error: unknown) => boolean = isTransientUploadError
): Observable<UploadQueueEvent> {
  return from(jobs).pipe(
    mergeMap(
      (job) =>
        defer(() => {
          let wasCancelled = false;
          const cancellation$ = job.cancel$.pipe(
            take(1),
            tap(() => {
              wasCancelled = true;
            })
          );

          const transfer$ = defer(() => upload(job.file)).pipe(
            retry({
              count: 2,
              delay: (error, attempt) =>
                isTransient(error) ? timer(500 * 2 ** attempt) : throwError(() => error),
            }),
            map(
              (event): UploadQueueEvent =>
                event.type === 'progress'
                  ? {
                      type: 'progress',
                      id: job.id,
                      file: job.file,
                      loaded: event.loaded,
                      total: event.total,
                    }
                  : {
                      type: 'done',
                      id: job.id,
                      file: job.file,
                      attachment: event.attachment,
                    }
            ),
            catchError((error: unknown) =>
              of({ type: 'failed', id: job.id, file: job.file, error } as const)
            )
          );

          return concat(
            of({ type: 'started', id: job.id, file: job.file } as const),
            transfer$.pipe(takeUntil(cancellation$)),
            defer(() =>
              wasCancelled ? of({ type: 'cancelled', id: job.id, file: job.file } as const) : of()
            )
          );
        }),
      2
    )
  );
}

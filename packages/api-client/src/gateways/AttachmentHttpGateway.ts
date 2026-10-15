import type { Attachment } from '@bytebank/core';
import { AjaxError, ajax } from 'rxjs/ajax';
import { filter, map, type Observable } from 'rxjs';
import { apiUrl, httpRequest } from '../http/httpClient';
import type { AttachmentGateway, AttachmentUploadEvent, RequestOptions } from './types';

export function isTransientUploadError(error: unknown): error is AjaxError {
  return error instanceof AjaxError && (error.status === 0 || error.status >= 500);
}

export class AttachmentHttpGateway implements AttachmentGateway {
  constructor(private readonly createXHR?: () => XMLHttpRequest) {}

  list(id: string, { signal }: RequestOptions = {}) {
    return httpRequest<Attachment[]>(`/transactions/${encodeURIComponent(id)}/attachments`, {
      signal,
    });
  }
  upload(id: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    return httpRequest<Attachment>(`/transactions/${encodeURIComponent(id)}/attachments`, {
      method: 'POST',
      body,
    });
  }

  upload$(id: string, file: File): Observable<AttachmentUploadEvent> {
    const body = new FormData();
    body.append('file', file);

    return ajax<Attachment>({
      url: apiUrl(`/transactions/${encodeURIComponent(id)}/attachments`),
      method: 'POST',
      body,
      includeUploadProgress: true,
      ...(this.createXHR ? { createXHR: this.createXHR } : {}),
    }).pipe(
      filter(
        (response) => response.type === 'upload_progress' || response.type === 'download_load'
      ),
      map(
        (response): AttachmentUploadEvent =>
          response.type === 'upload_progress'
            ? { type: 'progress', loaded: response.loaded, total: response.total }
            : { type: 'done', attachment: response.response }
      )
    );
  }

  remove(id: string, attachmentId: string) {
    return httpRequest<void>(
      `/transactions/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
      { method: 'DELETE' }
    );
  }
}

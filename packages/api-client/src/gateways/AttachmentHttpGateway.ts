import type { Attachment } from '@bytebank/shared';
import { httpRequest } from '../http/httpClient';
import type { AttachmentGateway, RequestOptions } from './types';

export class AttachmentHttpGateway implements AttachmentGateway {
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
  remove(id: string, attachmentId: string) {
    return httpRequest<void>(
      `/transactions/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
      { method: 'DELETE' }
    );
  }
}

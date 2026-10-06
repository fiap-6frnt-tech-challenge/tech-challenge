import type { Attachment } from '@bytebank/core';
import type { AttachmentRecord } from '@bytebank/core/application';

export function publicAttachment(record: AttachmentRecord): Attachment {
  const { id, url, name, size, mimeType } = record;
  return { id, url, name, size, mimeType };
}

import type { Attachment } from '@bytebank/shared';

export interface IAttachmentList {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  isRemoving?: string | null;
}

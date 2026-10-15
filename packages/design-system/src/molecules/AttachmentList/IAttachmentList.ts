import type { Attachment } from '@bytebank/shared';
import type { FileUploadItem } from '../FileUpload/IFileUpload';

export interface IAttachmentList {
  attachments: Attachment[];
  uploadItems?: FileUploadItem[];
  onRemove?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  isRemoving?: string | null;
}

export interface IFileUpload {
  accept?: string;
  maxSizeBytes?: number;
  maxFiles?: number;
  value: File[];
  onChange: (files: File[]) => void;
  onError?: (message: string) => void;
  progress?: Record<string, number>;
  uploadItems?: FileUploadItem[];
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export type FileUploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled';

export interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: FileUploadStatus;
  error?: unknown;
}

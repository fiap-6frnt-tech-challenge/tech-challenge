export interface IFileUpload {
  accept?: string;
  maxSizeBytes?: number;
  maxFiles?: number;
  value: File[];
  onChange: (files: File[]) => void;
  onError?: (message: string) => void;
  progress?: Record<string, number>;
  disabled?: boolean;
  className?: string;
}

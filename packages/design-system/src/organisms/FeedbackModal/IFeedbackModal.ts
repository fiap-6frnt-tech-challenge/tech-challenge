export type FeedbackType = 'success' | 'info' | 'error';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: FeedbackType;
  title: string;
  message?: string;
  showCloseButton?: boolean;
}

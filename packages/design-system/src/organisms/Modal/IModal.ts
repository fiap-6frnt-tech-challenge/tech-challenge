export interface ModalProps {
  role?: 'dialog' | 'alertdialog';
  descriptionId?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

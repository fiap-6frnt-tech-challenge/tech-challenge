export interface GoogleAuthButtonProps {
  onClick: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

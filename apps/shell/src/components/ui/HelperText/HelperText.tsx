import { cn } from '@/lib/classes';

interface HelperTextProps {
  children: React.ReactNode;
  error?: boolean;
  id?: string;
}

export function HelperText({ children, error, id }: HelperTextProps) {
  return (
    <p
      id={id}
      className={cn(
        'text-sm font-normal mt-1',
        error ? 'text-feedback-danger' : 'text-content-secondary'
      )}
    >
      {children}
    </p>
  );
}

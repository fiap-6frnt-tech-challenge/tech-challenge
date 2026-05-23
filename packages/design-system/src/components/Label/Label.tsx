interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}

export function Label({ children, htmlFor, required }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-content-primary">
      {children}
      {required && (
        <span className="ml-xs text-feedback-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

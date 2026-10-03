export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange'
> {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
}

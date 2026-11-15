import type { InputHTMLAttributes } from 'react';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: boolean;
  onClear?: () => void;
}

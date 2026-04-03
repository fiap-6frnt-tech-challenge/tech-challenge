import type { InputHTMLAttributes } from 'react';

export interface CurrencyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value?: number;
  onValueChange?: (value: number) => void;
  currency?: string;
  label?: string;
  helperText?: string;
  error?: boolean;
  onClear?: () => void;
}

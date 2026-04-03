'use client';

import { cn } from '@/lib/classes';
import type { CurrencyInputProps } from './ICurrencyInput';
import { getInputBorderColor } from '@/lib/input';
import { HelperText } from '@/components/ui/HelperText';
import { Label } from '@/components/ui/Label';
import { useEffect, useId, useState } from 'react';
import { IconButton } from '../Button';
import { X } from 'lucide-react';

export function CurrencyInput({
  value = 0,
  onValueChange,
  currency = 'R$',
  label,
  helperText,
  error,
  disabled,
  className,
  onClear,
  id,
  ...props
}: CurrencyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  const [valueInCents, setValueInCents] = useState(Math.round(value * 100));

  useEffect(() => {
    setValueInCents(Math.round(value * 100));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    const newValueInCents = Number(digits || '0');
    setValueInCents(newValueInCents);
    onValueChange?.(newValueInCents / 100);
  }

  const formatted = (valueInCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col gap-sm">
      {label && <Label htmlFor={inputId}>{label}</Label>}

      <div
        className={cn(
          'group relative flex items-center rounded-default border overflow-hidden',
          getInputBorderColor(error, { variant: 'focus-within' }),
          disabled && 'opacity-50 cursor-not-allowed',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex items-center px-lg py-md',
            'body-default',
            'bg-background border-r',
            getInputBorderColor(error),
            'select-none'
          )}
        >
          {currency}
        </span>

        <input
          id={inputId}
          inputMode="numeric"
          disabled={disabled}
          value={formatted}
          onChange={handleChange}
          aria-invalid={error || undefined}
          aria-describedby={helperId}
          aria-label={label ? undefined : `Valor em ${currency}`}
          style={{ outline: 'none' }}
          className={cn(
            'flex-1 px-lg py-md w-full',
            'body-default text-content-primary',
            'bg-surface',
            'focus:ring-0',
            'disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {onClear && (
          <div className="absolute right-3">
            <IconButton
              icon={<X size={16} />}
              aria-label="Limpar campo"
              onClick={onClear}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            />
          </div>
        )}
      </div>

      {helperText && (
        <HelperText id={helperId} error={error}>
          {helperText}
        </HelperText>
      )}
    </div>
  );
}

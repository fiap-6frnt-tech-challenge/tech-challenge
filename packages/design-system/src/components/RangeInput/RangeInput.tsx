'use client';

import { useEffect, useId, useState } from 'react';
import { cn, getInputBorderColor } from '@bytebank/shared';
import { Label } from '../Label';
import type { IRangeInput } from './IRangeInput';

const DECIMAL_AMOUNT_PATTERN = /^\d{0,12}(\.\d{0,2})?$/;

function formatDisplayValue(value: number | undefined) {
  if (value === undefined) return '';

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatEditableValue(value: number | undefined) {
  if (value === undefined) return '';

  return String(value).replace('.', ',');
}

interface RangeFieldProps {
  id: string;
  label: string;
  ariaLabel: string;
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  currency: string;
  error: boolean;
  describedBy?: string;
  disabled: boolean;
}

function RangeField({
  id,
  label,
  ariaLabel,
  value,
  onValueChange,
  currency,
  error,
  describedBy,
  disabled,
}: RangeFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatDisplayValue(value));

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatDisplayValue(value));
    }
  }, [isFocused, value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    const normalizedValue = nextValue.replace(',', '.');

    if (!DECIMAL_AMOUNT_PATTERN.test(normalizedValue)) return;

    setDisplayValue(nextValue);

    if (normalizedValue === '') {
      onValueChange(undefined);
      return;
    }

    if (normalizedValue.endsWith('.')) return;

    const numericValue = Number(normalizedValue);
    if (Number.isFinite(numericValue)) {
      onValueChange(numericValue);
    }
  }

  function handleFocus() {
    setIsFocused(true);
    setDisplayValue(formatEditableValue(value));
  }

  function handleBlur() {
    setIsFocused(false);
    setDisplayValue(formatDisplayValue(value));
  }

  return (
    <div className="flex flex-col gap-sm">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          'relative flex items-center overflow-hidden rounded-default border bg-surface',
          getInputBorderColor(error, { variant: 'focus-within' }),
          'has-focus-visible:ring-2 has-focus-visible:ring-brand-primary',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex items-center border-r bg-background px-lg py-md body-default',
            getInputBorderColor(error)
          )}
        >
          {currency}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full flex-1 bg-surface px-lg py-md body-default text-content-primary',
            'placeholder:text-content-secondary',
            'focus:outline-none disabled:cursor-not-allowed'
          )}
        />
      </div>
    </div>
  );
}

export function RangeInput({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  currency = 'BRL',
  error,
  disabled = false,
}: IRangeInput) {
  const errorId = useId();
  const minInputId = useId();
  const maxInputId = useId();
  const isInvalidRange = minValue !== undefined && maxValue !== undefined && minValue > maxValue;
  const errorMessage =
    error ?? (isInvalidRange ? 'O valor mínimo não pode ser maior que o valor máximo' : undefined);
  const hasError = Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-sm">
      <div className="grid gap-md sm:grid-cols-2">
        <RangeField
          id={minInputId}
          label="De"
          ariaLabel="De, valor mínimo"
          value={minValue}
          onValueChange={onMinChange}
          currency={currency}
          disabled={disabled}
          error={hasError}
          describedBy={hasError ? errorId : undefined}
        />
        <RangeField
          id={maxInputId}
          label="Até"
          ariaLabel="Até, valor máximo"
          value={maxValue}
          onValueChange={onMaxChange}
          currency={currency}
          disabled={disabled}
          error={hasError}
          describedBy={hasError ? errorId : undefined}
        />
      </div>
      {hasError && (
        <p id={errorId} role="alert" className="mt-1 text-sm font-normal text-feedback-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

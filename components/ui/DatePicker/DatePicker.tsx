'use client';

import { cn } from '@/lib/classes';
import { getInputBorderColor } from '@/lib/input';
import { HelperText } from '@/components/ui/HelperText';
import { Label } from '@/components/ui/Label';
import type { DatePickerProps } from './IDatePicker';
import { forwardRef, useId } from 'react';
import { IconButton } from '../Button';
import { X } from 'lucide-react';

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, helperText, error, disabled, className, onClear, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="flex flex-col gap-sm">
        {label && <Label htmlFor={inputId}>{label}</Label>}

        <div className="group relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            type="date"
            disabled={disabled}
            aria-invalid={error || undefined}
            aria-describedby={helperId}
            className={cn(
              'w-full rounded-default border bg-surface cursor-pointer',
              'px-lg py-md',
              'body-default text-content-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:ring-1 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
              getInputBorderColor(error),
              className
            )}
            {...props}
          />
          {onClear && (
            <div className="absolute right-10">
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
);

DatePicker.displayName = 'DatePicker';

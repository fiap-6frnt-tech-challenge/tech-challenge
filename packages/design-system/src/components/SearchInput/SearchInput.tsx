'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@bytebank/shared';
import { IconButton } from '../Button';
import type { ISearchInput } from './ISearchInput';

export function SearchInput({
  value,
  onValueChange,
  placeholder = 'Buscar',
  debounceMs = 300,
  disabled = false,
  ariaLabel = 'Buscar transações',
}: ISearchInput) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const immediateEmitRef = useRef<string | null>(null);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (immediateEmitRef.current === draftValue) {
      immediateEmitRef.current = null;
      return;
    }

    if (draftValue === value) return;

    const timeoutId = window.setTimeout(() => {
      onValueChange(draftValue);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, draftValue, onValueChange, value]);

  function handleClear() {
    immediateEmitRef.current = '';
    setDraftValue('');
    onValueChange('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative flex items-center">
      <Search
        aria-hidden="true"
        size={18}
        className="pointer-events-none absolute left-lg text-content-secondary"
      />
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        value={draftValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => setDraftValue(event.target.value)}
        className={cn(
          'w-full rounded-default border border-border bg-surface py-md pl-2xl',
          'body-default text-content-primary placeholder:text-content-secondary',
          'transition duration-100 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
          draftValue !== '' ? 'pr-[56px]' : 'pr-2xl'
        )}
      />
      {draftValue !== '' && (
        <div className="absolute right-xs">
          <IconButton
            type="button"
            icon={<X size={16} />}
            aria-label="Limpar busca"
            disabled={disabled}
            onClick={handleClear}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { cn, getInputBorderColor } from '@bytebank/shared';
import { HelperText } from '../HelperText';
import type { MultiSelectProps } from './IMultiSelect';

export function MultiSelect<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchable = false,
  disabled = false,
  error,
  'aria-label': ariaLabel,
}: MultiSelectProps<T>) {
  const id = useId();
  const listboxId = `${id}-listbox`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const filteredOptions =
    searchable && search
      ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : options;

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(0);
    if (searchable) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function closeDropdown() {
    setOpen(false);
    setActiveIndex(-1);
    setSearch('');
    triggerRef.current?.focus();
  }

  function toggleOption(optValue: T) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openDropdown();
        else setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (!open) openDropdown();
        else if (activeIndex >= 0) toggleOption(filteredOptions[activeIndex].value);
        break;
      case ' ':
        if (!searchable) {
          e.preventDefault();
          if (!open) openDropdown();
          else if (activeIndex >= 0) toggleOption(filteredOptions[activeIndex].value);
        }
        break;
      case 'Backspace':
        if ((!searchable || search === '') && value.length > 0) {
          onChange(value.slice(0, -1));
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      case 'Tab':
        if (open) {
          setOpen(false);
          setActiveIndex(-1);
          setSearch('');
        }
        break;
    }
  }

  const borderColor = getInputBorderColor(!!error, { active: open });

  return (
    <div className="flex flex-col gap-sm">
      <div ref={containerRef} className="relative">
        <div
          ref={!searchable ? triggerRef : undefined}
          role={!searchable ? 'combobox' : undefined}
          tabIndex={!searchable && !disabled ? 0 : undefined}
          aria-label={!searchable ? ariaLabel : undefined}
          aria-haspopup={!searchable ? 'listbox' : undefined}
          aria-expanded={!searchable ? open : undefined}
          aria-controls={!searchable && open ? listboxId : undefined}
          aria-activedescendant={
            !searchable && open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          aria-disabled={disabled}
          onKeyDown={!searchable ? handleKeyDown : undefined}
          onClick={() => (open ? closeDropdown() : openDropdown())}
          className={cn(
            'flex flex-wrap items-center gap-xs min-h-[44px]',
            'bg-surface rounded-default border cursor-pointer',
            'px-lg py-sm',
            searchable
              ? 'focus-within:ring-2 focus-within:ring-brand-primary focus-within:outline-none'
              : 'focus:ring-2 focus:ring-brand-primary focus:outline-none',
            borderColor,
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
        >
          {value.map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? v;
            return (
              <span
                key={v}
                className="inline-flex items-center gap-xs rounded-full border border-brand-primary bg-badge-transfer-bg text-brand-primary px-sm py-0.5 text-sm"
              >
                {label}
                <button
                  type="button"
                  aria-label={`Remover ${label}`}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((vv) => vv !== v));
                  }}
                  className="rounded-full hover:bg-brand-primary/20 focus-visible:ring-1 focus-visible:ring-brand-primary"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}

          {searchable ? (
            <input
              ref={inputRef}
              role="combobox"
              aria-label={ariaLabel}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listboxId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={
                open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
              }
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder={value.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[60px] bg-transparent pointer-events-none outline-none text-content-primary placeholder:text-placeholder text-sm focus-visible:outline-none!"
            />
          ) : (
            value.length === 0 && (
              <span
                aria-hidden="true"
                className="flex-1 text-placeholder text-sm pointer-events-none"
              >
                {placeholder}
              </span>
            )
          )}

          <ChevronDown
            size={20}
            className={cn(
              'ml-auto flex-shrink-0 text-content-primary transition-transform duration-200',
              open ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>

        {open && (
          <ul
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label="Opções"
            className="absolute top-full z-50 w-full mt-1 bg-surface rounded-default border border-border shadow-card overflow-y-auto max-h-60"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-lg py-md text-content-secondary text-sm">
                Nenhuma opção encontrada
              </li>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = value.includes(opt.value);
                const isActive = activeIndex === i;
                return (
                  <li
                    key={opt.value}
                    id={`${id}-option-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault(); // evita blur no input
                      toggleOption(opt.value);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'flex items-center justify-between px-lg py-md',
                      'body-default text-content-primary cursor-pointer transition-colors',
                      isActive
                        ? 'bg-badge-transfer-bg text-brand-primary'
                        : isSelected
                          ? 'bg-badge-transfer-bg/50 text-brand-primary'
                          : 'hover:bg-badge-transfer-bg/50'
                    )}
                  >
                    {opt.label}
                    {isSelected && <Check size={16} className="flex-shrink-0 text-brand-primary" />}
                  </li>
                );
              })
            )}

            {value.length > 0 && (
              <li className="border-t border-border">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange([]);
                  }}
                  className="w-full px-lg py-md text-left text-sm text-feedback-danger hover:bg-badge-withdraw-bg transition-colors"
                >
                  Limpar tudo
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <HelperText error>{error}</HelperText>}
    </div>
  );
}

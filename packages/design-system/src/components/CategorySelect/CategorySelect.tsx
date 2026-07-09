'use client';

import { CATEGORIES, cn, getInputBorderColor, type CategoryId } from '@bytebank/shared';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { HelperText } from '../HelperText';
import { Label } from '../Label';
import type { ICategorySelect } from './ICategorySelect';

export function CategorySelect({
  value,
  onChange,
  suggestedCategory,
  disabled,
  error,
  label,
  placeholder = 'Selecione uma categoria',
  id,
  className,
}: ICategorySelect) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listboxId = `${selectId}-listbox`;
  const errorId = `${selectId}-error`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(() => {
    const base = CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      suggested: false,
    }));

    const suggested = base.find((option) => option.id === suggestedCategory);
    if (!suggested) return base;

    return [
      { ...suggested, suggested: true },
      ...base.filter((option) => option.id !== suggestedCategory),
    ];
  }, [suggestedCategory]);

  const selectedLabel = options.find((option) => option.id === value)?.label;
  const hasError = Boolean(error);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const activeOption = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    activeOption?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function openDropdown(startIndex?: number) {
    const idx = startIndex ?? options.findIndex((option) => option.id === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setActiveIndex(-1);
    buttonRef.current?.focus();
  }

  function handleSelect(optionValue: CategoryId) {
    onChange(optionValue);
    closeDropdown();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) {
          if (activeIndex >= 0) handleSelect(options[activeIndex].id);
          else closeDropdown();
        } else {
          openDropdown();
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!open) openDropdown();
        else setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!open) openDropdown(options.length - 1);
        else setActiveIndex((i) => Math.max(i - 1, 0));
        break;

      case 'Home':
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;

      case 'End':
        if (open) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;

      case 'Escape':
        event.preventDefault();
        closeDropdown();
        break;

      case 'Tab':
        if (open) {
          setOpen(false);
          setActiveIndex(-1);
        }
        break;
    }
  }

  const borderColor = getInputBorderColor(hasError, { active: open });

  return (
    <div className="flex flex-col gap-sm">
      {label && <Label htmlFor={selectId}>{label}</Label>}

      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={label ? undefined : 'Categoria'}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          onKeyDown={handleKeyDown}
          onClick={() => (open ? closeDropdown() : openDropdown())}
          className={cn(
            'w-full flex items-center justify-between cursor-pointer',
            'bg-surface rounded-default border',
            borderColor,
            'px-lg py-md',
            'body-default',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:ring-2 focus-visible:ring-brand-primary',
            className
          )}
        >
          <span className={cn(value ? 'text-content-primary' : 'text-placeholder')}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronDown
            size={24}
            strokeWidth={2}
            className={cn(
              'transition-transform duration-200',
              hasError ? 'text-feedback-danger' : 'text-content-primary',
              open ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={0}
            aria-label={label ?? 'Categorias'}
            className={cn(
              'absolute z-50 w-full mt-1',
              'bg-surface rounded-default border',
              borderColor,
              'max-h-60 overflow-y-auto overscroll-contain shadow-card'
            )}
          >
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`${selectId}-option-${index}`}
                role="option"
                aria-selected={value === option.id}
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex items-center justify-between gap-md px-lg py-md',
                  'body-default text-content-primary',
                  'cursor-pointer transition-colors',
                  activeIndex === index
                    ? 'bg-badge-transfer-bg text-brand-primary outline-none ring-inset ring-brand-primary'
                    : value === option.id
                      ? 'bg-badge-transfer-bg text-brand-primary'
                      : 'hover:bg-badge-transfer-bg'
                )}
              >
                <span>{option.label}</span>
                {option.suggested && (
                  <span className="inline-flex items-center rounded-md bg-brand-primary px-2 py-0.5 text-xs font-medium text-content-inverse">
                    Sugerido
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasError && (
        <HelperText id={errorId} error>
          {error}
        </HelperText>
      )}
    </div>
  );
}

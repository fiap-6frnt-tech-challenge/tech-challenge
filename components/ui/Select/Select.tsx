import { getInputBorderColor } from '@/lib/input';
import { cn } from '@/lib/classes';
import { HelperText } from '@/components/ui/HelperText';
import { Label } from '@/components/ui/Label';
import type { SelectProps } from './ISelect';
import { ChevronDown, X } from 'lucide-react';
import { useState, useRef, useEffect, useId } from 'react';
import { IconButton } from '../Button';

export function Select({
  options,
  placeholder,
  label,
  helperText,
  error,
  disabled,
  className,
  id,
  value,
  onChange,
  onClear,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listboxId = `${selectId}-listbox`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = value ?? '';
  const selectedLabel = options.find((o) => o.value === selected)?.label;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openDropdown(startIndex?: number) {
    const idx = startIndex ?? options.findIndex((o) => o.value === selected);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setActiveIndex(-1);
    buttonRef.current?.focus();
  }

  function handleSelect(optValue: string) {
    onChange?.(optValue);
    closeDropdown();
  }

  function handleButtonKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) {
          if (activeIndex >= 0) handleSelect(options[activeIndex].value);
          else closeDropdown();
        } else {
          openDropdown();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          openDropdown();
        } else {
          setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          openDropdown(options.length - 1);
        } else {
          setActiveIndex((i) => Math.max(i - 1, 0));
        }
        break;

      case 'Home':
        e.preventDefault();
        if (open) setActiveIndex(0);
        break;

      case 'End':
        e.preventDefault();
        if (open) setActiveIndex(options.length - 1);
        break;

      case 'Escape':
        e.preventDefault();
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

  const borderColor = getInputBorderColor(error, { active: open });
  const iconClass = error ? 'text-feedback-danger' : 'text-brand-primary';

  return (
    <div className="flex flex-col gap-sm">
      {label && <Label htmlFor={selectId}>{label}</Label>}

      <div ref={containerRef} className="group relative">
        <button
          ref={buttonRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          onKeyDown={handleButtonKeyDown}
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
          {...props}
        >
          <span className={cn(selected ? 'text-content-primary' : 'text-placeholder')}>
            {selectedLabel ?? placeholder ?? ''}
          </span>
        </button>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          {onClear && selected && (
            <div className="pointer-events-auto">
              <IconButton
                icon={<X size={16} />}
                aria-label="Limpar campo"
                onClick={onClear}
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              />
            </div>
          )}
          <ChevronDown
            size={24}
            strokeWidth={2}
            className={cn(
              iconClass,
              'transition-transform duration-200 text-content-primary',
              open ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>

        {open && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label ?? 'Opções'}
            className={cn(
              'absolute z-50 w-full mt-1',
              'bg-surface rounded-default border',
              borderColor,
              'overflow-hidden shadow-card'
            )}
          >
            {options.map((opt, i) => (
              <li
                key={opt.value}
                id={`${selectId}-option-${i}`}
                role="option"
                aria-selected={selected === opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex items-center px-lg py-md',
                  'body-default text-content-primary',
                  'cursor-pointer transition-colors',
                  activeIndex === i
                    ? 'bg-badge-transfer-bg text-brand-primary outline-none ring-inset ring-brand-primary'
                    : selected === opt.value
                      ? 'bg-badge-transfer-bg text-brand-primary'
                      : 'hover:bg-badge-transfer-bg'
                )}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {helperText && <HelperText error={error}>{helperText}</HelperText>}
    </div>
  );
}

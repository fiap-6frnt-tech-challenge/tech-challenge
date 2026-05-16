'use client';

import { cn } from '@/lib/classes';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationProps } from './IPagination';

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

const navButtonClass = cn(
  'flex h-9 w-9 items-center justify-center rounded-default',
  'text-content-secondary transition-colors',
  'hover:bg-surface hover:text-content-primary',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-content-secondary',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary focus-visible:ring-offset-1'
);

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-1 py-md shrink-0">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
        className={navButtonClass}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-9 w-9 items-center justify-center body-default text-content-secondary select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-label={`Página ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-default body-default transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
              p === currentPage
                ? 'bg-brand-primary text-white font-semibold'
                : 'text-content-secondary hover:bg-surface hover:text-content-primary'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
        className={navButtonClass}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionFilters } from './TransactionFilters';
import { DEFAULT_FILTERS } from './ITransactionFilters';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderFilters(onClear = vi.fn()) {
  const onSearchChange = vi.fn();
  const onMinChange = vi.fn();
  const onMaxChange = vi.fn();
  const view = render(
    <TransactionFilters
      value={DEFAULT_FILTERS}
      isFilterVisible
      onChange={vi.fn()}
      onSearchChange={onSearchChange}
      onMinChange={onMinChange}
      onMaxChange={onMaxChange}
      onClear={onClear}
    />
  );
  return { view, onSearchChange, onMinChange, onMaxChange, onClear };
}

describe('TransactionFilters reactive controls', () => {
  it('forwards search input immediately to the stream adapter', () => {
    const { onSearchChange } = renderFilters();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'uber' } });
    expect(onSearchChange).toHaveBeenCalledExactlyOnceWith('uber');
  });

  it('keeps newer typing when an older URL search value arrives', () => {
    const { view, onSearchChange, onMinChange, onMaxChange } = renderFilters();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'su' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sup' } });
    view.rerender(
      <TransactionFilters
        value={{ ...DEFAULT_FILTERS, q: 'su' }}
        searchEmission={{ q: 'su', sequence: 1 }}
        isFilterVisible
        onChange={vi.fn()}
        onSearchChange={onSearchChange}
        onMinChange={onMinChange}
        onMaxChange={onMaxChange}
      />
    );
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('sup');
  });

  it('applies an external URL value even if it matches a canceled typed prefix', () => {
    const { view, onSearchChange, onMinChange, onMaxChange } = renderFilters();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'a' } });
    view.rerender(
      <TransactionFilters
        value={{ ...DEFAULT_FILTERS, q: 'ab' }}
        isFilterVisible
        onChange={vi.fn()}
        onSearchChange={onSearchChange}
        onMinChange={onMinChange}
        onMaxChange={onMaxChange}
      />
    );
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('ab');
  });

  it('applies a later external URL value that repeats an acknowledged search', () => {
    const { view, onSearchChange, onMinChange, onMaxChange } = renderFilters();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'uber' } });
    const props = {
      isFilterVisible: true,
      onChange: vi.fn(),
      onSearchChange,
      onMinChange,
      onMaxChange,
      searchEmission: { q: 'uber', sequence: 1 },
    };
    view.rerender(<TransactionFilters {...props} value={{ ...DEFAULT_FILTERS, q: 'uber' }} />);
    view.rerender(<TransactionFilters {...props} value={{ ...DEFAULT_FILTERS, q: 'food' }} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'other' } });
    view.rerender(<TransactionFilters {...props} value={{ ...DEFAULT_FILTERS, q: 'uber' }} />);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('uber');
  });

  it('loads an external URL search value into the field', () => {
    const { view, onSearchChange, onMinChange, onMaxChange } = renderFilters();
    view.rerender(
      <TransactionFilters
        value={{ ...DEFAULT_FILTERS, q: 'mercado' }}
        isFilterVisible
        onChange={vi.fn()}
        onSearchChange={onSearchChange}
        onMinChange={onMinChange}
        onMaxChange={onMaxChange}
      />
    );
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('mercado');
  });

  it('keeps an amount draft visible when the field blurs before URL debounce', () => {
    const { onMinChange } = renderFilters();
    const min = screen.getByRole('textbox', { name: 'De, valor mínimo' });
    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: '120' } });
    expect(onMinChange).toHaveBeenCalledWith(120);
    fireEvent.blur(min);
    expect((min as HTMLInputElement).value).toBe('120,00');
  });

  it('clears a pending search draft even when the URL filter is already empty', () => {
    const { onClear } = renderFilters();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'uber' } });
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('uber');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onClear).toHaveBeenCalledOnce();
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  });
});

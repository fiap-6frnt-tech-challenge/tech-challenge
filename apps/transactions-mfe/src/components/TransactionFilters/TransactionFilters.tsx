'use client';

import { Select } from '@bytebank/design-system';
import { DatePicker } from '@bytebank/design-system';
import { Button } from '@bytebank/design-system';
import { SearchInput } from '@bytebank/design-system';
import { RangeInput } from '@bytebank/design-system';
import { MultiSelect } from '@bytebank/design-system';
import { TRANSACTION_TYPE_OPTIONS, CATEGORIES } from '@bytebank/shared';
import type { TransactionFiltersProps } from './ITransactionFilters';

const TYPE_OPTIONS = [{ label: 'Todos', value: 'all' }, ...TRANSACTION_TYPE_OPTIONS];

const SORT_BY_OPTIONS = [
  { label: 'Data', value: 'date' },
  { label: 'Valor', value: 'amount' },
];

const SORT_ORDER_DATE_OPTIONS = [
  { label: 'Mais recente', value: 'desc' },
  { label: 'Mais antigo', value: 'asc' },
];

const SORT_ORDER_AMOUNT_OPTIONS = [
  { label: 'Maior valor', value: 'desc' },
  { label: 'Menor valor', value: 'asc' },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({
  value: c.id,
  label: c.label,
}));

export function TransactionFilters({
  value,
  isFilterVisible,
  onChange,
  onClear,
}: TransactionFiltersProps) {
  const sortOrderOptions =
    value.sortBy === 'amount' ? SORT_ORDER_AMOUNT_OPTIONS : SORT_ORDER_DATE_OPTIONS;

  return (
    <div className="flex flex-col gap-md">
      <SearchInput
        value={value.q}
        onValueChange={(q) => onChange({ ...value, q })}
        placeholder="Buscar por descrição..."
        debounceMs={300}
      />
      <div
        className={`bg-background flex flex-col gap-md pb-lg ${isFilterVisible ? 'block filter-panel-in [animation:filter-panel-in_0.2s_ease-out]' : 'hidden'}`}
      >
        <div className="flex flex-wrap items-end gap-md">
          <div className="min-w-40 flex-1">
            <Select
              label="Tipo"
              options={TYPE_OPTIONS}
              value={value.type}
              onChange={(type) => onChange({ ...value, type: type as typeof value.type })}
            />
          </div>

          <div className="min-w-40 flex-1">
            <DatePicker
              label="De"
              value={value.dateFrom}
              max={value.dateTo || undefined}
              onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            />
          </div>

          <div className="min-w-40 flex-1">
            <DatePicker
              label="Até"
              value={value.dateTo}
              min={value.dateFrom || undefined}
              onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            />
          </div>

          <div className="min-w-40 flex-1">
            <Select
              label="Ordenar por"
              options={SORT_BY_OPTIONS}
              value={value.sortBy}
              onChange={(sortBy) =>
                onChange({ ...value, sortBy: sortBy as typeof value.sortBy, sortOrder: 'desc' })
              }
            />
          </div>

          <div className="min-w-40 flex-1">
            <Select
              label="Ordem"
              options={sortOrderOptions}
              value={value.sortOrder}
              onChange={(sortOrder) =>
                onChange({ ...value, sortOrder: sortOrder as typeof value.sortOrder })
              }
            />
          </div>
        </div>

        <RangeInput
          minValue={value.amount_gte}
          maxValue={value.amount_lte}
          onMinChange={(v) => onChange({ ...value, amount_gte: v })}
          onMaxChange={(v) => onChange({ ...value, amount_lte: v })}
        />

        <MultiSelect
          options={CATEGORY_OPTIONS}
          value={value.category}
          onChange={(category) => onChange({ ...value, category })}
          placeholder="Todas as categorias"
          searchable
        />

        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear} className="w-full sm:w-auto">
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}

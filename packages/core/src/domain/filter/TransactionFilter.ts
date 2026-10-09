import { listTransactionsQuerySchema } from '../../schemas/transaction';
import type { TransactionType } from '../transaction/TransactionType';

export interface TransactionFilter {
  type: TransactionType | 'all';
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
  q: string;
  amount_gte: number | undefined;
  amount_lte: number | undefined;
  category: string[];
}

export interface PageRequest {
  page: number;
  perPage: number;
}

interface CodecOptions {
  allowLegacy?: boolean;
  includeDefaults?: boolean;
  legacyNames?: boolean;
}

function canonicalParams(params: URLSearchParams, allowLegacy: boolean): URLSearchParams {
  const result = new URLSearchParams(params);
  if (!allowLegacy) return result;

  const aliases = [
    ['page', '_page'],
    ['dateFrom', 'date_gte'],
    ['dateTo', 'date_lte'],
  ] as const;
  for (const [oldKey, newKey] of aliases) {
    if (result.has(oldKey) && !result.has(newKey)) result.set(newKey, result.get(oldKey) ?? '');
    result.delete(oldKey);
  }

  if (result.has('sortBy') || result.has('sortOrder')) {
    if (!result.has('_sort')) {
      const by = result.get('sortBy') ?? 'date';
      const order = result.get('sortOrder') ?? 'desc';
      result.set('_sort', `${order === 'asc' ? '' : '-'}${by}`);
    }
    result.delete('sortBy');
    result.delete('sortOrder');
  }
  if (result.get('type') === 'all') result.delete('type');
  return result;
}

export function fromSearchParams(
  params: URLSearchParams,
  options: Pick<CodecOptions, 'allowLegacy'> = {}
): { filter: TransactionFilter; page: PageRequest } {
  const canonical = canonicalParams(params, options.allowLegacy ?? false);
  const raw: Record<string, unknown> = Object.fromEntries(canonical);
  if (canonical.has('category')) raw.category = canonical.getAll('category');
  const parsed = listTransactionsQuerySchema.parse(raw);

  return {
    filter: {
      type: parsed.type ?? 'all',
      dateFrom: parsed.date_gte ?? '',
      dateTo: parsed.date_lte ?? '',
      sortBy: parsed._sort.endsWith('amount') ? 'amount' : 'date',
      sortOrder: parsed._sort.startsWith('-') ? 'desc' : 'asc',
      q: parsed.q ?? '',
      amount_gte: parsed.amount_gte,
      amount_lte: parsed.amount_lte,
      category: parsed.category,
    },
    page: { page: parsed._page, perPage: parsed._per_page },
  };
}

export function toSearchParams(
  filter: Partial<TransactionFilter>,
  page: PageRequest,
  options: Pick<CodecOptions, 'includeDefaults' | 'legacyNames'> = {}
): URLSearchParams {
  const params = new URLSearchParams();
  const includeDefaults = options.includeDefaults ?? true;
  if (includeDefaults || page.page !== 1) params.set('_page', String(page.page));
  if (includeDefaults || page.perPage !== 10) params.set('_per_page', String(page.perPage));
  if (filter.type && filter.type !== 'all') params.set('type', filter.type);
  if (filter.dateFrom) params.set('date_gte', filter.dateFrom);
  if (filter.dateTo) params.set('date_lte', filter.dateTo);
  if (filter.q) params.set('q', filter.q);
  if (filter.amount_gte !== undefined) params.set('amount_gte', String(filter.amount_gte));
  if (filter.amount_lte !== undefined) params.set('amount_lte', String(filter.amount_lte));
  filter.category?.forEach((category) => params.append('category', category));

  const sortBy = filter.sortBy ?? 'date';
  const sortOrder = filter.sortOrder ?? 'desc';
  if (includeDefaults || sortBy !== 'date' || sortOrder !== 'desc') {
    params.set('_sort', `${sortOrder === 'asc' ? '' : '-'}${sortBy}`);
  }

  fromSearchParams(params);
  if (!options.legacyNames) return params;

  const browser = new URLSearchParams();
  if (params.has('type')) browser.set('type', params.get('type') ?? '');
  if (params.has('date_gte')) browser.set('dateFrom', params.get('date_gte') ?? '');
  if (params.has('date_lte')) browser.set('dateTo', params.get('date_lte') ?? '');
  const sort = params.get('_sort');
  if (sort) {
    const by = sort.endsWith('amount') ? 'amount' : 'date';
    const order = sort.startsWith('-') ? 'desc' : 'asc';
    if (includeDefaults || by !== 'date') browser.set('sortBy', by);
    if (includeDefaults || order !== 'desc') browser.set('sortOrder', order);
  }
  if (params.has('q')) browser.set('q', params.get('q') ?? '');
  if (params.has('amount_gte')) browser.set('amount_gte', params.get('amount_gte') ?? '');
  if (params.has('amount_lte')) browser.set('amount_lte', params.get('amount_lte') ?? '');
  params.getAll('category').forEach((category) => browser.append('category', category));
  if (params.has('_page')) browser.set('page', params.get('_page') ?? '1');
  if (params.has('_per_page') && page.perPage !== 10) {
    browser.set('_per_page', params.get('_per_page') ?? '10');
  }
  return browser;
}

export function normalizeTransactionFilter(filter: Partial<TransactionFilter>): TransactionFilter {
  return fromSearchParams(toSearchParams(filter, { page: 1, perPage: 10 })).filter;
}

export interface BrowserFilterState {
  filter: TransactionFilter;
  page: number;
}

export function toBrowserSearchParams(
  filter: Partial<TransactionFilter>,
  page = 1
): URLSearchParams {
  return toSearchParams(
    filter,
    { page: Math.max(1, page), perPage: 10 },
    { includeDefaults: false, legacyNames: true }
  );
}

export function fromBrowserSearchParams(params: URLSearchParams): BrowserFilterState {
  try {
    const decoded = fromSearchParams(params, { allowLegacy: true });
    return { filter: decoded.filter, page: decoded.page.page };
  } catch {
    return { filter: normalizeTransactionFilter({}), page: 1 };
  }
}

export function hasActiveFilter(filter: Partial<TransactionFilter>): boolean {
  return toBrowserSearchParams(filter).size > 0;
}

import { CATEGORIES } from '../category/categories';
import { ValidationError } from '../errors';
import { TRANSACTION_TYPE, type TransactionType } from '../transaction/TransactionType';

export interface TransactionQuery {
  _page: number;
  _per_page: number;
  _sort: 'date' | '-date' | 'amount' | '-amount';
  type?: TransactionType;
  date_gte?: string;
  date_lte?: string;
  q?: string;
  category: string[];
  amount_gte?: number;
  amount_lte?: number;
}

const fields = new Set([
  '_page',
  '_per_page',
  '_sort',
  'type',
  'date_gte',
  'date_lte',
  'q',
  'category',
  'amount_gte',
  'amount_lte',
]);
const categoryIds = new Set<string>(CATEGORIES.map(({ id }) => id));

function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

/** One query contract for the browser codec and the optional Zod HTTP adapter. */
export function parseTransactionQuery(input: unknown): TransactionQuery {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError([{ code: 'custom', path: [], message: 'Consulta inválida' }]);
  }
  const raw = input as Record<string, unknown>;
  const issues: { code: 'custom'; path: string[]; message: string }[] = [];
  const invalid = (field: string) =>
    issues.push({ code: 'custom', path: [field], message: 'Valor inválido' });
  const extra = Object.keys(raw).filter((key) => !fields.has(key));
  if (extra.length)
    issues.push({ code: 'custom', path: [], message: `Campos desconhecidos: ${extra.join(', ')}` });

  const number = (
    field: string,
    minimum: number,
    fallback?: number,
    maximum = Infinity,
    integer = false
  ): number | undefined => {
    if (raw[field] === undefined) return fallback;
    let value: number;
    try {
      value = Number(raw[field]);
    } catch {
      invalid(field);
      return undefined;
    }
    if (
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum ||
      (integer && !Number.isSafeInteger(value))
    )
      invalid(field);
    return value;
  };
  const result: TransactionQuery = {
    _page: number('_page', 1, 1, Infinity, true)!,
    _per_page: number('_per_page', 1, 10, 100, true)!,
    _sort: '-date',
    category: [],
  };
  if (raw._sort !== undefined) {
    if (['date', '-date', 'amount', '-amount'].includes(raw._sort as string))
      result._sort = raw._sort as TransactionQuery['_sort'];
    else invalid('_sort');
  }
  if (raw.type !== undefined) {
    if (Object.values(TRANSACTION_TYPE).includes(raw.type as TransactionType))
      result.type = raw.type as TransactionType;
    else invalid('type');
  }
  for (const key of ['date_gte', 'date_lte'] as const) {
    if (raw[key] === undefined) continue;
    if (isISODate(raw[key])) result[key] = raw[key];
    else invalid(key);
  }
  if (raw.q !== undefined) {
    if (typeof raw.q === 'string' && raw.q.trim().length <= 100 && !raw.q.includes('\u0000'))
      result.q = raw.q.trim();
    else invalid('q');
  }
  if (raw.category !== undefined) {
    if (
      Array.isArray(raw.category) &&
      raw.category.length <= 20 &&
      raw.category.every((value) => typeof value === 'string' && categoryIds.has(value))
    )
      result.category = raw.category;
    else invalid('category');
  }
  for (const key of ['amount_gte', 'amount_lte'] as const) {
    if (raw[key] !== undefined) result[key] = number(key, 0);
  }
  if (issues.length) throw new ValidationError(issues);
  return result;
}

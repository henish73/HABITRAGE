import type { TransactionFilterParams } from '@financeos/shared';

/**
 * One definition of "which transactions match" shared by the list API, the CSV
 * export, bulk actions and the printable report, so they can never disagree.
 */

export const SORT_FIELDS = ['date', 'amount', 'merchant', 'category', 'classification', 'type', 'node', 'source_node'] as const;
export const STATUSES = ['posted', 'pending', 'all'] as const;
export const TX_TYPES = ['Inflow', 'Outflow', 'Transfers'] as const;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function finite(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function isoDay(value: unknown): string | undefined {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return undefined;
  const d = new Date(`${value}T12:00:00Z`);
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? undefined : value;
}

function stringList(value: unknown, max = 200): string[] | undefined {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const list = raw
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
  return list.length > 0 ? list : undefined;
}

/** Cleans a plain object (query values or a JSON body) into safe filter params, dropping anything unexpected. */
export function sanitizeFilters(input: Record<string, unknown> | null | undefined): TransactionFilterParams {
  const src = input ?? {};
  let date_from = isoDay(src.date_from);
  let date_to = isoDay(src.date_to);
  // A reversed range means the user picked the dates in the wrong order; honour what they meant.
  if (date_from && date_to && date_from > date_to) [date_from, date_to] = [date_to, date_from];

  let amount_min = finite(src.amount_min);
  let amount_max = finite(src.amount_max);
  if (amount_min !== undefined && amount_max !== undefined && amount_min > amount_max) {
    [amount_min, amount_max] = [amount_max, amount_min];
  }

  const type = typeof src.type === 'string' && src.type !== 'all' ? oneOf(src.type, TX_TYPES) : undefined;
  const status = oneOf(src.status, STATUSES);

  return {
    search: typeof src.search === 'string' && src.search.trim() ? src.search.trim().slice(0, 200) : undefined,
    account_ids: stringList(src.account_ids),
    banks: stringList(src.banks),
    categories: stringList(src.categories),
    types: stringList(src.types)?.filter((t) => (TX_TYPES as readonly string[]).includes(t)),
    type,
    status: status && status !== 'all' ? status : undefined,
    source_file: typeof src.source_file === 'string' && src.source_file ? src.source_file.slice(0, 200) : undefined,
    needs_review: src.needs_review === true || src.needs_review === 'true' ? true : undefined,
    date_from,
    date_to,
    amount_min,
    amount_max,
    sort_by: oneOf(src.sort_by, SORT_FIELDS) ?? 'date',
    sort_order: oneOf(src.sort_order, ['asc', 'desc'] as const) ?? 'desc',
  };
}

/** Reads the filters out of a request's query string. */
export function filtersFromSearchParams(sp: URLSearchParams): TransactionFilterParams {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  return sanitizeFilters(obj);
}

export interface Paging {
  page: number;
  limit: number;
}

export function pagingFromSearchParams(sp: URLSearchParams, maxLimit: number, defaultLimit = 50): Paging {
  const page = Math.max(1, Math.floor(finite(sp.get('page')) ?? 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(finite(sp.get('limit')) ?? defaultLimit)));
  return { page, limit };
}

/** Serialises filters back into a query string (used to hand the same filters to /report). */
export function filtersToQuery(f: TransactionFilterParams): string {
  const sp = new URLSearchParams();
  const put = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  };
  put('search', f.search);
  put('status', f.status);
  put('type', f.type);
  put('needs_review', f.needs_review ? 'true' : undefined);
  put('date_from', f.date_from);
  put('date_to', f.date_to);
  put('amount_min', f.amount_min);
  put('amount_max', f.amount_max);
  put('sort_by', f.sort_by);
  put('sort_order', f.sort_order);
  f.categories?.forEach((c) => sp.append('categories', c));
  f.account_ids?.forEach((a) => sp.append('account_ids', a));
  return sp.toString();
}

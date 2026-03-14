import type { FilterState } from './types';

type QueryBase = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export type FilterRecord = Record<string, string[] | undefined>;

export function buildQueryFromFilterState<T extends FilterRecord>(
  base: QueryBase,
  state: FilterState,
  allowedKeys: readonly string[],
): QueryBase & { filters?: T } {
  const filters = {} as T;

  for (const rawKey of allowedKeys) {
    const key = rawKey as keyof T;
    const values = state[rawKey];
    if (!values || values.length === 0) {
      continue;
    }
    filters[key] = Array.from(new Set(values)).sort() as T[keyof T];
  }

  return {
    ...base,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}

export function buildFilterStateFromQuery<T extends FilterRecord>(
  filters: T | undefined,
  allowedKeys: readonly string[],
): FilterState {
  const state: FilterState = {};

  for (const rawKey of allowedKeys) {
    const key = rawKey as keyof T;
    const values = filters?.[key];
    if (!values || values.length === 0) {
      state[rawKey] = undefined;
      continue;
    }
    state[rawKey] = Array.from(new Set(values)).sort();
  }

  return state;
}

export function serializeFilters(filters: FilterRecord | undefined): string | undefined {
  if (!filters) {
    return undefined;
  }

  const normalized: Record<string, string[]> = {};

  for (const key of Object.keys(filters).sort()) {
    const values = filters[key];
    if (!values || values.length === 0) {
      continue;
    }
    normalized[key] = Array.from(new Set(values)).sort();
  }

  if (Object.keys(normalized).length === 0) {
    return undefined;
  }

  return JSON.stringify(normalized);
}

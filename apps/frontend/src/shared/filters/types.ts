import type { ReactNode } from 'react';

export type FilterValue = string[];
export type FilterState = Record<string, FilterValue | undefined>;
export type FilterOptionSource = 'static' | 'remote';

export interface FilterOption {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  color?: string;
}

export interface FilterSchema {
  id: string;
  label: string;
  icon?: ReactNode;
  options: FilterOption[];
  searchable?: boolean;
  multiSelect?: boolean;
  source?: FilterOptionSource;
}

export type FilterGroup = FilterSchema;


import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { FilterPanel } from './filter-panel';
import type { FilterGroup, FilterState } from '@/shared/filters/types';

interface FilterToolbarProps {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  groups: FilterGroup[];
  selectedFilters: FilterState;
  onFilterChange: (filterId: string, value: string[] | undefined) => void;
  className?: string;
}

export function FilterToolbar({
  searchValue,
  searchPlaceholder = 'Search...',
  onSearchChange,
  groups,
  selectedFilters,
  onFilterChange,
  className,
}: FilterToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}>
      <div className="relative flex-1 min-w-50 max-w-90">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-content-text-muted"
        />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9"
        />
      </div>

      <FilterPanel
        groups={groups}
        selectedFilters={selectedFilters}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}


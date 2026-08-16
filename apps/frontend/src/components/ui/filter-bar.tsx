/**
 * FilterBar - 筛选栏组件
 * 统一的筛选、搜索、视图切换组件
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  LayoutList,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type FilterValue = string | number | boolean | null | undefined;

export interface SelectOption {
  value: string;
  label: string;
}

export interface BaseFilter {
  type: 'select' | 'native-select' | 'search' | 'view-mode' | 'group-by' | 'custom';
  /** 唯一标识 */
  key: string;
  /** 占位符文本 */
  placeholder?: string;
}

export interface SelectFilter extends BaseFilter {
  type: 'select';
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  options: SelectOption[];
  width?: string;
}

export interface NativeSelectFilter extends BaseFilter {
  type: 'native-select';
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  options: SelectOption[];
}

export interface SearchFilter extends BaseFilter {
  type: 'search';
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
}

export type ViewModeFilterValue = 'list' | 'grid' | 'board';

export interface ViewModeFilter extends BaseFilter {
  type: 'view-mode';
  value: ViewModeFilterValue;
  onValueChange: (value: ViewModeFilterValue) => void;
  modes?: ViewModeFilterValue[];
}

export interface GroupByFilter extends BaseFilter {
  type: 'group-by';
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** 是否显示，根据条件显示/隐藏 */
  showWhen?: boolean;
  width?: string;
}

export interface CustomFilter extends BaseFilter {
  type: 'custom';
  render: () => React.ReactNode;
}

export type FilterItem =
  | SelectFilter
  | NativeSelectFilter
  | SearchFilter
  | ViewModeFilter
  | GroupByFilter
  | CustomFilter;

export interface FilterBarProps {
  /** 筛选项配置 */
  filters: FilterItem[];
  /** 额外自定义渲染 */
  renderExtra?: () => React.ReactNode;
  /** 容器类名 */
  className?: string;
  /** 搜索框配置 */
  searchConfig?: {
    placeholder?: string;
    className?: string;
  };
}

// ============================================================================
// Sub Components
// ============================================================================

function SelectFilterItem({
  filter,
}: {
  filter: SelectFilter;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 130 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = filter.options.find((opt) => opt.value === filter.value);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background',
          'text-sm text-foreground hover:bg-accent transition-colors',
          'min-w-[100px] justify-between',
          open && 'ring-2 ring-ring'
        )}
        style={{ width: filter.width || 130 }}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {selectedOption?.label || filter.placeholder || 'Select'}
        </span>
        <ChevronDown size={12} className={cn('text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          className={cn(
            'fixed z-[9999] min-w-max',
            'bg-background border border-border rounded-md shadow-xl',
            'py-1 overflow-hidden'
          )}
          style={{ top: position.top, left: position.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {filter.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                filter.onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm transition-colors',
                filter.value === option.value
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function NativeSelectFilterItem({
  filter,
}: {
  filter: NativeSelectFilter;
}) {
  return (
    <NativeSelect
      value={String(filter.value ?? '')}
      onChange={(e) => filter.onChange(e.target.value)}
    >
      {filter.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

function ViewModeFilterItem({
  filter,
}: {
  filter: ViewModeFilter;
}) {
  const modes = filter.modes || ['list', 'grid'];

  return (
    <div className="flex items-center border border-border rounded-md p-0.5">
      {modes.map((mode) => {
        const Icon = mode === 'list' ? LayoutList : LayoutGrid;
        const isActive = filter.value === mode;

        return (
          <Button
            key={mode}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => filter.onValueChange(mode)}
            className={cn(
              'h-6 px-1.5 gap-1 transition-all',
              isActive ? 'bg-accent shadow-sm' : ''
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        );
      })}
    </div>
  );
}

function SearchFilterItem({
  filter,
}: {
  filter: SearchFilter;
}) {
  return (
    <div className="relative flex-1 min-w-[180px] max-w-[320px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        placeholder={filter.placeholder || 'Search...'}
        className="pl-9 h-8 w-full"
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FilterBar({
  filters,
  renderExtra,
  className,
  searchConfig,
}: FilterBarProps) {
  // Separate filters by type
  const searchFilters = filters.filter((f): f is SearchFilter => f.type === 'search');
  const selectFilters = filters.filter((f): f is SelectFilter => f.type === 'select');
  const nativeSelectFilters = filters.filter((f): f is NativeSelectFilter => f.type === 'native-select');
  const viewModeFilters = filters.filter((f): f is ViewModeFilter => f.type === 'view-mode');
  const groupByFilters = filters.filter((f): f is GroupByFilter => f.type === 'group-by' && f.showWhen !== false);
  const customFilters = filters.filter((f): f is CustomFilter => f.type === 'custom');

  return (
    <div className={cn('flex items-center gap-3 flex-nowrap', className)}>
      {/* 左对齐：搜索框 */}
      {searchFilters.map((filter) => (
        <SearchFilterItem key={filter.key} filter={filter} />
      ))}

      {/* 左对齐：下拉框 */}
      {selectFilters.map((filter) => (
        <SelectFilterItem key={filter.key} filter={filter} />
      ))}
      {nativeSelectFilters.map((filter) => (
        <NativeSelectFilterItem key={filter.key} filter={filter} />
      ))}

      {/* Separator */}
      {(selectFilters.length > 0 || nativeSelectFilters.length > 0 || customFilters.length > 0 || renderExtra) && (
        <Separator orientation="vertical" className="h-6 shrink-0" />
      )}

      {/* 右对齐：视图切换 + 分组 */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        {/* Group By Select */}
        {groupByFilters.map((filter) => (
          <SelectFilterItem
            key={filter.key}
            filter={{
              type: 'select',
              key: filter.key,
              placeholder: filter.placeholder,
              value: filter.value,
              options: filter.options,
              width: filter.width,
              onChange: (value) => filter.onValueChange(String(value)),
            }}
          />
        ))}

        {/* View Mode Toggle */}
        {viewModeFilters.map((filter) => (
          <ViewModeFilterItem key={filter.key} filter={filter} />
        ))}
      </div>

      {/* Custom Filters */}
      {customFilters.map((filter) => (
        <div key={filter.key}>{filter.render()}</div>
      ))}

      {/* Extra Content */}
      {renderExtra?.()}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/** 创建 Select Filter 配置 */
export function createSelectFilter(
  key: string,
  value: FilterValue,
  onChange: (value: FilterValue) => void,
  options: SelectOption[],
  placeholder?: string,
  width?: string
): SelectFilter {
  return {
    type: 'select',
    key,
    value,
    onChange,
    options,
    placeholder,
    width,
  };
}

/** 创建 Native Select Filter 配置（使用原生 select） */
export function createNativeSelectFilter(
  key: string,
  value: FilterValue,
  onChange: (value: FilterValue) => void,
  options: SelectOption[]
): NativeSelectFilter {
  return {
    type: 'native-select',
    key,
    value,
    onChange,
    options,
  };
}

/** 创建 Search Filter 配置 */
export function createSearchFilter(
  key: string,
  value: string,
  onChange: (value: string) => void,
  placeholder?: string
): SearchFilter {
  return {
    type: 'search',
    key,
    value,
    onChange,
    placeholder,
  };
}

/** 创建 View Mode Filter 配置 */
export function createViewModeFilter(
  key: string,
  value: ViewModeFilterValue,
  onValueChange: (value: ViewModeFilterValue) => void,
  modes?: ViewModeFilterValue[]
): ViewModeFilter {
  return {
    type: 'view-mode',
    key,
    value,
    onValueChange,
    modes,
  };
}

/** 创建 Group By Filter 配置 */
export function createGroupByFilter(
  key: string,
  value: string,
  onValueChange: (value: string) => void,
  options: SelectOption[],
  showWhen?: boolean,
  width?: string
): GroupByFilter {
  return {
    type: 'group-by',
    key,
    value,
    onValueChange,
    options,
    showWhen,
    width,
  };
}

/** 创建 Custom Filter 配置 */
export function createCustomFilter(
  key: string,
  render: () => React.ReactNode
): CustomFilter {
  return {
    type: 'custom',
    key,
    render,
  };
}

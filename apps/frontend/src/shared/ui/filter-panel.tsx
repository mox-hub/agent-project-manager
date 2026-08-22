import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MENU_ITEM_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { Filter, Search, ChevronDown, X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterGroup, FilterOption, FilterState } from '@/shared/filters/types';

/** Get current viewport dimensions accounting for browser zoom */
function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    visualWidth: window.visualViewport?.width ?? window.innerWidth,
    visualHeight: window.visualViewport?.height ?? window.innerHeight,
  };
}

export interface FilterPanelProps {
  groups: FilterGroup[];
  selectedFilters: FilterState;
  onFilterChange: (filterId: string, value: string[] | undefined) => void;
  onAddFilter?: () => void;
  addFilterPlaceholder?: string;
  className?: string;
  buttonText?: string;
  buttonIcon?: ReactNode;
  iconOnly?: boolean;
}

export function FilterPanel({
  groups,
  selectedFilters,
  onFilterChange,
  onAddFilter,
  addFilterPlaceholder = 'Add Filter...',
  className,
  buttonText = 'Filter',
  buttonIcon,
  iconOnly = false,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const [viewportSize, setViewportSize] = useState(getViewportSize);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | undefined>>({});
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [openGroupRect, setOpenGroupRect] = useState<DOMRect | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalSelectedCount = Object.values(selectedFilters).reduce((acc, value) => {
    if (Array.isArray(value)) {
      return acc + value.length;
    }
    return acc + (value ? 1 : 0);
  }, 0);

  const hasFilters = totalSelectedCount > 0;

  const updateViewportSize = useCallback(() => {
    setViewportSize(getViewportSize());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateViewportSize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportSize);
    }
    return () => {
      window.removeEventListener('resize', updateViewportSize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportSize);
      }
    };
  }, [updateViewportSize]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonContainerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonContainerRef.current.contains(event.target as Node) &&
        !Object.values(groupRefs.current).some(
          (ref) => ref && ref.contains(event.target as Node),
        )
      ) {
        setIsOpen(false);
        setOpenGroupId(undefined);
      }
      if (
        hoverCardRef.current &&
        buttonContainerRef.current &&
        !hoverCardRef.current.contains(event.target as Node) &&
        !buttonContainerRef.current.contains(event.target as Node)
      ) {
        setIsHovered(false);
      }
    };

    if (isOpen || isHovered) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isHovered]);

  useEffect(() => {
    if ((isOpen || isHovered) && buttonContainerRef.current) {
      setButtonRect(buttonContainerRef.current.getBoundingClientRect());
    } else {
      setButtonRect(null);
    }
  }, [isOpen, isHovered]);

  useLayoutEffect(() => {
    if (isOpen && openGroupId) {
      const groupElement = groupRefs.current[openGroupId];
      if (groupElement) {
        setOpenGroupRect(groupElement.getBoundingClientRect());
      }
    } else {
      setOpenGroupRect(null);
    }
  }, [isOpen, openGroupId]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setOpenGroupId(undefined);
    }
  };

  const handleGroupClick = (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenGroupId(openGroupId === groupId ? undefined : groupId);
  };

  const handleOptionClick = (groupId: string, option: FilterOption, event: React.MouseEvent) => {
    event.stopPropagation();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const isMultiSelect = group.multiSelect ?? true;

    if (isMultiSelect) {
      const current = selectedFilters[groupId] || [];
      const newValue = current.includes(option.id)
        ? current.filter((v) => v !== option.id)
        : [...current, option.id];
      onFilterChange(groupId, newValue.length > 0 ? newValue : undefined);
    } else {
      const current = selectedFilters[groupId] || [];
      const newValue = current.includes(option.id) ? undefined : [option.id];
      onFilterChange(groupId, newValue);
      setOpenGroupId(undefined);
    }
  };

  const handleRemoveFilter = (groupId: string, optionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const current = selectedFilters[groupId] || [];
    const newValue = current.filter((v) => v !== optionId);
    onFilterChange(groupId, newValue.length > 0 ? newValue : undefined);
  };

  const handleRemoveAllFilters = (event: React.MouseEvent) => {
    event.stopPropagation();
    Object.keys(selectedFilters).forEach((key) => {
      onFilterChange(key, undefined);
    });
  };

  const isOptionSelected = (groupId: string, optionId: string) => {
    return (selectedFilters[groupId] || []).includes(optionId);
  };

  const getFilteredOptions = (group: FilterGroup) => {
    const query = searchQuery[group.id]?.toLowerCase() || '';
    if (!query) return group.options;
    return group.options.filter((opt) => opt.label.toLowerCase().includes(query));
  };

  const openGroup = openGroupId ? groups.find((g) => g.id === openGroupId) : undefined;

  const getActiveFilters = () => {
    const active: { groupId: string; groupLabel: string; optionId: string; optionLabel: string }[] = [];
    groups.forEach((group) => {
      const selected = selectedFilters[group.id] || [];
      selected.forEach((optionId) => {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          active.push({
            groupId: group.id,
            groupLabel: group.label,
            optionId: option.id,
            optionLabel: option.label,
          });
        }
      });
    });
    return active;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={buttonContainerRef}
        className="inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Button
          variant={iconOnly ? 'outline' : 'secondary'}
          size={iconOnly ? 'icon-sm' : 'sm'}
          onClick={handleButtonClick}
          className={cn(
            iconOnly && 'rounded-full border-border bg-background text-muted-foreground hover:bg-muted/50',
            !iconOnly && 'rounded-lg',
            hasFilters && iconOnly && 'border-accent-blue bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20',
            className,
          )}
          title={iconOnly ? buttonText : undefined}
          aria-label={iconOnly ? buttonText : undefined}
        >
          {buttonIcon || <Filter size={14} />}
          {!iconOnly && <span className="ml-1">{buttonText}</span>}
          {!iconOnly && (
            <ChevronDown
              size={14}
              className={`ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          )}
        </Button>
      </div>

      {/* 悬浮卡片 - 显示已筛选条件 */}
      {isHovered && buttonRect && !isOpen && (
        <div
          ref={hoverCardRef}
          className={`fixed z-50 ${MENU_SURFACE_CLASS}`}
          style={{
            left: `${buttonRect.left}px`,
            top: `${buttonRect.bottom + 8}px`,
            minWidth: '200px',
            maxWidth: '280px',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-foreground">已筛选条件</span>
            {hasFilters && (
              <button
                type="button"
                onClick={handleRemoveAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                清除全部
              </button>
            )}
          </div>
          <div className="max-h-50 overflow-y-auto p-2">
            {activeFilters.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                暂无筛选条件
              </div>
            ) : (
              <div className="space-y-1">
                {activeFilters.map((filter) => (
                  <div
                    key={`${filter.groupId}-${filter.optionId}`}
                    className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground">{filter.groupLabel}: </span>
                      <span className="text-xs font-medium text-foreground">{filter.optionLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFilter(filter.groupId, filter.optionId, e)}
                      className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {onAddFilter && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setIsHovered(false);
                  setIsOpen(true);
                  onAddFilter();
                }}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus size={12} />
                添加筛选条件
              </button>
            </div>
          )}
        </div>
      )}

      {/* 下拉菜单 */}
      {isOpen && buttonRect && (
        <div
          ref={dropdownRef}
          className={`fixed z-1000 flex flex-col ${MENU_SURFACE_CLASS}`}
          style={(() => {
            const viewportWidth = viewportSize.visualWidth;
            const viewportHeight = viewportSize.visualHeight;
            const padding = 8;

            // 左对齐按钮左侧，宽度自适应内容
            let left = buttonRect.left;
            // 确保不超过右边界
            const minWidth = 180;
            if (left + minWidth > viewportWidth - padding) {
              left = Math.max(padding, viewportWidth - minWidth - padding);
            }

            let top = buttonRect.bottom + 8;
            const maxHeight = 480;
            if (top + maxHeight > viewportHeight - padding) {
              top = Math.max(padding, buttonRect.top - maxHeight - 8);
            }

            return {
              left: `${left}px`,
              top: `${top}px`,
              minWidth: `${minWidth}px`,
              maxWidth: '320px',
              maxHeight: `${maxHeight}px`,
            };
          })()}
        >
          {onAddFilter && (
            <div className="border-b border-border p-2">
              <Input
                type="text"
                placeholder={addFilterPlaceholder}
                value=""
                onChange={() => {}}
                onFocus={onAddFilter}
                className="text-xs"
              />
            </div>
          )}

          <div className="overflow-y-auto p-1.5">
            {groups.map((group) => {
              const isGroupOpen = openGroupId === group.id;
              const selectedCount = (selectedFilters[group.id] || []).length;

              return (
                <div key={group.id} className="relative">
                  <div
                    ref={(el) => {
                      groupRefs.current[group.id] = el ?? undefined;
                    }}
                    onClick={(e) => handleGroupClick(group.id, e)}
                    className={`${MENU_ITEM_CLASS} gap-2 cursor-pointer rounded px-2 py-1.5 ${
                      isGroupOpen ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
                    }`}
                  >
                    {group.icon && (
                      <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
                        {group.icon}
                      </span>
                    )}
                    <span className="flex-1 text-sm">{group.label}</span>
                    {selectedCount > 0 && (
                      <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted-foreground">
                        {selectedCount}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={`text-muted-foreground transition-transform duration-200 ${
                        isGroupOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>

                  {/* 二级菜单 */}
                  {isGroupOpen && openGroupRect && (
                    <div
                      className={`fixed z-1001 flex flex-col rounded-lg border border-border bg-popover p-1.5 shadow-lg ${
                        openGroup?.searchable ? 'min-w-55' : 'min-w-40'
                      }`}
                      style={{
                        left: `${openGroupRect.right + 4}px`,
                        top: `${openGroupRect.top}px`,
                      }}
                    >
                      {/* 搜索框 */}
                      {openGroup?.searchable && (
                        <div className="mb-1.5 px-1">
                          <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="搜索..."
                              value={searchQuery[openGroup.id] || ''}
                              onChange={(e) =>
                                setSearchQuery((prev) => ({ ...prev, [openGroup!.id]: e.target.value }))
                              }
                              className="h-7 pl-7 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* 选项列表 */}
                      <div className="max-h-50 overflow-y-auto">
                        {getFilteredOptions(openGroup!).length === 0 ? (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            无匹配项
                          </div>
                        ) : (
                          getFilteredOptions(openGroup!).map((option) => {
                            const isSelected = isOptionSelected(openGroup!.id, option.id);

                            return (
                              <div
                                key={option.id}
                                onClick={(e) => handleOptionClick(openGroup!.id, option, e)}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5',
                                  isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
                                )}
                              >
                                {(openGroup?.multiSelect ?? true) && (
                                  <div
                                    className={cn(
                                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                      isSelected
                                        ? 'border-accent-blue bg-accent-blue'
                                        : 'border-border',
                                    )}
                                  >
                                    {isSelected && <Check size={8} className="text-gray-950" />}
                                  </div>
                                )}
                                {option.icon && (
                                  <span
                                    className="flex h-4 w-4 shrink-0 items-center justify-center"
                                    style={{ color: option.color || undefined }}
                                  >
                                    {option.icon}
                                  </span>
                                )}
                                <span className="flex-1 text-sm">{option.label}</span>
                                {option.count !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {option.count}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

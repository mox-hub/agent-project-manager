import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, Search, ChevronDown } from 'lucide-react';
import type { FilterGroup, FilterOption, FilterState } from '@/shared/filters/types';

/** Get current viewport dimensions accounting for browser zoom */
function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    // Account for browser zoom by using visual viewport API when available
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
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const [viewportSize, setViewportSize] = useState(getViewportSize);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | undefined>>({});
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [openGroupRect, setOpenGroupRect] = useState<DOMRect | null>(null);

  // Update viewport size on resize and zoom changes
  const updateViewportSize = useCallback(() => {
    setViewportSize(getViewportSize());
  }, []);

  useEffect(() => {
    // Listen for resize
    window.addEventListener('resize', updateViewportSize);

    // Listen for visual viewport changes (for zoom detection)
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

  // Calculate adaptive width based on viewport
  const getAdaptiveWidth = useCallback((baseWidth: number, minWidth = 240, maxWidth = 400) => {
    const availableWidth = viewportSize.visualWidth;
    // Use 85% of available width as max, clamped to min-max range
    const targetWidth = Math.min(availableWidth * 0.85, maxWidth);
    return Math.max(targetWidth, minWidth);
  }, [viewportSize.visualWidth]);

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
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isOpen && buttonContainerRef.current) {
      setButtonRect(buttonContainerRef.current.getBoundingClientRect());
    } else {
      setButtonRect(null);
    }
  }, [isOpen]);

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

  const totalSelectedCount = Object.values(selectedFilters).reduce((acc, value) => {
    if (Array.isArray(value)) {
      return acc + value.length;
    }
    return acc + (value ? 1 : 0);
  }, 0);

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

  const isOptionSelected = (groupId: string, optionId: string) => {
    return (selectedFilters[groupId] || []).includes(optionId);
  };

  const getFilteredOptions = (group: FilterGroup) => {
    const query = searchQuery[group.id]?.toLowerCase() || '';
    if (!query) return group.options;
    return group.options.filter((opt) => opt.label.toLowerCase().includes(query));
  };

  const openGroup = openGroupId ? groups.find((g) => g.id === openGroupId) : undefined;

  return (
    <div className={`relative inline-block ${className}`}>
      <div ref={buttonContainerRef} className="inline-block">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleButtonClick}
        >
          {buttonIcon || <Filter size={14} />}
          <span className="ml-1">{buttonText}</span>
          {totalSelectedCount > 0 && (
            <span className="ml-1 rounded bg-accent-blue px-1.5 py-0.5 text-xs font-semibold text-gray-950">
              {totalSelectedCount}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </Button>
      </div>

      {isOpen && buttonRect && (
        <div
          ref={dropdownRef}
          className="fixed z-1000 flex flex-col overflow-hidden rounded-lg border border-content-border bg-content-bg shadow-lg"
          style={{
            left: `${buttonRect.left}px`,
            top: `${buttonRect.bottom + 8}px`,
            width: `${getAdaptiveWidth(320)}px`,
            maxWidth: '90vw',
            maxHeight: '500px',
          }}
        >
          {onAddFilter && (
            <div className="border-b border-content-border p-2">
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

          <div className="overflow-y-auto p-2">
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
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                      isGroupOpen ? 'bg-content-border-light text-content-text' : 'text-content-text hover:bg-content-border-light'
                    }`}
                  >
                    {group.icon && (
                      <span className="flex h-4 w-4 items-center justify-center text-content-text-secondary">
                        {group.icon}
                      </span>
                    )}
                    <span className="flex-1">{group.label}</span>
                    {selectedCount > 0 && (
                      <span className="rounded bg-content-border px-1.5 py-0.5 text-xs text-content-text-muted">
                        {selectedCount}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={`text-content-text-muted transition-transform duration-200 ${
                        isGroupOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>

                  {isGroupOpen && openGroupRect && (() => {
                    const gap = 16;
                    const { visualWidth: viewportWidth, visualHeight: viewportHeight } = viewportSize;
                    // Use adaptive width for sub-panel
                    const subPanelWidth = getAdaptiveWidth(280, 220, 360);

                    let left = openGroupRect.right + gap;
                    let top = openGroupRect.top;

                    if (left + subPanelWidth > viewportWidth) {
                      left = openGroupRect.left - subPanelWidth - gap;
                      if (left < 0) {
                        left = viewportWidth - subPanelWidth - 16;
                      }
                    }

                    const maxHeight = 400;
                    if (top + maxHeight > viewportHeight) {
                      top = Math.max(16, viewportHeight - maxHeight - 16);
                    }

                    return (
                      <div
                        className="fixed z-1001 flex flex-col overflow-hidden rounded-lg border border-content-border bg-content-bg shadow-lg"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${subPanelWidth}px`,
                          maxWidth: '90vw',
                          maxHeight: `${maxHeight}px`,
                        }}
                      >
                        {openGroup?.searchable && (
                          <div className="border-b border-content-border p-2">
                            <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="Filter..."
                                value={searchQuery[openGroup.id] || ''}
                                onChange={(e) =>
                                  setSearchQuery((prev) => ({ ...prev, [openGroup!.id]: e.target.value }))
                                }
                                className="text-xs pl-7"
                              />
                            </div>
                          </div>
                        )}

                        <div className="overflow-y-auto p-2">
                          {getFilteredOptions(openGroup!).length === 0 ? (
                            <div className="p-4 text-center text-sm text-content-text-muted">
                              No options found
                            </div>
                          ) : (
                            getFilteredOptions(openGroup!).map((option) => {
                              const isSelected = isOptionSelected(openGroup!.id, option.id);

                              return (
                                <div
                                  key={option.id}
                                  onClick={(e) => handleOptionClick(openGroup!.id, option, e)}
                                  className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                                    isSelected
                                      ? 'bg-content-border-light text-content-text'
                                      : 'text-content-text hover:bg-content-border-light'
                                  }`}
                                >
                                  {(openGroup?.multiSelect ?? true) && (
                                    <div
                                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                                        isSelected
                                          ? 'border-accent-blue bg-accent-blue'
                                          : 'border-content-border'
                                      }`}
                                    >
                                      {isSelected && (
                                        <svg
                                          width="10"
                                          height="10"
                                          viewBox="0 0 10 10"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M8 2.5L3.5 7L2 5.5"
                                            stroke="#020617"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                  )}
                                  {option.icon && (
                                    <span
                                      className="flex h-4 w-4 items-center justify-center"
                                      style={{ color: option.color || undefined }}
                                    >
                                      {option.icon}
                                    </span>
                                  )}
                                  <span className="flex-1">{option.label}</span>
                                  {option.count !== undefined && (
                                    <span className="text-xs text-content-text-muted">
                                      {option.count}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

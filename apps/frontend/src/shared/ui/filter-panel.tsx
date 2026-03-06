import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { Input } from './field';
import { Button } from './button';
import { Filter, Search, ChevronDown } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  icon?: ReactNode;
  value?: string | number | boolean;
  count?: number;
  color?: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  icon?: ReactNode;
  options: FilterOption[];
  searchable?: boolean;
  multiSelect?: boolean;
}

export interface FilterPanelProps {
  groups: FilterGroup[];
  selectedFilters: Record<string, string | string[] | undefined>;
  onFilterChange: (filterId: string, value: string | string[] | undefined) => void;
  onAddFilter?: () => void;
  addFilterPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
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
  style,
  buttonText = 'Filter',
  buttonIcon,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | undefined>>({});
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [openGroupRect, setOpenGroupRect] = useState<DOMRect | null>(null);

  // Close dropdown when clicking outside
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

  // Measure button position when dropdown opens/closes
  useLayoutEffect(() => {
    if (isOpen && buttonContainerRef.current) {
      setButtonRect(buttonContainerRef.current.getBoundingClientRect());
    } else {
      setButtonRect(null);
    }
  }, [isOpen]);

  // Measure open group position when it changes
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

  // Calculate total selected filters count
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
    setOpenGroupId(openGroupId === groupId ? null : groupId);
  };

  const handleOptionClick = (groupId: string, option: FilterOption, event: React.MouseEvent) => {
    event.stopPropagation();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Default to multiSelect if not specified
    const isMultiSelect = group.multiSelect ?? true;

    if (isMultiSelect) {
      const current = (selectedFilters[groupId] as string[]) || [];
      const newValue = current.includes(option.id)
        ? current.filter((v) => v !== option.id)
        : [...current, option.id];
      onFilterChange(groupId, newValue.length > 0 ? newValue : undefined);
    } else {
      const newValue = selectedFilters[groupId] === option.id ? undefined : option.id;
      onFilterChange(groupId, newValue);
      setOpenGroupId(null);
    }
  };

  const isOptionSelected = (groupId: string, optionId: string) => {
    const value = selectedFilters[groupId];
    if (Array.isArray(value)) {
      return value.includes(optionId);
    }
    return value === optionId;
  };

  const getFilteredOptions = (group: FilterGroup) => {
    const query = searchQuery[group.id]?.toLowerCase() || '';
    if (!query) return group.options;
    return group.options.filter((opt) => opt.label.toLowerCase().includes(query));
  };

  const openGroup = openGroupId ? groups.find((g) => g.id === openGroupId) : undefined;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      {/* Filter Button */}
      <div ref={buttonContainerRef} style={{ display: 'inline-block' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleButtonClick}
          leftIcon={buttonIcon || <Filter size={14} />}
          rightIcon={
            <ChevronDown
              size={14}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          }
          style={style}
        >
          {buttonText}
          {totalSelectedCount > 0 && (
            <span
              style={{
                marginLeft: spacing.xs,
                fontSize: typography.xs,
                backgroundColor: colors.accent,
                color: '#020617',
                padding: `2px ${spacing.xs}px`,
                borderRadius: radii.sm,
                fontWeight: 600,
              }}
            >
              {totalSelectedCount}
            </span>
          )}
        </Button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && buttonRect && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: `${buttonRect.left}px`,
            top: `${buttonRect.bottom + spacing.xs}px`,
            width: '320px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: radii.lg,
            boxShadow: shadows.lg,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '500px',
            overflow: 'hidden',
          }}
        >
          {/* Add Filter input */}
          {onAddFilter && (
            <div style={{ padding: spacing.sm, borderBottom: `1px solid ${colors.borderSubtle}` }}>
              <Input
                type="text"
                placeholder={addFilterPlaceholder}
                value=""
                onChange={() => {}}
                onFocus={onAddFilter}
                style={{
                  fontSize: typography.xs,
                  padding: `${spacing.xs + 2}px ${spacing.md}px`,
                }}
              />
            </div>
          )}

          {/* Filter groups list */}
          <div
            style={{
              overflowY: 'auto',
              padding: spacing.xs,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.xs,
            }}
          >
            {groups.map((group) => {
              const isGroupOpen = openGroupId === group.id;
              const selectedCount = Array.isArray(selectedFilters[group.id])
                ? (selectedFilters[group.id] as string[]).length
                : selectedFilters[group.id]
                  ? 1
                  : 0;

              return (
                <div key={group.id} style={{ position: 'relative' }}>
                  <div
                    ref={(el) => {
                      groupRefs.current[group.id] = el;
                    }}
                    onClick={(e) => handleGroupClick(group.id, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: `${spacing.xs + 2}px ${spacing.sm}px`,
                      borderRadius: radii.md,
                      backgroundColor: isGroupOpen ? colors.borderSubtle : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: typography.sm,
                      color: colors.textPrimary,
                    }}
                    onMouseEnter={(e) => {
                      if (!isGroupOpen) {
                        e.currentTarget.style.backgroundColor = colors.borderSubtle;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isGroupOpen) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {group.icon && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          color: colors.textSecondary,
                        }}
                      >
                        {group.icon}
                      </span>
                    )}
                    <span style={{ flex: 1 }}>{group.label}</span>
                    {selectedCount > 0 && (
                      <span
                        style={{
                          fontSize: typography.xs,
                          color: colors.textMuted,
                          backgroundColor: colors.borderStrong,
                          padding: `2px ${spacing.xs}px`,
                          borderRadius: radii.sm,
                        }}
                      >
                        {selectedCount}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      style={{
                        color: colors.textMuted,
                        transform: isGroupOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>

                  {/* Group options dropdown */}
                  {isGroupOpen && openGroupRect && (() => {
                    const dropdownWidth = 280;
                    const gap = spacing.md;
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    
                    // Calculate position
                    let left = openGroupRect.right + gap;
                    let top = openGroupRect.top;
                    
                    // Adjust if dropdown would overflow right edge
                    if (left + dropdownWidth > viewportWidth) {
                      left = openGroupRect.left - dropdownWidth - gap;
                      // If still overflows, align to right edge
                      if (left < 0) {
                        left = viewportWidth - dropdownWidth - spacing.md;
                      }
                    }
                    
                    // Adjust if dropdown would overflow bottom edge
                    const maxHeight = 400;
                    if (top + maxHeight > viewportHeight) {
                      top = Math.max(spacing.md, viewportHeight - maxHeight - spacing.md);
                    }
                    
                    return (
                      <div
                        style={{
                          position: 'fixed',
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${dropdownWidth}px`,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.borderStrong}`,
                          borderRadius: radii.lg,
                          boxShadow: shadows.lg,
                          zIndex: 1001,
                          display: 'flex',
                          flexDirection: 'column',
                          maxHeight: `${maxHeight}px`,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Dropdown header with search */}
                        {openGroup.searchable && (
                          <div style={{ padding: spacing.sm, borderBottom: `1px solid ${colors.borderSubtle}` }}>
                            <Input
                              type="text"
                              placeholder="Filter..."
                              value={searchQuery[openGroup.id] || ''}
                              onChange={(e) =>
                                setSearchQuery((prev) => ({ ...prev, [openGroup.id]: e.target.value }))
                              }
                              leftIcon={<Search size={14} />}
                              style={{
                                fontSize: typography.xs,
                                padding: `${spacing.xs + 2}px ${spacing.md}px`,
                              }}
                            />
                          </div>
                        )}

                        {/* Dropdown options */}
                        <div
                          style={{
                            overflowY: 'auto',
                            padding: spacing.xs,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: spacing.xs,
                          }}
                        >
                          {getFilteredOptions(openGroup).length === 0 ? (
                            <div
                              style={{
                                padding: spacing.lg,
                                textAlign: 'center',
                                color: colors.textMuted,
                                fontSize: typography.sm,
                              }}
                            >
                              No options found
                            </div>
                          ) : (
                            getFilteredOptions(openGroup).map((option) => {
                            const isSelected = isOptionSelected(openGroup.id, option.id);

                            return (
                              <div
                                key={option.id}
                                onClick={(e) => handleOptionClick(openGroup.id, option, e)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: spacing.sm,
                                  padding: `${spacing.xs + 2}px ${spacing.sm}px`,
                                  borderRadius: radii.md,
                                  backgroundColor: isSelected ? colors.borderSubtle : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  fontSize: typography.sm,
                                  color: colors.textPrimary,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = colors.borderSubtle;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                {(openGroup.multiSelect ?? true) && (
                                  <div
                                    style={{
                                      width: 16,
                                      height: 16,
                                      border: `1.5px solid ${isSelected ? colors.accent : colors.borderStrong}`,
                                      borderRadius: radii.xs,
                                      backgroundColor: isSelected ? colors.accent : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
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
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 16,
                                      height: 16,
                                      color: option.color || colors.textSecondary,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {option.icon}
                                  </span>
                                )}
                                <span style={{ flex: 1 }}>{option.label}</span>
                                {option.count !== undefined && (
                                  <span
                                    style={{
                                      fontSize: typography.xs,
                                      color: colors.textMuted,
                                    }}
                                  >
                                    {option.count} {option.count === 1 ? 'project' : 'projects'}
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

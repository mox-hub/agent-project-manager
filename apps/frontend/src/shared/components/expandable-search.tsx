import { useState, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
}

export function ExpandableSearch({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  buttonSize = 'md',
}: ExpandableSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasValue = value.length > 0;

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-7 w-7',
    lg: 'h-8 w-8',
  };

  const expand = useCallback(() => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, []);

  const collapse = useCallback(() => {
    if (!hasValue) {
      setIsExpanded(false);
    }
  }, [hasValue]);

  // hasValue 出现时保持展开（渲染期间调整，避免 effect 内同步 setState）
  const [prevHasValue, setPrevHasValue] = useState(hasValue);
  if (prevHasValue !== hasValue) {
    setPrevHasValue(hasValue);
    if (hasValue) setIsExpanded(true);
  }

  const handleButtonClick = () => {
    if (!isExpanded) {
      expand();
    }
  };

  const handleBlur = () => {
    collapse();
  };

  const handleClear = () => {
    onChange('');
    collapse();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (!hasValue) {
        setIsExpanded(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onMouseEnter={() => {
        if (!isExpanded && !hasValue) {
          expand();
        }
      }}
      onMouseLeave={() => {
        if (!hasValue && document.activeElement !== inputRef.current) {
          collapse();
        }
      }}
    >
      <div
        className={cn(
          'relative flex items-center border border-transparent transition-all duration-300 ease-out',
          isExpanded || hasValue
            ? 'rounded-full border-border bg-background shadow-xs'
            : 'rounded-full border-border bg-background',
        )}
      >
        {/* 搜索按钮 */}
        <button
          type="button"
          onClick={handleButtonClick}
          onFocus={() => expand()}
          className={cn(
            'flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            sizeClasses[buttonSize],
          )}
          aria-label="Search"
        >
          <Search size={14} />
        </button>

        {/* 展开状态下的输入框 */}
        <div
          className={cn(
            'flex items-center overflow-hidden transition-all duration-300 ease-out',
            isExpanded || hasValue ? 'w-48 opacity-100' : 'w-0 opacity-0',
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 border-0 bg-transparent py-1.5 pl-1 pr-6 text-xs text-foreground outline-hidden placeholder:text-muted-foreground"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

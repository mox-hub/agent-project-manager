/**
 * TabBar - 浏览器式 Tab 栏组件
 * 参考: refers/APM/TABS_SYSTEM.md
 */

import { useRef, useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabs, type Tab } from '@/shared/tabs/tabs-context';
import { Button } from '@/components/ui/button';

interface TabBarProps {
  className?: string;
}

export function TabBar({ className }: TabBarProps) {
  const { tabs, activeTabId, switchTab, closeTab } = useTabs();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 检查滚动状态
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [tabs]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={cn('relative flex h-9 items-center border-b border-border bg-muted/30', className)}>
      {/* Left scroll button */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute left-1 z-10 h-7 w-7 shrink-0 bg-muted/80 hover:bg-muted"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Tabs container */}
      <div
        ref={scrollContainerRef}
        className="flex h-full items-center gap-1 overflow-x-auto scrollbar-hide px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.length === 0 ? (
          /* Empty state - show placeholder */
          <div className="flex items-center gap-1.5 px-2 text-muted-foreground text-sm">
            <FolderKanban className="h-4 w-4" />
            <span>No tabs open</span>
          </div>
        ) : (
          tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => switchTab(tab.id)}
              onClose={() => closeTab(tab.id)}
            />
          ))
        )}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-1 z-10 h-7 w-7 shrink-0 bg-muted/80 hover:bg-muted"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Single Tab Item
interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  const Icon = tab.icon;

  return (
    <div
      className={cn(
        'group/tab flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm transition-colors',
        'hover:bg-muted/80',
        isActive
          ? 'bg-background text-foreground shadow-sm border border-border/50'
          : 'text-muted-foreground hover:text-foreground'
      )}
      onClick={onClick}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="max-w-[120px] truncate">{tab.title}</span>
      {tab.closable && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-0.5 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover/tab:opacity-100 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/**
 * TabBar - 浏览器式 Tab 栏组件
 * 参考: refers/APM/TABS_SYSTEM.md
 */

import { useRef, useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, FolderKanban, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabs, type Tab } from '@/shared/tabs/tabs-context';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface TabBarProps {
  className?: string;
}

export function TabBar({ className }: TabBarProps) {
  const { t } = useTranslation();
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

  // 打开命令面板（模拟添加标签页功能）
  const handleAddTab = () => {
    // 触发全局命令面板
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <div className={cn('relative flex h-10 items-center bg-sidebar pl-0 gap-1', className)}>
      {/* Left scroll button */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute left-2 z-10 h-8 w-8 shrink-0 bg-sidebar/80 hover:bg-sidebar text-sidebar-foreground rounded-lg"
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
          <div className="flex items-center gap-1.5 px-2 text-sidebar-foreground/50 text-sm">
            <FolderKanban className="h-4 w-4" />
            <span>{t('shell.noTabsOpen', 'No tabs open')}</span>
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
          className="absolute right-11 z-10 h-8 w-8 shrink-0 bg-sidebar/80 hover:bg-sidebar text-sidebar-foreground rounded-lg"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Add tab button */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute right-2 z-10 h-8 w-8 shrink-0 bg-sidebar hover:bg-sidebar-accent/80 text-sidebar-foreground rounded-lg"
        onClick={handleAddTab}
        title={t('tabs.add', 'Add tab')}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Single Tab Item - 胶囊样式
interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  const { t } = useTranslation();
  const Icon = tab.statusIcon ?? tab.icon;
  const translatedTitle = tab.titleKey ? t(tab.titleKey) : tab.title;
  const fullTitle = translatedTitle;

  return (
    <div
      className={cn(
        'group/tab flex h-7 max-w-[200px] cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm transition-all',
        // 默认状态：始终显示边框
        'border border-sidebar-border/40',
        // 悬停状态
        'hover:border-sidebar-border/80 hover:bg-sidebar-accent/60',
        // 选中状态：日间/暗色模式分开处理
        isActive && [
          // 日间模式：白底 + 主色边框/阴影
          'bg-background border-primary/30 shadow-sm ring-2 ring-primary/15',
          // 暗色模式：深底 + 强调主色边框（不反转）
          'dark:bg-sidebar-accent dark:border-sidebar-primary/50 dark:shadow-none dark:ring-1 dark:ring-sidebar-primary/30'
        ]
      )}
      onClick={onClick}
      title={fullTitle}
    >
      {Icon && (
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-colors',
            isActive
              ? 'text-foreground dark:text-sidebar-foreground'
              : 'text-sidebar-foreground/50 group-hover/tab:text-sidebar-foreground/70'
          )}
        />
      )}
      <span
        className={cn(
          'max-w-[140px] truncate transition-colors text-center',
          isActive
            ? 'text-foreground dark:text-sidebar-foreground font-medium'
            : 'text-sidebar-foreground/50 group-hover/tab:text-sidebar-foreground/70'
        )}
      >
        {translatedTitle}
      </span>
      {tab.closable && (
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn(
            'h-4 w-4 shrink-0 rounded opacity-0 group-hover/tab:opacity-100 transition-all p-0',
            isActive
              ? 'text-foreground/50 hover:text-foreground hover:bg-foreground/10'
              : 'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
          )}
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

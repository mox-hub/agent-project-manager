/**
 * TabBar - 浏览器式 Tab 栏组件
 * 参考: refers/APM/TABS_SYSTEM.md
 *
 * 支持：
 * - 固定标签页（pinned）：不可关闭、hover 不显示关闭按钮、固定在左侧
 * - 右键菜单：固定/取消固定、关闭、关闭其他、关闭右侧、关闭全部
 */

import { useRef, useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Plus,
  Pin,
  PinOff,
  XCircle,
  PanelRightClose,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabs, type Tab } from '@/shared/tabs/tabs-context';
import { ContextMenu, createMenuItems } from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface TabBarProps {
  className?: string;
}

export function TabBar({ className }: TabBarProps) {
  const { t } = useTranslation();
  const {
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    togglePin,
    closeOthers,
    closeRight,
    closeAll,
  } = useTabs();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 固定页固定在左侧，其余保持原顺序
  const orderedTabs = [...tabs.filter((tab) => tab.pinned), ...tabs.filter((tab) => !tab.pinned)];

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
        {orderedTabs.length === 0 ? (
          /* Empty state - show placeholder */
          <div className="flex items-center gap-1.5 px-2 text-sidebar-foreground/50 text-sm">
            <FolderKanban className="h-4 w-4" />
            <span>{t('shell.noTabsOpen', 'No tabs open')}</span>
          </div>
        ) : (
          orderedTabs.map((tab) => {
            const absoluteIndex = tabs.findIndex((tt) => tt.id === tab.id);
            // 右侧是否存在“可关闭（非固定）”标签
            const canCloseRight = tabs
              .slice(absoluteIndex + 1)
              .some((tt) => !tt.pinned && tt.closable);
            return (
              <TabItem
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onClick={() => switchTab(tab.id)}
                onClose={() => closeTab(tab.id)}
                onTogglePin={() => togglePin(tab.id)}
                onCloseOthers={() => closeOthers(tab.id)}
                onCloseRight={() => closeRight(tab.id)}
                onCloseAll={closeAll}
                canCloseRight={canCloseRight}
              />
            );
          })
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
  onTogglePin: () => void;
  onCloseOthers: () => void;
  onCloseRight: () => void;
  onCloseAll: () => void;
  canCloseRight: boolean;
}

function TabItem({
  tab,
  isActive,
  onClick,
  onClose,
  onTogglePin,
  onCloseOthers,
  onCloseRight,
  onCloseAll,
  canCloseRight,
}: TabItemProps) {
  const { t } = useTranslation();
  const Icon = tab.statusIcon ?? tab.icon;
  const translatedTitle = tab.titleKey ? t(tab.titleKey) : tab.title;
  const fullTitle = translatedTitle;

  // 右键菜单项（针对当前标签页动态生成）
  const menuItems = createMenuItems([
    {
      label: tab.pinned ? t('tabs.unpin') : t('tabs.pin'),
      icon: tab.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />,
      onClick: onTogglePin,
      separatorAfter: true,
    },
    {
      label: t('tabs.close'),
      icon: <X className="h-4 w-4" />,
      disabled: !tab.closable || !!tab.pinned,
      onClick: onClose,
    },
    {
      label: t('tabs.closeOthers'),
      icon: <XCircle className="h-4 w-4" />,
      onClick: onCloseOthers,
    },
    {
      label: t('tabs.closeRight'),
      icon: <PanelRightClose className="h-4 w-4" />,
      disabled: !canCloseRight,
      onClick: onCloseRight,
    },
    {
      label: t('tabs.closeAll'),
      icon: <Ban className="h-4 w-4" />,
      destructive: true,
      onClick: onCloseAll,
    },
  ]);

  return (
    <ContextMenu items={menuItems} className="contents">
      <div
        className={cn(
          'group/tab flex h-7 max-w-50 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm transition-all',
          'border',
          tab.pinned
            ? 'border-sidebar-primary/30 bg-sidebar-accent/50'
            : 'border-sidebar-border/40',
          'hover:border-sidebar-border/80 hover:bg-sidebar-accent/60',
          isActive && [
            'bg-background border-primary/30 shadow-sm ring-2 ring-primary/15',
            'dark:bg-sidebar-accent dark:border-sidebar-primary/50 dark:shadow-none dark:ring-1 dark:ring-sidebar-primary/30',
          ]
        )}
        onClick={onClick}
        title={fullTitle}
        data-pinned={tab.pinned ? 'true' : undefined}
      >
        {tab.pinned && (
          <Pin className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
        )}
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
            'max-w-35 truncate transition-colors text-center',
            isActive
              ? 'text-foreground dark:text-sidebar-foreground font-medium'
              : 'text-sidebar-foreground/50 group-hover/tab:text-sidebar-foreground/70'
          )}
        >
          {translatedTitle}
        </span>
        {tab.closable && !tab.pinned && (
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
    </ContextMenu>
  );
}

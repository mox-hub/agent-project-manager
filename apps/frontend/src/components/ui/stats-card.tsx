/**
 * StatsCard - 统计卡片组件
 * 用于展示关键数据的快捷统计卡片
 * 布局：flex 横向排列，等距全宽，卡片内部左侧图标+右侧数值文本
 */

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface StatsCardItem {
  /** 唯一标识 */
  key: string;
  /** 显示的数值 */
  value: number | string;
  /** 卡片标签 */
  label: string;
  /** 图标组件 */
  icon?: LucideIcon;
  /** 自定义颜色类名 */
  colorClass?: string;
  /** 图标颜色类名 */
  iconColorClass?: string;
  /** 自定义样式 */
  className?: string;
}

export interface StatsCardProps {
  /** 统计项列表 */
  items: StatsCardItem[];
  /** 网格列数，默认4列 */
  columns?: 2 | 3 | 4 | 6;
  /** 自定义容器类名 */
  className?: string;
  /** 最大宽度 */
  maxWidth?: string;
}

export function StatsCard({
  items,
  columns = 4,
  className,
  maxWidth,
}: StatsCardProps) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
  }[columns];

  return (
    <div
      className={cn('grid gap-3', gridClass, className)}
      style={maxWidth ? { maxWidth } : undefined}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 border transition-all',
              item.colorClass || 'bg-muted/50 border-transparent',
              item.className
            )}
          >
            {/* 左侧图标 */}
            {Icon && (
              <div className="shrink-0">
                <Icon
                  size={18}
                  className={cn(item.iconColorClass || 'text-muted-foreground')}
                />
              </div>
            )}
            {/* 右侧数值和文本 */}
            <div className="flex flex-col min-w-0">
              <span className={cn(
                'text-xl font-semibold leading-tight truncate',
                item.iconColorClass || 'text-foreground'
              )}>
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 预设颜色主题 */
export const STATS_THEMES = {
  default: {
    colorClass: 'bg-muted/50 border-transparent',
    iconColorClass: 'text-muted-foreground',
  },
  green: {
    colorClass: 'bg-accent-green/10 border-accent-green/20',
    iconColorClass: 'text-accent-green',
  },
  blue: {
    colorClass: 'bg-accent-blue/10 border-accent-blue/20',
    iconColorClass: 'text-accent-blue',
  },
  yellow: {
    colorClass: 'bg-accent-yellow/10 border-accent-yellow/20',
    iconColorClass: 'text-accent-yellow',
  },
  red: {
    colorClass: 'bg-accent-red/10 border-accent-red/20',
    iconColorClass: 'text-accent-red',
  },
  purple: {
    colorClass: 'bg-accent-purple/10 border-accent-purple/20',
    iconColorClass: 'text-accent-purple',
  },
  gray: {
    colorClass: 'bg-muted/30 border-border/50',
    iconColorClass: 'text-muted-foreground',
  },
} as const;

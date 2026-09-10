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
              'flex items-center gap-3 rounded-lg px-3.5 py-2.5 border bg-card border-border/70 shadow-2xs transition-all hover:border-border',
              item.colorClass,
              item.className
            )}
          >
            {/* 左侧图标微框架 */}
            {Icon && (
              <div className={cn(
                'size-8 rounded-md flex items-center justify-center shrink-0 bg-muted/40 border border-border/40',
                item.iconColorClass ? '' : 'text-muted-foreground'
              )}>
                <Icon
                  size={16}
                  className={cn(item.iconColorClass || 'text-muted-foreground')}
                />
              </div>
            )}
            {/* 右侧数值和文本 */}
            <div className="flex flex-col min-w-0">
              <span className="text-xl font-semibold font-mono tabular-nums leading-tight truncate text-foreground">
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground truncate mt-0.5">
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 预设颜色主题 (仅点缀图标与微边框，背景保持低调中性 bg-card) */
export const STATS_THEMES = {
  default: {
    colorClass: 'border-border/60 hover:border-border',
    iconColorClass: 'text-muted-foreground',
  },
  green: {
    colorClass: 'hover:border-accent-green/40',
    iconColorClass: 'text-accent-green',
  },
  blue: {
    colorClass: 'hover:border-accent-blue/40',
    iconColorClass: 'text-accent-blue',
  },
  yellow: {
    colorClass: 'hover:border-accent-yellow/40',
    iconColorClass: 'text-accent-yellow',
  },
  red: {
    colorClass: 'hover:border-accent-red/40',
    iconColorClass: 'text-accent-red',
  },
  purple: {
    colorClass: 'hover:border-accent-purple/40',
    iconColorClass: 'text-accent-purple',
  },
  gray: {
    colorClass: 'border-border/40',
    iconColorClass: 'text-muted-foreground',
  },
} as const;

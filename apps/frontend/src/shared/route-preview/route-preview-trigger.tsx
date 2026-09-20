/**
 * RoutePreviewTrigger - 路由预览卡片触发器
 *
 * 把任意元素（tab 胶囊 / 侧栏收藏项）挂上 hover 预览卡。
 * children 是触发元素，作为 base-ui Trigger 的 render 目标被克隆（事件处理器链式合并、
 * className 拼接、ref 组合），因此要求它能透传 props 到最终 DOM（div / NavLink 等）。
 *
 * 外层还能再嵌其它 cloneElement 型包装（如 tab-bar 的 ContextMenu 兼容层）：
 * 本组件透传 rest props（含 ref）给 HoverCardTrigger，由 base-ui 组合到最终 DOM，
 * 避免两层 clone 因 ref 覆盖互相打架。
 */

import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  HoverCardArrow,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { RoutePreviewCard } from './route-preview-card';
import { resolveRoutePreview } from './route-preview-registry';

export interface RoutePreviewTriggerProps
  extends Omit<React.ComponentProps<typeof HoverCardTrigger>, 'render' | 'children'> {
  path: string;
  title?: string;
  icon?: LucideIcon;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  /** 卡片宽度档位（默认根据路由类型智能分发：acceptance/execution 为 xl，其余为 lg） */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** hover 打开延迟（ms），避免鼠标快速划过时误弹；默认 300 */
  delay?: number;
  /** 触发元素（作为 render 目标被克隆） */
  children: ReactElement;
  className?: string;
}

export function RoutePreviewTrigger({
  path,
  title,
  icon,
  side = 'bottom',
  align = 'start',
  size,
  delay = 300,
  children,
  className,
  ...rest
}: RoutePreviewTriggerProps) {
  const match = resolveRoutePreview(path);
  const resolvedSize =
    size ?? (match.type === 'acceptance' || match.type === 'execution' ? 'xl' : 'lg');

  return (
    <HoverCard>
      <HoverCardTrigger delay={delay} closeDelay={150} render={children} {...rest} />
      <HoverCardContent side={side} align={align} size={resolvedSize} className={cn('p-3.5', className)}>
        <HoverCardArrow />
        <RoutePreviewCard path={path} fallbackTitle={title} fallbackIcon={icon} />
      </HoverCardContent>
    </HoverCard>
  );
}

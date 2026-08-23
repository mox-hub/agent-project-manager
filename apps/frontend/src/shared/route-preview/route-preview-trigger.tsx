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
} from '@/components/ui/hover-card';
import { RoutePreviewCard } from './route-preview-card';

export interface RoutePreviewTriggerProps
  extends Omit<React.ComponentProps<typeof HoverCardTrigger>, 'render' | 'children'> {
  path: string;
  title?: string;
  icon?: LucideIcon;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  /** hover 打开延迟（ms），避免鼠标快速划过时误弹；默认 400 */
  delay?: number;
  /** 触发元素（作为 render 目标被克隆） */
  children: ReactElement;
}

export function RoutePreviewTrigger({
  path,
  title,
  icon,
  side = 'bottom',
  align = 'start',
  delay = 400,
  children,
  ...rest
}: RoutePreviewTriggerProps) {
  return (
    <HoverCard>
      <HoverCardTrigger delay={delay} closeDelay={150} render={children} {...rest} />
      <HoverCardContent side={side} align={align} className="w-72 p-3">
        <RoutePreviewCard path={path} fallbackTitle={title} fallbackIcon={icon} />
      </HoverCardContent>
    </HoverCard>
  );
}

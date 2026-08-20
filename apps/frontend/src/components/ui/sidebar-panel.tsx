import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SidebarPanel - 右侧栏统一「圆角矩形 ↔ 圆角胶囊」折叠面板
 *
 * 约定：
 * - 展开为圆角矩形、收起为仅标题行的紧凑胶囊；两种状态的圆角弧度一致（都为较小直径圆角）。
 * - 标题区支持图标（可彩色）/ 标题 / 收缩三角 / 右侧自定义 action；标题区与内容区同背景、无分割线。
 * - 展开 / 收起带有流畅动画（行高 grid 动画 + 三角旋转 + 圆角过渡）。
 *
 * 支持受控（传入 collapsed / onToggle）与不受控（defaultCollapsed）两种用法。
 */
export interface SidebarPanelProps {
  title: string;
  /** 标题区图标（支持彩色图标，配合 iconClassName 控制颜色） */
  icon?: ReactNode;
  /** 图标颜色类，如 "text-accent-purple" */
  iconClassName?: string;
  /** 标题右侧额外的自定义内容（显示在收缩三角之前） */
  action?: ReactNode;
  /** 受控：是否收起 */
  collapsed?: boolean;
  /** 受控：折叠切换回调 */
  onToggle?: () => void;
  /** 不受控：初始是否收起（默认展开） */
  defaultCollapsed?: boolean;
  children: ReactNode;
  className?: string;
}

export function SidebarPanel({
  title,
  icon,
  iconClassName,
  action,
  collapsed: collapsedProp,
  onToggle,
  defaultCollapsed = false,
  children,
  className,
}: SidebarPanelProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const collapsed = collapsedProp !== undefined ? collapsedProp : !open;
  const toggle = onToggle ?? (() => setOpen((v) => !v));

  return (
    <div
      className={cn(
        // 同背景（bg-card）、无标题/内容分割线；圆角在展开/收起间保持一致的小圆角并做过渡
        'rounded-xl border border-border bg-card transition-[border-radius] duration-300',
        className,
      )}
    >
      {/* 标题区 */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        {icon ? (
          <span className={cn('shrink-0', iconClassName)}>{icon}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {action ? <span className="flex shrink-0 items-center">{action}</span> : null}
        <button
          type="button"
          onClick={toggle}
          className="size-5 inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={collapsed ? '展开' : '收起'}
          aria-expanded={!collapsed}
        >
          <ChevronDown
            className={cn(
              'size-3 transition-transform duration-300',
              !collapsed && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* 内容区：grid-rows 动画实现流畅展开 / 收起 */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-2 flex flex-col gap-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

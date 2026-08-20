import type { ReactNode, ComponentProps } from 'react';
import { PanelRight, PanelRightClose, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RightSidebar - 统一右侧栏容器
 *
 * 与主内容区完全左右并列（flex 行内），通过 `hidden` 实现侧边栏整体收起/展开，
 * 行为与任务详情页一致：收起时不占位（不是浮层/覆盖）。
 */
export interface RightSidebarProps extends ComponentProps<'aside'> {
  /** 是否隐藏（收起）侧边栏 */
  hidden?: boolean;
  /** 宽度，默认 320px */
  width?: number | string;
}

export function RightSidebar({
  hidden,
  width = 320,
  className,
  children,
  ...rest
}: RightSidebarProps) {
  return (
    <aside
      hidden={hidden}
      style={typeof width === 'number' ? { width: `${width}px` } : { width }}
      className={cn(
        'shrink-0 overflow-y-auto border-l border-border/40 bg-transparent',
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col gap-3 px-3 py-3">{children}</div>
    </aside>
  );
}

/**
 * SidebarButtonGroup - 侧边栏顶部按钮组区域
 * 所有按钮固定在一行内显示（横向排列，不换行）。
 */
export function SidebarButtonGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-start gap-1.5 whitespace-nowrap', className)}>
      {children}
    </div>
  );
}

/**
 * SidebarButton - 侧边栏内按钮
 * - 默认形态为圆形图标按钮，固定不展开（对外只展示圆形图标）。
 * - `variant="capsule"` 为固定胶囊形按钮（如“指派 AI”主操作）。
 */
export function SidebarButton({
  icon: Icon,
  label,
  onClick,
  variant = 'icon',
  className,
  type = 'button',
  ...rest
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'icon' | 'capsule';
} & Omit<ComponentProps<'button'>, 'children'>) {
  if (variant === 'capsule') {
    return (
      <button
        type={type}
        onClick={onClick}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-7 shrink-0 items-center gap-1 px-2.5 text-xs font-medium whitespace-nowrap rounded-full border border-border bg-transparent text-foreground transition-colors hover:bg-accent hover:text-foreground',
          className,
        )}
        {...rest}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        className,
      )}
      {...rest}
    >
      <Icon className="size-3.5 shrink-0" />
    </button>
  );
}

/**
 * SidebarToggle - 右侧栏展开/收起开关
 * 图标随状态切换：展开时显示“展开态”图标，收起时显示“收起态”图标。
 */
export function SidebarToggle({
  open,
  onToggle,
  className,
}: {
  /** 侧边栏当前是否展开 */
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? '收起侧边栏' : '展开侧边栏'}
      title={open ? '收起侧边栏' : '展开侧边栏'}
      aria-pressed={open}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
    >
      {open ? <PanelRightClose className="size-3.5" /> : <PanelRight className="size-3.5" />}
    </button>
  );
}

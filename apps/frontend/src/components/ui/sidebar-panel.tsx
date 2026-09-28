import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_CLASS, type Tone } from './tone';

/**
 * 图标的**分类强调色**（不是状态色）。
 *
 * `purple` 在本仓当分类 / 强调用（权限、项目角色），不属 §19.4 的 5 档**状态**词表，
 * 故在此单列一档而**不扩 `Tone`**（2026-09-28 裁决）。这样「purple 不是状态」是**结构性
 * 的**（类型上就区分开），而不是靠注释约定。
 */
const ACCENT_CLASS = {
  purple: 'text-accent-purple',
} as const;

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
  /** 标题区图标 */
  icon?: ReactNode;
  /**
   * 图标的**状态色**。tone → class 取自 `components/ui/tone.ts`（§19.5 视觉层唯一词表）。
   * 缺省不设色 ⇒ 沿用继承色（既有调用方的渲染结果零变化）。
   */
  iconTone?: Tone;
  /**
   * 图标的**分类强调色**（与 `iconTone` 语义不同，见 `ACCENT_CLASS`）。
   * 同时给时以 `iconTone` 为准。
   */
  accent?: keyof typeof ACCENT_CLASS;
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
  iconTone,
  accent,
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
        // 磨砂底（bg-card/80）、无标题/内容分割线；圆角在展开/收起间保持一致的小圆角并做过渡
        'rounded-xl border border-border/60 bg-card/80 backdrop-blur-xs shadow-xs transition-[border-radius] duration-slow',
        className,
      )}
    >
      {/* 标题区 */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        {icon ? (
          <span
            className={cn(
              'shrink-0',
              iconTone ? TONE_CLASS[iconTone].text : accent ? ACCENT_CLASS[accent] : undefined,
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
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
              'size-3 transition-transform duration-slow',
              !collapsed && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* 内容区：grid-rows 动画实现流畅展开 / 收起 */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-slow ease-out',
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

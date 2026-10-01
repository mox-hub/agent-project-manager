/**
 * DetailSection - 详情页主栏统一「可收缩分区」（Linear 风格平铺形态）
 *
 * 收编 task/bug 详情页主栏六处手写同构分区（描述/自定义字段/子任务/执行项/
 * 验收契约预览/依赖关系）：分区头（图标 + uppercase 小标题 + 计数 + 右侧动作）
 * + grid-rows 流畅收缩动画。与右栏 SidebarPanel 同构不同形——本件平铺无卡底，
 * SidebarPanel 是磨砂圆角卡，各自独立登记（2026-10-02 裁决①）。
 *
 * 约定：
 * - 标题档 text-xs（中文 12px 下限，§2.4；2026-10-02 裁决②，右栏 text-3xs 不在本件口径）
 * - 图标 size-3.5、计数 text-3xs tabular-nums，分区头默认 px-6 py-2（headerClassName 可覆）
 * - 收缩钮内置（RawButton + ChevronDown 旋转 + aria-expanded），collapsible={false} 关闭
 *   （描述区等不收缩分区）；支持受控（collapsed/onToggle）与不受控（defaultCollapsed）
 */
import { useState, type ComponentProps, type ReactNode } from 'react';import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RawButton } from '@/components/raw/raw-button';

export interface DetailSectionProps extends ComponentProps<'div'> {
  /** 分区头图标（消费方自渲染 lucide 节点，统一 size-3.5；颜色继承 muted） */
  icon?: ReactNode;
  title: string;
  /** 标题右侧计数（(N) 或 done/total），text-3xs normal-case tabular-nums */
  count?: ReactNode;
  /** 分区头右侧动作区（收缩三角之前的自定义内容，如编辑/新增钮） */
  action?: ReactNode;
  /** 是否渲染内置收缩三角与收缩动画（默认 true；描述区等常开分区传 false） */
  collapsible?: boolean;
  /** 受控：是否收起 */
  collapsed?: boolean;
  /** 受控：折叠切换回调 */
  onToggle?: () => void;
  /** 不受控：初始是否收起（默认展开） */
  defaultCollapsed?: boolean;
  /** 分区头附加类（覆默认 px-6 py-2，如描述区 px-6 pt-4 pb-2） */
  headerClassName?: string;
  /** 内容包裹层附加类（各区内容自带 px-6 时可不传） */
  contentClassName?: string;
  children: ReactNode;
}


export function DetailSection({
  icon,
  title,
  count,
  action,
  collapsible = true,
  collapsed: collapsedProp,
  onToggle,
  defaultCollapsed = false,
  className,
  headerClassName,
  contentClassName,
  children,
  ...rest
}: DetailSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!defaultCollapsed);
  const collapsed = collapsible && collapsedProp !== undefined ? collapsedProp : collapsible ? !open : false;
  const toggle = onToggle ?? (() => setOpen((v) => !v));

  return (
    <div className={cn('shrink-0', className)} {...rest}>
      {/* 分区头 */}
      <div className={cn('flex items-center justify-between py-2', headerClassName ?? 'px-6')}>
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <span className="truncate">{title}</span>
          {count != null ? (
            <span className="text-3xs font-normal normal-case tabular-nums">{count}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {action}
          {collapsible && (
            <RawButton
              type="button"
              onClick={toggle}
              className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={collapsed ? t('common.expand') : t('common.collapse')}
              aria-expanded={!collapsed}
            >
              <ChevronDown
                className={cn('size-3 transition-transform', !collapsed && 'rotate-180')}
              />
            </RawButton>
          )}
        </div>
      </div>

      {/* 内容区：grid-rows 动画实现流畅展开 / 收起（与 SidebarPanel 同一手势） */}
      {collapsible ? (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-slow ease-out',
            collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
          )}
        >
          <div className={cn('overflow-hidden', contentClassName)}>{children}</div>
        </div>
      ) : (
        <div className={contentClassName}>{children}</div>
      )}
    </div>
  );
}

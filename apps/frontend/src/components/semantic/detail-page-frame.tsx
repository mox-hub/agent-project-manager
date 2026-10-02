/**
 * DetailPageFrame - L2 详情页双栏母版（§20.2：详情页结构自管双栏、不走 PageShell
 * 居中滚动，主栏宽度同表分发）
 *
 * 收编 task/bug/member/team 四详情页逐字重复骨架：
 * `PageShell(overflow-hidden) > SubPageToolbar > [ 主栏自滚动+居中宽档 | RightSidebar ]`
 * 侧栏开关二态（asideHidden）内聚本件，经 `toolbar({ sidebar })` render prop 下发
 * 给 SubPageToolbar 的 sidebar prop；RightSidebar 的 hidden 同步接管。
 */
import { useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageShell, type PageShellVariant, VARIANT_CONTAINER_CLASSES } from './page-shell';
import { RightSidebar } from './right-sidebar';

export interface DetailPageFrameProps extends ComponentProps<'div'> {
  /** 页面标识（透传 PageShell 的 data-ai-page） */
  aiPage: string;
  /** 顶部工具栏槽：sidebar 二态由本件内聚下发（接 SubPageToolbar 的 sidebar prop） */
  toolbar: (slots: { sidebar: { open: boolean; onToggle: () => void } }) => ReactNode;
  /** 主栏内容（自滚动 + 居中宽档） */
  main: ReactNode;
  /** 右栏内容；不传则不渲染右栏（asideHidden 状态仍存在，无副作用） */
  aside?: ReactNode;
  /** 右栏初始隐藏（非受控，默认显示；与受控二选一） */
  asideDefaultHidden?: boolean;
  /** 受控：右栏是否隐藏（页面需要命令口展开右栏时用，如验收契约「编辑」入口） */
  asideHidden?: boolean;
  /** 受控：右栏隐藏态变化回调 */
  onAsideHiddenChange?: (hidden: boolean) => void;
  /** 主栏宽度档（L1 总表分发，默认 reading max-w-4xl——详情页既有基线） */
  mainWidth?: PageShellVariant;
}

export function DetailPageFrame({
  aiPage,
  toolbar,
  main,
  aside,
  asideDefaultHidden = false,
  asideHidden: asideHiddenProp,
  onAsideHiddenChange,
  mainWidth = 'reading',
  className,
  ...rest
}: DetailPageFrameProps) {
  const [internalHidden, setInternalHidden] = useState(asideDefaultHidden);
  const asideHidden = asideHiddenProp !== undefined ? asideHiddenProp : internalHidden;
  const setAsideHidden = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(asideHidden) : v;
    if (asideHiddenProp === undefined) setInternalHidden(next);
    onAsideHiddenChange?.(next);
  };
  const sidebar = { open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) };

  return (
    <PageShell aiPage={aiPage} className={cn('overflow-hidden', className)}>
      {toolbar({ sidebar })}
      <div className="flex flex-1 min-h-0 overflow-hidden" {...rest}>
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          <div className={cn('flex-1 flex flex-col', VARIANT_CONTAINER_CLASSES[mainWidth])}>
            {main}
          </div>
        </div>
        {aside != null && (
          <RightSidebar hidden={asideHidden}>{aside}</RightSidebar>
        )}
      </div>
    </PageShell>
  );
}

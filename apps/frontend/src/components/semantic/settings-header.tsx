/**
 * SettingsHeader - 设置页头（设置域专用标题栏，2026-10-01 设置页语义组件批）
 *
 * 双态形态（裁决 2026-10-01：毛玻璃卡 + text-2xl 档）：
 * - 常态（页首）：无底色无边框，大标题 text-2xl + tone 彩底图标 + 多行描述 +
 *   右侧操作槽 + 标题尾辅助节点（metrics）；
 * - stuck 态（吸顶卡片）：内容滚过后由 sentinel IntersectionObserver 判定吸顶，
 *   收缩为圆角毛玻璃卡（border + bg-background/85 + backdrop-blur-xs + shadow-xs），
 *   标题降为 text-base、描述隐藏、操作钮保留；scrubber 槽（SectionScrubber 栏目
 *   跳转）仅在吸顶态出现——sticky 空间零浪费。
 *
 * 替代 PageHeader 在设置子页的角色：PageShell 不传 title 即不渲染旧头，本组件作为
 * PageShell 内容区首子元素使用（挂点同旧头 = 设置壳右列 ScrollArea Viewport，
 * sticky 已由旧头验证）。sentinel 置于 sticky 盒外正上方（-mb-4 抵消消费方 gap-4；
 * 容器间距非 16px 时存在至多一个间距档的提前量，不影响判定正确性）。
 * props 面封闭（G8）：不接 className、不透传样式；槽位全部是显式 ReactNode 具名槽。
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 图标底框装饰色档（accent 点缀，非状态语义；同 stats-card 口径词表留在组件内） */
export type SettingsHeaderTone = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';

const TONE_CLASS: Record<SettingsHeaderTone, string> = {
  blue: 'bg-accent-blue-light text-accent-blue',
  green: 'bg-accent-green-light text-accent-green',
  yellow: 'bg-accent-yellow-light text-accent-yellow',
  red: 'bg-accent-red-light text-accent-red',
  purple: 'bg-accent-purple-light text-accent-purple',
  orange: 'bg-accent-orange-light text-accent-orange',
  gray: 'bg-muted text-muted-foreground',
};

export interface SettingsHeaderProps {
  icon: LucideIcon;
  /** 图标底框装饰色档 */
  tone?: SettingsHeaderTone;
  title: ReactNode;
  /** 标题下多行说明（吸顶态隐藏） */
  description?: ReactNode;
  /** 右侧操作槽（HeaderActionButton / FavoriteToggle 等） */
  actions?: ReactNode;
  /** 标题尾部辅助节点（计数等） */
  metrics?: ReactNode;
  /** 吸顶卡第二行栏目跳转（SectionScrubber），仅吸顶态显示 */
  scrubber?: ReactNode;
}

export function SettingsHeader({
  icon: Icon,
  tone = 'blue',
  title,
  description,
  actions,
  metrics,
  scrubber,
}: SettingsHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* 吸顶判定 sentinel：离开视口顶 = sticky 头已吸顶（零滚动监听） */}
      <div ref={sentinelRef} aria-hidden className="pointer-events-none -mb-4 h-px w-full" />
      <header
        data-slot="settings-header"
        data-stuck={stuck ? 'true' : 'false'}
        className="group/sh sticky top-0 z-dropdown"
      >
        <div className="rounded-lg border border-transparent px-0 py-0 transition-all duration-fast group-data-[stuck=true]/sh:border-border group-data-[stuck=true]/sh:bg-background/85 group-data-[stuck=true]/sh:px-4 group-data-[stuck=true]/sh:py-2.5 group-data-[stuck=true]/sh:shadow-xs group-data-[stuck=true]/sh:backdrop-blur-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md group-data-[stuck=true]/sh:size-6',
                  TONE_CLASS[tone],
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <h1 className="m-0 min-w-0 truncate text-2xl leading-tight font-semibold tracking-tight text-foreground group-data-[stuck=true]/sh:text-base">
                {title}
              </h1>
              {metrics ? <div className="flex shrink-0 items-center gap-2">{metrics}</div> : null}
            </div>
            {actions ? (
              <div className="flex shrink-0 items-center gap-2 pt-1.5 group-data-[stuck=true]/sh:pt-0">
                {actions}
              </div>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1.5 text-sm text-content-text-secondary group-data-[stuck=true]/sh:hidden">
              {description}
            </p>
          ) : null}
          {scrubber ? (
            <div className="mt-2 hidden min-w-0 group-data-[stuck=true]/sh:block">{scrubber}</div>
          ) : null}
        </div>
      </header>
    </>
  );
}

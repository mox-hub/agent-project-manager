/**
 * SettingsSectionCard - 设置栏目卡（2026-10-01 设置页语义组件批）
 *
 * 设置子页栏目统一骨架：左侧 tone 彩底图标 + 标题 + 第二行描述 + 右侧操作槽
 * （gap-2，§20.8），下方内容区（border-t 分隔）承载 DefinitionRow 列表 / 表单等
 * 任意内容（§20.6：内容区不放嵌套卡）。tone='danger' 为 GitHub「Danger Zone」
 * 惯例封闭档（红框红标题，置于页底，破坏性操作配确认弹窗）。
 * id 即锚点（scroll-mt-24 避让 SettingsHeader 吸顶卡），供 SectionScrubber
 * 跳转与 scrollspy。
 * 与 semantic/section-card 的关系（裁决 2026-10-01）：新件先行、设置域全量切换；
 * 旧件维持现状待另批评估归并（存量 24 消费文件，小批原则不一次改写）。
 * props 面封闭（G8）：不接 className、不透传样式；tone 封闭词表留在组件内。
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 图标底框装饰色档（accent 点缀，非状态语义；同 stats-card 口径词表留在组件内） */
export type SettingsSectionTone = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';

const TONE_CLASS: Record<SettingsSectionTone, string> = {
  blue: 'bg-accent-blue-light text-accent-blue',
  green: 'bg-accent-green-light text-accent-green',
  yellow: 'bg-accent-yellow-light text-accent-yellow',
  red: 'bg-accent-red-light text-accent-red',
  purple: 'bg-accent-purple-light text-accent-purple',
  orange: 'bg-accent-orange-light text-accent-orange',
  gray: 'bg-muted text-muted-foreground',
};

export interface SettingsSectionCardProps {
  /** 锚点 id（供 SectionScrubber 跳转/scrollspy；不传则无锚点） */
  id?: string;
  icon: LucideIcon;
  /** 图标底框装饰色档；'danger' 为危险区特档（红框红标题，破坏性操作） */
  tone?: SettingsSectionTone | 'danger';
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function SettingsSectionCard({
  id,
  icon: Icon,
  tone = 'blue',
  title,
  description,
  actions,
  children,
}: SettingsSectionCardProps) {
  const danger = tone === 'danger';
  return (
    <section
      id={id}
      data-slot="settings-section-card"
      data-tone={tone}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-lg border bg-card',
        danger ? 'border-accent-red/40' : 'border-border',
      )}
    >
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md',
            danger ? 'bg-accent-red-light text-accent-red' : TONE_CLASS[tone],
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              'm-0 truncate text-sm font-medium',
              danger ? 'text-accent-red' : 'text-foreground',
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-content-text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/**
 * ProjectSourceTabs - 项目立项来源三分流组件（CAP-A-18 V2）
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, FolderGit2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProjectSource = 'scratch' | 'existing' | 'ai';

export interface ProjectSourceTabsProps {
  value: ProjectSource;
  onChange: (source: ProjectSource) => void;
  /** 可选：只渲染子集（按传入顺序），缺省全量三选（existing 尚无专属 UI，接入方按需过滤） */
  sources?: ProjectSource[];
}

export function ProjectSourceTabs({ value, onChange, sources }: ProjectSourceTabsProps) {
  const { t } = useTranslation();

  const allOptions: { value: ProjectSource; labelKey: string; defaultLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      value: 'scratch',
      labelKey: 'unifiedCreate.projectSource.scratch',
      defaultLabel: '从零全新立项',
      icon: PlusCircle,
    },
    {
      value: 'existing',
      labelKey: 'unifiedCreate.projectSource.existing',
      defaultLabel: '接入已有代码库',
      icon: FolderGit2,
    },
    {
      value: 'ai',
      labelKey: 'unifiedCreate.projectSource.ai',
      defaultLabel: '✨ AI 访谈立项 (Grill)',
      icon: Sparkles,
    },
  ];
  const options = sources
    ? sources
        .map((v) => allOptions.find((opt) => opt.value === v))
        .filter((opt): opt is (typeof allOptions)[number] => !!opt)
    : allOptions;

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md font-medium transition-all select-none',
              active
                ? 'bg-background text-foreground shadow-2xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              opt.value === 'ai' && active && 'text-accent-purple border-accent-purple/40',
            )}
          >
            <Icon className={cn('size-3.5', opt.value === 'ai' ? 'text-accent-purple' : 'opacity-70')} />
            <span className="truncate">{t(opt.labelKey, { defaultValue: opt.defaultLabel })}</span>
          </button>
        );
      })}
    </div>
  );
}

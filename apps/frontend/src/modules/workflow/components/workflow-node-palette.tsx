/**
 * WorkflowNodePalette（CAP-A-12 切片②反馈改造）——编辑模式的待选组件库。
 * 分类分组（AI 能力 / 人工环节 / 集成 / 流程逻辑 / 产品动作），点击插入画布。
 * 产品动作分类展开注册表目录（/workflows/actions），点击直接带 action id。
 */
import { useTranslation } from 'react-i18next';
import { Globe, GitBranch, Plus, ShieldCheck, Sparkles, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowActionInfo } from '../api/workflow-api';

interface PaletteItem {
  key: string;
  label: string;
  desc?: string;
  icon: LucideIcon;
  className: string;
  /** 点击回调携带的类型标识（action 项带具体动作 id） */
  type: string;
  actionId?: string;
}

interface PaletteGroup {
  labelKey: string;
  items: PaletteItem[];
}

export function WorkflowNodePalette({
  actions,
  onAdd,
  className,
}: {
  actions: WorkflowActionInfo[];
  onAdd: (type: string, actionId?: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();

  const groups: PaletteGroup[] = [
    {
      labelKey: 'workflow.palette.group.ai',
      items: [
        {
          key: 'llm',
          label: t('workflow.canvas.step.llm'),
          desc: t('workflow.palette.llmDesc'),
          icon: Sparkles,
          className: 'text-accent-purple',
          type: 'llm',
        },
      ],
    },
    {
      labelKey: 'workflow.palette.group.human',
      items: [
        {
          key: 'human-confirm',
          label: t('workflow.canvas.step.humanConfirm'),
          desc: t('workflow.palette.confirmDesc'),
          icon: ShieldCheck,
          className: 'text-accent-yellow',
          type: 'human-confirm',
        },
      ],
    },
    {
      labelKey: 'workflow.palette.group.logic',
      items: [
        {
          key: 'condition',
          label: t('workflow.canvas.step.condition'),
          desc: t('workflow.palette.conditionDesc'),
          icon: GitBranch,
          className: 'text-accent-orange',
          type: 'condition',
        },
      ],
    },
    {
      labelKey: 'workflow.palette.group.integration',
      items: [
        {
          key: 'http',
          label: t('workflow.canvas.step.http'),
          desc: t('workflow.palette.httpDesc'),
          icon: Globe,
          className: 'text-accent-blue',
          type: 'http',
        },
      ],
    },
    {
      labelKey: 'workflow.palette.group.actions',
      items: actions.map((a) => ({
        key: `action:${a.id}`,
        label: a.title,
        desc: a.description,
        icon: Wrench,
        className: 'text-accent-green',
        type: 'action',
        actionId: a.id,
      })),
    },
  ];

  return (
    <div
      className={cn('flex flex-col gap-4 overflow-y-auto p-3', className)}
      data-ai="workflow.palette"
    >
      {groups.map((group) => (
        <section key={group.labelKey} className="space-y-1.5">
          <h4 className="text-11 font-medium text-content-text-muted">
            {t(group.labelKey)}
          </h4>
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onAdd(item.type, item.actionId)}
                className="flex w-full items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors hover:bg-accent/40"
                data-ai={`workflow.palette.${item.key}`}
              >
                <item.icon className={cn('mt-0.5 size-3.5 shrink-0', item.className)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-content-text">
                    {item.label}
                  </span>
                  {item.desc ? (
                    <span className="mt-0.5 block line-clamp-2 text-11 leading-relaxed text-content-text-muted">
                      {item.desc}
                    </span>
                  ) : null}
                </span>
                <Plus className="mt-0.5 size-3 shrink-0 text-content-text-muted" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * 提示词分区（设置 · AI 组，CAP-A-24）：
 * - 注入开关：派发 prompt 逐段注入控制（系统/项目/角色/团队/成员/任务/技能/上下文），
 *   缺省全开；变更即时生效于下一次派发。
 * - 系统提示词：内置资产只读查看（无写端点——系统规范不提供人工改写通道）。
 * - 分层提示词编辑入口导航：项目级在项目设置、任务级在任务详情、角色级在角色管理。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCode2, FolderKanban, ListChecks, ScrollText, ShieldCheck, UserRound } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SectionCard } from '@/components/ui/section-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { PromptEditor } from '@/shared/components/prompt-editor';
import { cn } from '@/lib/utils';
import {
  usePromptConfig,
  useSystemPromptDetail,
  useSystemPrompts,
  useUpdatePromptConfig,
  type PromptInjectionToggles,
} from '@/modules/prompt/api/prompt-api';

const TOGGLE_ORDER: Array<keyof PromptInjectionToggles> = [
  'system',
  'project',
  'role',
  'team',
  'member',
  'task',
  'skills',
  'context',
];

const TOGGLE_ICONS: Record<keyof PromptInjectionToggles, typeof ShieldCheck> = {
  system: ShieldCheck,
  project: FolderKanban,
  role: UserRound,
  team: UserRound,
  member: UserRound,
  task: ListChecks,
  skills: FileCode2,
  context: ScrollText,
};

function ToggleRow({
  toggleKey,
  checked,
  onChange,
}: {
  toggleKey: keyof PromptInjectionToggles;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  const Icon = TOGGLE_ICONS[toggleKey];
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{t(`prompts.toggle.${toggleKey}`)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t(`prompts.toggle.${toggleKey}Desc`)}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        data-ai-component={`settings.prompts.toggle.${toggleKey}`}
        data-ai-action={`settings.prompts.toggle.${toggleKey}.change`}
      />
    </div>
  );
}

function SystemPromptViewer() {
  const { t } = useTranslation();
  const list = useSystemPrompts();
  const items = list.data?.items ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  // 默认选中第一项：派生值兜底（selected 为空或已失效时回落首项），无需 effect 同步
  const activeKey = selected && items.some((i) => i.key === selected) ? selected : (items[0]?.key ?? null);
  const detail = useSystemPromptDetail(activeKey);

  if (list.isLoading) {
    return (
      <div className="flex gap-4">
        <div className="w-56 shrink-0 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-40 flex-1" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState variant="card" icon={ScrollText} title={t('prompts.system.empty')} />;
  }

  return (
    <div className="flex gap-4">
      {/* 左列表 */}
      <div className="w-56 shrink-0 space-y-1" data-ai-component="settings.prompts.system.list">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSelected(item.key)}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-left transition-colors',
              item.key === activeKey
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted/60',
            )}
            data-ai-component={`settings.prompts.system.item.${item.key}`}
            data-ai-action={`settings.prompts.system.item.${item.key}.click`}
          >
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t('prompts.system.charCount', { count: item.charCount })}
            </p>
          </button>
        ))}
      </div>
      {/* 右只读查看器 */}
      <div className="min-w-0 flex-1">
        {detail.isLoading || !detail.data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{detail.data.title}</h3>
              <Badge variant="secondary" className="bg-accent-blue/10 text-accent-blue">
                {t('prompts.system.builtin')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{detail.data.description}</p>
            <PromptEditor
              value={detail.data.content}
              readOnly
              className="max-h-96 overflow-y-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function PromptsSettingsSection() {
  const { t } = useTranslation();
  const config = usePromptConfig();
  const update = useUpdatePromptConfig();
  const toggles = config.data?.toggles;

  return (
    <PageShell title={t('settings.prompts')} icon={ScrollText}>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-6">
        {/* 注入开关 */}
        <SectionCard
          title={t('prompts.toggles.title')}
          description={t('prompts.toggles.desc')}
        >
          {config.isLoading || !toggles ? (
            <div className="space-y-2 px-3 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="divide-y divide-border/60" data-ai-component="settings.prompts.toggles">
              {TOGGLE_ORDER.map((key) => (
                <ToggleRow
                  key={key}
                  toggleKey={key}
                  checked={toggles[key]}
                  onChange={(next) => update.mutate({ [key]: next })}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* 系统提示词（只读） */}
        <SectionCard
          title={t('prompts.system.title')}
          description={t('prompts.system.desc')}
        >
          <SystemPromptViewer />
        </SectionCard>

        {/* 分层编辑入口导航 */}
        <SectionCard title={t('prompts.where.title')} description={t('prompts.where.desc')}>
          <div className="space-y-2 px-3 py-1 text-xs text-muted-foreground" data-ai-component="settings.prompts.where">
            <p>· {t('prompts.where.project')}</p>
            <p>· {t('prompts.where.task')}</p>
            <p>· {t('prompts.where.role')}</p>
            <p>· {t('prompts.where.member')}</p>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

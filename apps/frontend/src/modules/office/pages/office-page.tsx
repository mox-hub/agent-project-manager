/**
 * 办公室页 —— 「走进办公室 = 先看得见他」（AI 同事化 · 候选 C）。
 * 首屏是员工卡不是输入框：每个 AI 成员在干什么/忙不忙/压着多少待决/还能接多少活。
 * 同事位（AssistantColleagueSlot）是门，这间屋子用真数据填满。
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bot, DoorOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { NativeSelect } from '@/components/ui/native-select';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { projectApi } from '@/modules/project/api/project-api';
import { useOfficeSummary } from '../hooks/use-office-summary';
import { ColleagueCard } from '../components/colleague-card';

export function OfficePage() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState<string>('');

  const summary = useOfficeSummary(projectId || undefined);
  const projects = useQuery({
    queryKey: ['office', 'project-options'],
    queryFn: () => projectApi.getList({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const colleagues = summary.data?.colleagues ?? [];
  const totals = summary.data?.totals;

  return (
    <PageShell aiPage={CORE_AI_PAGE_IDS.office}>
      <PageHeader
        title={t('office.title')}
        icon={DoorOpen}
        iconColor="#8B5CF6"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4">
        {/* 汇总条 + 项目过滤 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-content-text-muted" data-ai-component="office.totals">
            {totals ? (
              t('office.totals', {
                colleagues: totals.colleagues,
                working: totals.working,
                needYou: totals.needYou,
                blocking: totals.blocking,
              })
            ) : (
              <Skeleton className="h-4 w-64" />
            )}
          </p>
          <NativeSelect
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-56"
            aria-label={t('office.projectFilter')}
            data-ai-component="office.project-filter"
            data-ai-role="filter"
          >
            <option value="">{t('office.allProjects')}</option>
            {(projects.data?.items ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* 员工卡网格 */}
        {summary.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : colleagues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <Bot className="size-8 text-content-text-muted" />
            <p className="text-sm font-medium text-content-text">{t('office.empty.title')}</p>
            <p className="max-w-sm text-xs text-content-text-muted">
              {t('office.empty.hint')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {colleagues.map((colleague) => (
              <ColleagueCard key={colleague.memberId} colleague={colleague} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default OfficePage;

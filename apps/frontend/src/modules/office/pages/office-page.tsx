/**
 * 办公室页 —— 「走进办公室 = 先看得见他」（AI 同事化 · 候选 C）。
 * 首屏是员工卡不是输入框：每个 AI 成员在干什么/忙不忙/压着多少待决/还能接多少活。
 * 同事位（AssistantColleagueSlot）是门，这间屋子用真数据填满。
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bot, DoorOpen, ShieldCheck } from 'lucide-react';
import { PageHeader, nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { PageShell } from '@/components/semantic/page-shell';
import { EmptyState } from '@/components/semantic/empty-state';
import { IconStack } from '@/components/semantic/icon-stack';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { projectApi } from '@/modules/project/api/project-api';
import { useOfficeSummary } from '../hooks/use-office-summary';
import { ColleagueCard } from '../components/colleague-card';
import { CollaborationSection } from '../components/collaboration-section';
import { TrustTiersPanel } from '../components/trust-tiers-panel';

export function OfficePage() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState<string>('');
  const [trustPanelOpen, setTrustPanelOpen] = useState(false);

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
        favorites={<FavoriteToggle label={nodeToText(t('office.title')).trim()} />}
        icon={DoorOpen}
        iconColor="text-accent-purple"
        actions={
          <HeaderActionButton
            variant="outline"
            icon={ShieldCheck}
            label={t('office.trust.entry')}
            onClick={() => setTrustPanelOpen(true)}
            data-ai-action="office.trust.entry.click"
          />
        }
      />

      <div className="flex w-full flex-col gap-4 px-4 py-3.5 sm:px-6 sm:py-4">
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
          <SelectField
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
          </SelectField>
        </div>

        {/* 员工卡网格 */}
        {summary.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : colleagues.length === 0 ? (
          <EmptyState
            variant="page"
            visual={
              <IconStack aria-hidden="true" className="text-accent-purple">
                <Bot className="size-4 text-accent-purple" />
              </IconStack>
            }
            title={t('office.empty.title')}
            description={t('office.empty.hint')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {colleagues.map((colleague) => (
              <ColleagueCard key={colleague.memberId} colleague={colleague} />
            ))}
          </div>
        )}

        {/* 接口协作卡（交接试点）：前后端 AI 工件化协作，人闸口验证 */}
        <CollaborationSection projectId={projectId || undefined} />
      </div>

      {/* 信任等级说明（CAP-B-07，自设置页「AI 执行中心」信任 tab 迁入）；宽面板档承载三列定义卡（§10.8） */}
      <Dialog open={trustPanelOpen} onOpenChange={setTrustPanelOpen}>
        <DialogContent size="wide">
          <DialogHeader>
            <DialogTitle>{t('office.trust.title')}</DialogTitle>
            <DialogDescription>{t('office.trust.desc')}</DialogDescription>
          </DialogHeader>
          <TrustTiersPanel />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default OfficePage;

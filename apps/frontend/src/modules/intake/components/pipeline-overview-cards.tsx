import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonList } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { playbookApi } from '@/modules/project/api/playbook-api';
import type { PlaybookStageStatusValue } from '@/modules/project/api/playbook-api';
import type { DocumentListItem } from '@/modules/document/api/document-api';
import { AnalysisDraftDialog } from './analysis-draft-dialog';

/**
 * 管道总览卡（CAP-P-01 五期切片 1，生命周期主入口）：
 * 需求纪要按项目聚合为管道卡——五阶段进度点（usePlaybookStatus 同源数据）+
 * 完备度徽章占位（切片 2 readiness-review 接入）+ 阶段 CTA 钻取剧本页。
 * 未关联项目的纪要仍留在下方文档列表，不进管道卡。
 */

const STAGE_DOT: Record<PlaybookStageStatusValue, string> = {
  done: 'bg-accent-green border-accent-green',
  active: 'border-accent-blue bg-accent-blue/20',
  skipped: 'border-border bg-muted',
  pending: 'border-border bg-background',
};

interface PipelineProject {
  projectId: string;
  projectName: string;
  latestDoc: DocumentListItem;
  docs: DocumentListItem[];
}

export function PipelineOverviewCards({
  docs,
  isLoading,
}: {
  docs: DocumentListItem[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [analysisFor, setAnalysisFor] = useState<PipelineProject | null>(null);

  const pipelines = useMemo(() => {
    const byProject = new Map<string, DocumentListItem[]>();
    docs.forEach((doc) => {
      const pid = doc.projectId;
      if (!pid) return;
      const list = byProject.get(pid) ?? [];
      list.push(doc);
      byProject.set(pid, list);
    });
    return Array.from(byProject.entries()).map(([projectId, list]) => ({
      projectId,
      projectName: list[0]?.project?.name ?? projectId,
      latestDoc: list[0],
      docs: list,
    }));
  }, [docs]);

  const statusQueries = useQueries({
    queries: pipelines.map((p) => ({
      queryKey: ['projects', p.projectId, 'playbook'] as const,
      queryFn: () => playbookApi.getStatus(p.projectId),
    })),
  });
  const statusByProject = new Map<string, Awaited<ReturnType<typeof playbookApi.getStatus>>>();
  statusQueries.forEach((q, i) => {
    const p = pipelines[i];
    if (p && q.data) statusByProject.set(p.projectId, q.data);
  });

  return (
    <SectionCard
      title={t('intake.pipelineCards.title')}
      description={t('intake.pipelineCards.desc')}
    >
      {isLoading ? (
        <SkeletonList count={2} />
      ) : pipelines.length === 0 ? (
        <div className="py-6 text-sm text-content-text-muted">
          {t('intake.pipelineCards.empty')}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {pipelines.map((p) => {
            const status = statusByProject.get(p.projectId);
            const stages = status?.stages ?? [];
            const activeStage = stages.find((s) => s.status === 'active');
            const mounted = !!status?.template;
            const isAnalysisActive = activeStage?.key === 'analysis';

            return (
              <div key={p.projectId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {p.latestDoc.title}
                    </div>
                    <div className="mt-0.5 text-xs text-content-text-muted">
                      {p.projectName}
                    </div>
                  </div>
                  {/* 完备度徽章位：切片 2 readiness-review 落地后显示 ready/缺口/阻塞三态 */}
                  <span
                    className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-10 text-content-text-muted"
                    data-ai-component="intake.pipeline.readiness-badge"
                    data-ai-role="status"
                  >
                    {t('intake.pipelineCards.notAssessed')}
                  </span>
                </div>

                {stages.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {stages.map((stage) => (
                      <span
                        key={stage.key}
                        title={`${stage.name} · ${t(`intake.pipelineCards.stageStatus.${stage.status}`)}`}
                        className={cn(
                          'size-2.5 rounded-full border',
                          STAGE_DOT[stage.status],
                        )}
                        data-stage-status={stage.status}
                      />
                    ))}
                    <span className="ml-1 text-10 text-content-text-muted">
                      {activeStage
                        ? t('intake.pipelineCards.activeStage', { stage: activeStage.name })
                        : t('intake.pipelineCards.allStagesDone')}
                    </span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center gap-2">
                  {isAnalysisActive && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setAnalysisFor(p)}
                    >
                      <Sparkles size={14} />
                      {t('intake.pipelineCards.analysisCta')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      navigate(`/app/projects/${p.projectId}/playbook`)
                    }
                  >
                    {mounted
                      ? activeStage
                        ? t('intake.pipelineCards.continueCta', { stage: activeStage.name })
                        : t('intake.pipelineCards.viewCta')
                      : t('intake.pipelineCards.mountCta')}
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnalysisDraftDialog
        open={!!analysisFor}
        onOpenChange={(open) => {
          if (!open) setAnalysisFor(null);
        }}
        projectId={analysisFor?.projectId}
        docs={analysisFor?.docs.map((d) => ({
          id: d.id,
          title: d.title,
          projectName: d.project?.name ?? null,
        })) ?? []}
        defaultResearchId={analysisFor?.latestDoc.id}
      />
    </SectionCard>
  );
}

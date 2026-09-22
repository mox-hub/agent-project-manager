import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonList } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { playbookApi } from '@/modules/project/api/playbook-api';
import type {
  PlaybookStageStatus,
  PlaybookStageStatusValue,
} from '@/modules/project/api/playbook-api';
import type { DocumentListItem } from '@/modules/document/api/document-api';
import { AnalysisDraftDialog } from './analysis-draft-dialog';
import { ReadinessDialog } from './readiness-dialog';
import { readinessCacheKey, type ReadinessReviewResult } from '../hooks/use-readiness-review';

/**
 * 管道总览卡（CAP-P-01 五期切片 1，生命周期主入口；切片 2 接完备性评估）：
 * 需求纪要按项目聚合为管道卡——五阶段进度点（usePlaybookStatus 同源数据）+
 * 完备度徽章（点击评估：六维度 + 缺口账，结果入 React Query 缓存）+
 * 阶段 CTA 钻取剧本页。未关联项目的纪要仍留在下方文档列表，不进管道卡。
 */

const STAGE_DOT: Record<PlaybookStageStatusValue, string> = {
  done: 'bg-accent-green border-accent-green',
  active: 'border-accent-blue bg-accent-blue/20',
  skipped: 'border-border bg-muted',
  pending: 'border-border bg-background',
};

const VERDICT_BADGE: Record<ReadinessReviewResult['verdict'], string> = {
  ready: 'border-accent-green/40 bg-accent-green-light/50 text-accent-green',
  'needs-clarification': 'border-accent-yellow/40 bg-accent-yellow-light/50 text-accent-yellow',
  blocked: 'border-accent-red/40 bg-accent-red-light/50 text-accent-red',
};

interface PipelineProject {
  projectId: string;
  projectName: string;
  latestDoc: DocumentListItem;
  docs: DocumentListItem[];
}

export function PipelineOverviewCards({
  docs,
  analysisDocs = [],
  isLoading,
}: {
  docs: DocumentListItem[];
  analysisDocs?: DocumentListItem[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [analysisFor, setAnalysisFor] = useState<PipelineProject | null>(null);
  const [readinessFor, setReadinessFor] = useState<PipelineProject | null>(null);

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
            return <PipelineCardInner key={p.projectId} pipeline={p} activeStage={activeStage} mounted={mounted} isAnalysisActive={isAnalysisActive} stages={stages} onOpenAnalysis={() => setAnalysisFor(p)} onOpenReadiness={() => setReadinessFor(p)} />;
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

      <ReadinessDialog
        open={!!readinessFor}
        onOpenChange={(open) => {
          if (!open) setReadinessFor(null);
        }}
        projectId={readinessFor?.projectId ?? ''}
        projectName={readinessFor?.projectName ?? ''}
        requirementDocId={readinessFor?.latestDoc.id ?? ''}
        analysisDocId={
          readinessFor
            ? analysisDocs.find((d) => d.projectId === readinessFor.projectId)?.id
            : undefined
        }
      />
    </SectionCard>
  );
}

/**
 * 单张管道卡：标题行 + 完备度徽章（读评估缓存，点击打开评估对话框）+
 * 五阶段进度点 + 阶段 CTA。徽章三态随评估结果着色，未评估为中性灰。
 */
function PipelineCardInner({
  pipeline,
  activeStage,
  mounted,
  isAnalysisActive,
  stages,
  onOpenAnalysis,
  onOpenReadiness,
}: {
  pipeline: PipelineProject;
  activeStage: PlaybookStageStatus | undefined;
  mounted: boolean;
  isAnalysisActive: boolean;
  stages: PlaybookStageStatus[];
  onOpenAnalysis: () => void;
  onOpenReadiness: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const readiness = useQuery<ReadinessReviewResult>({
    queryKey: readinessCacheKey(pipeline.projectId, pipeline.latestDoc.id),
    enabled: false,
    staleTime: Infinity,
  });
  const readinessResult = readiness.data;

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {pipeline.latestDoc.title}
          </div>
          <div className="mt-0.5 text-xs text-content-text-muted">
            {pipeline.projectName}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenReadiness}
          title={t('intake.pipelineCards.assessHint')}
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-10 transition-colors hover:bg-accent',
            readinessResult
              ? VERDICT_BADGE[readinessResult.verdict]
              : 'border-border bg-muted/40 text-content-text-muted',
          )}
          data-ai-component="intake.pipeline.readiness-badge"
          data-ai-role="status"
          data-testid={`readiness-badge-${pipeline.projectId}`}
        >
          <ShieldCheck size={11} />
          {readinessResult
            ? t(`intake.readiness.verdict.${readinessResult.verdict}`) +
              (readinessResult.missingInfo.length > 0
                ? ` · ${readinessResult.missingInfo.length}`
                : '')
            : t('intake.pipelineCards.notAssessed')}
        </button>
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
            onClick={onOpenAnalysis}
          >
            <Sparkles size={14} />
            {t('intake.pipelineCards.analysisCta')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate(`/app/projects/${pipeline.projectId}/playbook`)}
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
}

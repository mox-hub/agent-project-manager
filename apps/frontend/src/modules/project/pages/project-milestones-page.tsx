import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Circle,
  Flag,
  ListTodo,
  Plus,
  Rocket,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SkeletonList } from '@/components/ui/skeleton';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/ui/section-card';
import { AsyncState } from '@/components/ui/async-state';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { UnifiedCreateDialog } from '@/shared/components/create-dialog';
import {
  useProjectIterations,
  useProjectMilestones,
} from '@/modules/issue/hooks/use-project-tasks';
import type {
  IterationRef,
  MilestoneRef,
} from '@/modules/issue/api/issue-api';
import { formatDate } from '@/shared/lib/date-format';

/**
 * 里程碑五态（对齐后端 Milestone.status 字面量）：
 * planned | in_progress | reached | missed | cancelled
 */
const MILESTONE_TONE: Record<
  string,
  { labelKey: string; icon: typeof Flag; iconClass: string; badgeClass: string }
> = {
  planned: {
    labelKey: 'project.milestonesPage.status.planned',
    icon: Circle,
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
  in_progress: {
    labelKey: 'project.milestonesPage.status.inProgress',
    icon: TrendingUp,
    iconClass: 'text-accent-blue',
    badgeClass: 'bg-accent-blue-light text-accent-blue border-accent-blue/30',
  },
  reached: {
    labelKey: 'project.milestonesPage.status.reached',
    icon: CheckCircle2,
    iconClass: 'text-accent-green',
    badgeClass: 'bg-accent-green-light text-accent-green border-accent-green/30',
  },
  missed: {
    labelKey: 'project.milestonesPage.status.missed',
    icon: AlertTriangle,
    iconClass: 'text-accent-red',
    badgeClass: 'bg-accent-red-light text-accent-red border-accent-red/30',
  },
  cancelled: {
    labelKey: 'project.milestonesPage.status.cancelled',
    icon: XCircle,
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
};

function milestoneTone(status: string) {
  return (
    MILESTONE_TONE[status.toLowerCase()] ?? MILESTONE_TONE.planned
  );
}

/** 发版状态徽标 tone（与 release 模块列表口径一致的语义色映射） */
const RELEASE_TONE: Record<string, string> = {
  draft: 'bg-muted/50 text-muted-foreground',
  gated: 'bg-accent-yellow-light text-accent-yellow',
  approved: 'bg-accent-blue-light text-accent-blue',
  publishing: 'bg-accent-yellow-light text-accent-yellow',
  released: 'bg-accent-green-light text-accent-green',
  failed: 'bg-accent-red-light text-accent-red',
};

/** 迭代状态（进行中高亮，其余弱化） */
function iterationTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('progress') || normalized.includes('active')) {
    return {
      labelKey: 'project.milestonesPage.status.inProgress',
      badgeClass: 'bg-accent-blue-light text-accent-blue border-accent-blue/30',
      barClass: 'bg-accent-blue/15 border-accent-blue/30',
    };
  }
  if (normalized.includes('done') || normalized.includes('complete')) {
    return {
      labelKey: 'project.milestonesPage.status.completed',
      badgeClass: 'bg-accent-green-light text-accent-green border-accent-green/30',
      barClass: 'bg-accent-green/10 border-accent-green/30',
    };
  }
  return {
    labelKey: 'project.milestonesPage.status.planned',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    barClass: 'bg-muted/30 border-border',
  };
}

type TimelineEntry =
  | { kind: 'iteration'; at: string; iteration: IterationRef }
  | { kind: 'milestone'; at: string; milestone: MilestoneRef };

export function ProjectMilestonesPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    data: summary,
    isLoading: summaryLoading,
    isError,
    error,
  } = useProjectDashboardSummary(projectId);
  const {
    data: milestones,
    isLoading: milestonesLoading,
  } = useProjectMilestones(projectId);
  const {
    data: iterations,
    isLoading: iterationsLoading,
  } = useProjectIterations(projectId);
  const [showUnifiedCreate, setShowUnifiedCreate] = useState(false);

  const completedCount = useMemo(
    () =>
      (milestones ?? []).filter(
        (m) => m.status.toLowerCase() === 'reached',
      ).length,
    [milestones],
  );

  const timelineCompletion = useMemo(() => {
    if (!milestones?.length) return 0;
    return Math.round((completedCount / milestones.length) * 100);
  }, [completedCount, milestones]);

  /** 时间轴：迭代（按 startDate）与里程碑（按 targetDate）合并，旧 → 新 */
  const { scheduled, unscheduled } = useMemo(() => {
    const entries: TimelineEntry[] = [];
    for (const milestone of milestones ?? []) {
      if (milestone.targetDate) {
        entries.push({ kind: 'milestone', at: milestone.targetDate, milestone });
      }
    }
    for (const iteration of iterations ?? []) {
      if (iteration.startDate) {
        entries.push({ kind: 'iteration', at: iteration.startDate, iteration });
      }
    }
    entries.sort((a, b) => a.at.localeCompare(b.at));
    return {
      scheduled: entries,
      unscheduled: (milestones ?? []).filter((m) => !m.targetDate),
    };
  }, [milestones, iterations]);

  const isLoading = summaryLoading || milestonesLoading || iterationsLoading;

  if (!projectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('project.detail.notFound')}
      </div>
    );
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectMilestones}
      projectId={projectId}
      projectName={summary?.projectMeta.name}
      title={t('project.detail.milestones')}
      hideBreadcrumb
      description={t('project.detail.milestonesDesc', {
        completed: completedCount,
        total: milestones?.length || 0,
      })}
      actions={
        <HeaderActionButton
          icon={Plus}
          label={t('project.detail.newMilestone')}
          onClick={() => setShowUnifiedCreate(true)}
          data-ai-component="project.project-milestones.header.new-milestone"
          data-ai-action="project.project-milestones.header.new-milestone.click"
          data-ai-role="submit"
        />
      }
      contextBar={
        <SectionCard className="py-0" contentClassName="gap-0 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} />
              {formatDate(
                summary?.projectMeta.startDate,
                t('project.milestonesPage.notSet'),
              )}
            </span>
            <span>
              {formatDate(
                summary?.projectMeta.targetDate,
                t('project.milestonesPage.notSet'),
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={timelineCompletion} className="h-2 flex-1" />
            <span className="text-xs font-medium text-foreground">
              {timelineCompletion}%
            </span>
          </div>
        </SectionCard>
      }
    >
      <AsyncState
        isLoading={isLoading}
        error={isError ? error?.message || t('project.milestonesPage.loadFailed') : null}
        isEmpty={
          scheduled.length === 0 && unscheduled.length === 0
        }
        emptyTitle={t('project.milestonesPage.empty')}
        loadingFallback={
          <SectionCard className="py-0" contentClassName="px-4 py-4">
            <SkeletonList count={4} avatar />
          </SectionCard>
        }
      >
        <div className="space-y-6">
          {scheduled.length > 0 && (
            <SectionCard className="py-0" contentClassName="px-4 py-4">
              <div className="flex flex-col">
                {scheduled.map((entry, index) =>
                  entry.kind === 'iteration' ? (
                    <TimelineIterationRow
                      key={`iter-${entry.iteration.id}`}
                      iteration={entry.iteration}
                      isLast={index === scheduled.length - 1}
                    />
                  ) : (
                    <TimelineMilestoneRow
                      key={`ms-${entry.milestone.id}`}
                      milestone={entry.milestone}
                      dateLabel={formatDate(entry.at)}
                      isLast={index === scheduled.length - 1}
                    />
                  ),
                )}
              </div>
            </SectionCard>
          )}

          {unscheduled.length > 0 && (
            <SectionCard
              title={t('project.milestonesPage.unscheduled')}
              description={t('project.milestonesPage.unscheduledDesc')}
              className="py-0"
              contentClassName="px-4 py-3"
            >
              <div className="space-y-2">
                {unscheduled.map((milestone) => {
                  const tone = milestoneTone(milestone.status);
                  const Icon = tone.icon;
                  return (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Icon size={14} className={cn('shrink-0', tone.iconClass)} />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {milestone.name}
                      </span>
                      <Badge className={tone.badgeClass}>
                        {t(tone.labelKey)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </div>
      </AsyncState>

      {/* Unified Create Dialog */}
      <UnifiedCreateDialog
        open={showUnifiedCreate}
        onOpenChange={setShowUnifiedCreate}
        defaultType="milestone"
        projectId={projectId}
      />
    </ProjectDetailFrame>
  );
}

/** 时间轴行骨架：左日期标签 + 中竖线节点 + 右内容（高密区紧凑行） */
function TimelineRow({
  dateLabel,
  icon,
  iconClass,
  isLast,
  children,
}: {
  dateLabel: string;
  icon: typeof Flag;
  iconClass: string;
  isLast: boolean;
  children: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="flex gap-3">
      <div className="w-24 shrink-0 pt-3 text-right text-11 text-muted-foreground">
        {dateLabel}
      </div>
      <div className="relative flex w-4 shrink-0 flex-col items-center">
        <span
          className={cn(
            'z-10 mt-3 flex size-4 items-center justify-center rounded-full border bg-card',
            iconClass,
          )}
        >
          <Icon size={10} />
        </span>
        {!isLast && <span className="w-px flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1 pb-5">{children}</div>
    </div>
  );
}

/** 迭代 = 时间盒区间条（名称 + 起止 + 容量） */
function TimelineIterationRow({
  iteration,
  isLast,
}: {
  iteration: IterationRef;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const tone = iterationTone(iteration.status);
  const capacity = iteration._count?.issues ?? 0;
  return (
    <TimelineRow
      dateLabel={formatDate(
        iteration.startDate,
        t('project.milestonesPage.notSet'),
      )}
      icon={CalendarRange}
      iconClass="text-accent-purple"
      isLast={isLast}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-md border px-3 py-2',
          tone.barClass,
        )}
      >
        <span className="text-sm font-medium text-foreground">
          {iteration.name}
        </span>
        <Badge className={tone.badgeClass}>{t(tone.labelKey)}</Badge>
        <span className="ml-auto inline-flex items-center gap-1.5 text-11 text-muted-foreground">
          <CalendarRange size={11} />
          {formatDate(iteration.startDate, '—')} →{' '}
          {formatDate(iteration.endDate, '—')}
          <span className="inline-flex items-center gap-0.5">
            <ListTodo size={11} />
            {t('project.milestonesPage.taskCount', { count: capacity })}
          </span>
        </span>
      </div>
    </TimelineRow>
  );
}

/** 里程碑 = 计划轴节点（五态徽标 + 目标日期 + 描述 + 关联发布标记） */
function TimelineMilestoneRow({
  milestone,
  dateLabel,
  isLast,
}: {
  milestone: MilestoneRef;
  dateLabel: string;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const tone = milestoneTone(milestone.status);
  return (
    <TimelineRow
      dateLabel={dateLabel}
      icon={Flag}
      iconClass={tone.iconClass}
      isLast={isLast}
    >
      <div className="rounded-md border bg-card px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {milestone.name}
          </span>
          <Badge className={tone.badgeClass}>{t(tone.labelKey)}</Badge>
          <span className="text-11 text-muted-foreground">
            {t('project.milestonesPage.targetDate')}
            {dateLabel}
          </span>
          {milestone.taskCount !== undefined && milestone.taskCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-11 text-muted-foreground">
              <ListTodo size={11} />
              {t('project.milestonesPage.taskCount', {
                count: milestone.taskCount,
              })}
            </span>
          )}
        </div>
        {milestone.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {milestone.description}
          </p>
        )}
        {milestone.releases && milestone.releases.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {milestone.releases.map((release) => (
              <span
                key={release.id}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-11"
              >
                <Rocket size={11} className="text-accent-green" />
                <span className="font-mono font-medium text-foreground">
                  v{release.version}
                </span>
                <Badge
                  className={cn(
                    'text-10',
                    RELEASE_TONE[release.status] ??
                      RELEASE_TONE.draft,
                  )}
                >
                  {t(`release.status.${release.status}`)}
                </Badge>
                {release.releasedAt && (
                  <span className="text-muted-foreground">
                    {formatDate(release.releasedAt)}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </TimelineRow>
  );
}

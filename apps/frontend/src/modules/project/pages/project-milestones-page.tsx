import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  ListTodo,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SkeletonList } from '@/components/ui/skeleton';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SectionCard } from '@/components/ui/section-card';
import { AsyncState } from '@/components/ui/async-state';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { useProjectMilestones } from '@/modules/task/hooks/use-project-tasks';

function formatDate(value: string | null | undefined, notSetText: string) {
  if (!value) return notSetText;
  return new Date(value).toLocaleDateString();
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('done') || normalized.includes('complete')) {
    return {
      text: 'project.milestonesPage.status.completed',
      icon: CheckCircle2,
      iconClass: 'text-accent-green',
      badgeClass: 'bg-accent-green-light text-accent-green border-accent-green/30',
    };
  }
  if (normalized.includes('progress') || normalized.includes('active')) {
    return {
      text: 'project.milestonesPage.status.inProgress',
      icon: TrendingUp,
      iconClass: 'text-accent-blue',
      badgeClass: 'bg-accent-blue-light text-accent-blue border-accent-blue/30',
    };
  }
  return {
    text: 'project.milestonesPage.status.upcoming',
    icon: Clock3,
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
}

/** 优先级圆点：沿用 task-simple-list SEVERITY_CONFIG 的 Record 色板先例，取语义 accent 色 */
const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-accent-red',
  high: 'bg-accent-orange',
  medium: 'bg-accent-yellow',
  low: 'bg-accent-green',
};

export function ProjectMilestonesPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading: summaryLoading, isError, error } = useProjectDashboardSummary(projectId);
  const { data: milestones, isLoading: milestonesLoading } = useProjectMilestones(projectId);
  const [showUnifiedCreate, setShowUnifiedCreate] = useState(false);

  const completedCount = useMemo(() => {
    return (milestones ?? []).filter((milestone) =>
      milestone.status.toLowerCase().includes('done') || milestone.status.toLowerCase().includes('complete'),
    ).length;
  }, [milestones]);

  const timelineCompletion = useMemo(() => {
    if (!milestones?.length) return 0;
    return Math.round((completedCount / milestones.length) * 100);
  }, [completedCount, milestones]);

  // In-progress milestones expand by default; the accordion mounts after data load, so an uncontrolled defaultValue captures this.
  const defaultOpenValues = useMemo(
    () =>
      (milestones ?? [])
        .filter((milestone) => milestone.status.toLowerCase().includes('progress'))
        .map((milestone) => milestone.id),
    [milestones],
  );

  const isLoading = summaryLoading || milestonesLoading;

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">{t('project.detail.notFound')}</div>;
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
              {formatDate(summary?.projectMeta.startDate, t('project.milestonesPage.notSet'))}
            </span>
            <span>{formatDate(summary?.projectMeta.targetDate, t('project.milestonesPage.notSet'))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={timelineCompletion} className="h-2 flex-1" />
            <span className="text-xs font-medium text-foreground">{timelineCompletion}%</span>
          </div>
        </SectionCard>
      }
    >
      <AsyncState
        isLoading={isLoading}
        error={isError ? error?.message || t('project.milestonesPage.loadFailed') : null}
        isEmpty={!milestones || milestones.length === 0}
        emptyTitle={t('project.milestonesPage.empty')}
        loadingFallback={
          <SectionCard className="py-0" contentClassName="px-4 py-4">
            <SkeletonList count={4} avatar />
          </SectionCard>
        }
      >
        <SectionCard className="py-0" contentClassName="p-0">
          <Accordion multiple defaultValue={defaultOpenValues}>
            {(milestones ?? []).map((milestone) => {
              const tone = statusTone(milestone.status);
              const Icon = tone.icon;

              return (
                <AccordionItem key={milestone.id} value={milestone.id}>
                  <AccordionTrigger className="flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30 hover:no-underline">
                    <Icon size={15} className={cn('shrink-0', tone.iconClass)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{milestone.name}</h3>
                        <Badge className={tone.badgeClass}>{t(tone.text)}</Badge>
                        {milestone.taskCount !== undefined && milestone.taskCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <ListTodo size={12} />
                            {t('project.milestonesPage.taskCount', { count: milestone.taskCount })}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('project.milestonesPage.targetDate')}
                        {formatDate(milestone.targetDate, t('project.milestonesPage.notSet'))}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-border bg-muted/20 px-4 pt-3 pb-3">
                    <div className="space-y-2">
                      {milestone.tasks && milestone.tasks.length > 0 ? (
                        milestone.tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-xs">
                            {task.status.toLowerCase().includes('done') ? (
                              <CheckCircle2 size={14} className="shrink-0 text-accent-green" />
                            ) : (
                              <Circle size={14} className="shrink-0 text-muted-foreground" />
                            )}
                            <span className={cn('size-1.5 shrink-0 rounded-full', PRIORITY_DOT[task.priority ?? 'low'])} />
                            <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
                            <span className="shrink-0 text-muted-foreground">{task.status}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('project.detail.noTasksInMilestone')}</p>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
                        <Plus size={12} />
                        {t('project.detail.addTaskToMilestone')}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </SectionCard>
      </AsyncState>

      {/* Unified Create Dialog */}
      <UnifiedCreateDialog
        open={showUnifiedCreate}
        onOpenChange={setShowUnifiedCreate}
        defaultType="milestone"
        projectId={projectId}
        onSuccess={() => {
          setShowUnifiedCreate(false);
        }}
      />
    </ProjectDetailFrame>
  );
}

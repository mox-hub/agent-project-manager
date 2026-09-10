import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  FastForward,
  FileText,
  ListChecks,
  Play,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SkeletonList } from '@/components/ui/skeleton';
import { AsyncState } from '@/components/ui/async-state';
import { toast } from '@/components/ui/toast';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { InterviewDialog } from '../components/playbook/interview-dialog';
import { useIntakeComposite } from '@/modules/assistant/hooks/use-intake-composite';
import { decisionApi } from '@/modules/decision';
import {
  useMountPlaybook,
  usePlaybookStatus,
  usePlaybookTemplates,
  useSkipStage,
} from '../hooks/use-playbook';
import type {
  PlaybookStageStatus,
  PlaybookTemplate,
} from '../api/playbook-api';

/**
 * 剧本流程页（v2 纪要 §4.2 项目实例层「流程卡」）：
 * 阶段时间线 + 当前游标 + 闸门记录（含跳过留痕）。只读进度视图，
 * 闸门动作去决策收件箱完成（不开第二个拍板入口）。
 */
export function ProjectPlaybookPage() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const { data: status, isLoading, isError, refetch } = usePlaybookStatus(projectId);
  const { data: templates } = usePlaybookTemplates();
  const mount = useMountPlaybook(projectId);
  const skipStage = useSkipStage(projectId);

  const [interviewStage, setInterviewStage] = useState<string | null>(null);
  const [skipStageKey, setSkipStageKey] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');

  const mounted = !!status?.playbookRef;
  const templateDef = templates?.templates.find((tp) => tp.key === status?.playbookRef);
  const activeTemplate: PlaybookTemplate | undefined =
    templateDef ??
    (templates?.templates ?? []).find((tp) => tp.key === status?.playbookRef);
  const interviewStageDef = activeTemplate?.stages.find((s) => s.key === interviewStage) ?? null;
  const activeStage = status?.stages.find((s) => s.status === 'active');
  const activeGatePending = !!activeStage?.gateProposalId && activeStage.gateStatus === 'pending';

  // ── CAP-P-01 二期：组合件提案生成（拆解/验收草案工件就绪后可用）──
  const intake = useIntakeComposite(projectId);
  const [intakeProposalId, setIntakeProposalId] = useState<string | null>(null);
  const breakdownDoc = status?.stages.find((s) => s.key === 'breakdown')?.documentId;
  const acceptanceDoc = status?.stages.find((s) => s.key === 'acceptance-draft')?.documentId;
  const intakeReady = !!(breakdownDoc || acceptanceDoc);

  const handleIntake = () => {
    if (intake.isPending) return;
    intake.mutate(
      { breakdownDocumentId: breakdownDoc, acceptanceDocumentId: acceptanceDoc },
      {
        onSuccess: async (tasks) => {
          try {
            const proposal = await decisionApi.createProposal({
              kind: 'plan',
              title: t('project.playbookPage.intake.proposalTitle'),
              detail: t('project.playbookPage.intake.proposalDetail', { n: tasks.length }),
              payload: { added: tasks },
              projectId,
              proposerType: 'ai_agent',
            });
            setIntakeProposalId(proposal.id);
            toast.success(t('project.playbookPage.intake.createdToast'));
          } catch (err) {
            toast.error(
              t('project.playbookPage.intake.failedToast', {
                reason: err instanceof Error ? err.message : '',
              }),
            );
          }
        },
      },
    );
  };

  const stageIcon = (stage: PlaybookStageStatus) => {
    if (stage.status === 'done') return CheckCircle2;
    if (stage.status === 'skipped') return SkipForward;
    if (stage.status === 'active') return CircleDot;
    return Circle;
  };

  const stageTone = (stage: PlaybookStageStatus) => {
    switch (stage.status) {
      case 'done':
        return 'text-accent-green';
      case 'active':
        return 'text-accent-blue';
      case 'skipped':
        return 'text-content-text-muted';
      default:
        return 'text-content-text-muted/60';
    }
  };

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectPlaybook}
      projectId={projectId}
      title={t('project.playbookPage.title')}
      hideBreadcrumb
      description={t('project.playbookPage.description')}
      actions={
        mounted ? (
          <Badge variant="outline" className="gap-1.5 text-11">
            <BookOpen className="size-3" />
            {status?.template?.name}
          </Badge>
        ) : null
      }
    >
      {isLoading ? (
        <SkeletonList count={5} />
      ) : isError || !status ? (
        <AsyncState error={t('project.playbookPage.loadFailed')} onRetry={() => void refetch()}>
          <span />
        </AsyncState>
      ) : !mounted ? (
        /* ── 未挂载：模板选择 ── */
        <div className="space-y-3">
          <p className="text-xs text-content-text-muted">{t('project.playbookPage.pickHint')}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(templates?.templates ?? []).map((tp) => (
              <div
                key={tp.key}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent-blue/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-content-text">{tp.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-content-text-secondary">
                      {tp.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-10">
                    {tp.audience === 'novice'
                      ? t('project.playbookPage.audienceNovice')
                      : t('project.playbookPage.audienceMaintenance')}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tp.stages.map((s) => (
                    <span
                      key={s.key}
                      className="rounded bg-content-bg-secondary px-1.5 py-0.5 text-10 text-content-text-secondary"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={mount.isPending}
                  onClick={() => mount.mutate(tp.key)}
                  data-ai={`playbook.mount.${tp.key}`}
                >
                  <Play className="size-3.5" />
                  {t('project.playbookPage.mount')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── 已挂载：阶段时间线 ── */
        <div className="space-y-2">
          {status.stages.map((stage, idx) => {
            const Icon = stageIcon(stage);
            const isLast = idx === status.stages.length - 1;
            return (
              <div
                key={stage.key}
                className={cn(
                  'relative flex gap-3 rounded-xl border bg-card p-3.5',
                  stage.status === 'active' ? 'border-accent-blue/50' : 'border-border',
                )}
                data-ai="playbook.stage"
                data-ai-stage={stage.key}
                data-ai-status={stage.status}
              >
                <div className="flex flex-col items-center">
                  <Icon className={cn('size-4 shrink-0', stageTone(stage))} />
                  {!isLast ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-content-text">{stage.name}</p>
                    {stage.status === 'done' ? (
                      <Badge className="gap-1 rounded-full bg-accent-green-light text-10 text-accent-green">
                        <Check className="size-3" />
                        {t('project.playbookPage.statusDone')}
                      </Badge>
                    ) : null}
                    {stage.status === 'active' ? (
                      <Badge className="gap-1 rounded-full bg-accent-blue-light text-10 text-accent-blue">
                        <Clock className="size-3" />
                        {t('project.playbookPage.statusActive')}
                      </Badge>
                    ) : null}
                    {stage.status === 'skipped' ? (
                      <Badge className="rounded-full bg-muted text-10 text-content-text-muted">
                        {t('project.playbookPage.statusSkipped')}
                      </Badge>
                    ) : null}
                    {stage.gateRejections > 0 ? (
                      <span className="text-10 text-accent-red">
                        {t('project.playbookPage.gateRejections', { n: stage.gateRejections })}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-content-text-secondary">
                    {stage.purpose}
                  </p>
                  {stage.skippedReason ? (
                    <p className="mt-1 text-11 text-content-text-muted">
                      {t('project.playbookPage.skippedReason', { reason: stage.skippedReason })}
                    </p>
                  ) : null}
                  {stage.documentTitle ? (
                    <p className="mt-1 flex items-center gap-1.5 text-11 text-content-text-secondary">
                      <FileText className="size-3 shrink-0 text-accent-blue" />
                      {stage.documentTitle}
                    </p>
                  ) : null}

                  {stage.status === 'active' ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {activeGatePending ? (
                        <>
                          <Badge className="gap-1 rounded-full bg-accent-purple-light text-10 text-accent-purple">
                            <ListChecks className="size-3" />
                            {t('project.playbookPage.gatePending')}
                          </Badge>
                          <Button asChild size="sm" variant="outline" data-ai="playbook.gotoGate">
                            <Link to="/app/decisions">
                              {t('project.playbookPage.goInbox')}
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setInterviewStage(stage.key)}
                            data-ai="playbook.startInterview"
                          >
                            <BookOpen className="size-3.5" />
                            {t('project.playbookPage.startInterview')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={skipStage.isPending}
                            onClick={() => {
                              setSkipReason('');
                              setSkipStageKey(stage.key);
                            }}
                            data-ai="playbook.skipStage"
                          >
                            <FastForward className="size-3.5" />
                            {t('project.playbookPage.skip')}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* CAP-P-01 二期：AI 生成组合件提案（任务族 + 验收清单一次批卡落库） */}
          {intakeReady ? (
            <div
              className="mt-3 rounded-xl border border-accent-purple/30 bg-accent-purple-light/30 p-3.5"
              data-ai-component="playbook.intake"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-accent-purple" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-content-text">
                    {t('project.playbookPage.intake.title')}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-content-text-secondary">
                    {t('project.playbookPage.intake.desc')}
                  </p>
                </div>
                {intakeProposalId ? (
                  <Button asChild size="sm" variant="outline" data-ai="playbook.intake.gotoInbox">
                    <Link to="/app/decisions">{t('project.playbookPage.intake.goInbox')}</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={intake.isPending}
                    onClick={handleIntake}
                    data-ai="playbook.intake.generate"
                  >
                    <Sparkles className={cn('size-3.5', intake.isPending && 'animate-pulse')} />
                    {intake.isPending
                      ? t('project.playbookPage.intake.generating')
                      : t('project.playbookPage.intake.generate')}
                  </Button>
                )}
              </div>
              {intake.isError ? (
                <p className="mt-2 text-11 text-accent-red">
                  {t('project.playbookPage.intake.failed', {
                    reason: intake.error instanceof Error ? intake.error.message : '',
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <InterviewDialog
        projectId={projectId}
        stage={interviewStageDef}
        open={!!interviewStage}
        onOpenChange={(open) => !open && setInterviewStage(null)}
      />

      <Dialog
        open={!!skipStageKey}
        onOpenChange={(open) => !open && setSkipStageKey(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('project.playbookPage.skipTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-content-text-secondary">
            {t('project.playbookPage.skipHint')}
          </p>
          <Input
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder={t('project.playbookPage.skipReasonPlaceholder')}
            data-ai="playbook.skipReason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipStageKey(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={skipStage.isPending || !skipStageKey}
              onClick={() =>
                skipStageKey &&
                skipStage.mutate(
                  { stageKey: skipStageKey, reason: skipReason.trim() || undefined },
                  { onSuccess: () => setSkipStageKey(null) },
                )
              }
              data-ai="playbook.skipConfirm"
            >
              {t('project.playbookPage.skipConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectDetailFrame>
  );
}

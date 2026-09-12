/**
 * 发版详情页（CAP-K-03 驱动型发版主链路）。
 * 状态机：draft（圈范围/AI 起草）→ gate → gated（审批卡/打回）→ approved
 * → publishing（轮询执行日志）→ released / failed（可重开）。
 * 门禁快照与发布执行日志来自服务端只读证据聚合，本页不做第二套判定。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  CircleDashed,
  Clock,
  Rocket,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { assistantApi } from '@/modules/assistant/api/assistant-api';
import {
  useApprovalRequest,
  useGateRelease,
  usePublishRelease,
  useRejectRelease,
  useRelease,
  useReopenRelease,
  useUpdateRelease,
} from '../hooks/use-releases';
import { RELEASE_STATUS_TONE, statusLabelKey } from './release-list-page';
import type { ExecutionStep, GateCheck, ReleaseStatus } from '../api/release-api';
import { cn } from '@/lib/utils';

const STATUS_FLOW: ReleaseStatus[] = [
  'draft',
  'gated',
  'approved',
  'publishing',
  'released',
];

export function ReleaseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const releaseQuery = useRelease(id);
  const release = releaseQuery.data;
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const gate = useGateRelease(release?.id ?? '');
  const approval = useApprovalRequest(release?.id ?? '');
  const publish = usePublishRelease(release?.id ?? '');
  const reject = useRejectRelease(release?.id ?? '');
  const reopen = useReopenRelease(release?.id ?? '');
  const updateNotes = useUpdateRelease(release?.id ?? '');

  const draftNotes = async () => {
    if (!release) return;
    try {
      const result = await assistantApi.silent('release-notes', {
        projectId: release.projectId,
        context: { releaseId: release.id },
      });
      const notes = String(result.data?.notes ?? '');
      if (!notes) {
        toast.error(t('release.detail.aiEmpty'));
        return;
      }
      setNotesDraft(notes);
    } catch (err) {
      toast.error((err as Error).message || t('release.detail.aiFailed'));
    }
  };

  const scopeIds = release?.scope?.issueIds ?? [];
  void scopeIds;

  return (
    <PageShell className="overflow-hidden" aiPage="releases.detail">
      <SubPageToolbar
        aiId="releases.detail"
        onBack={() => navigate(release ? `/app/releases?projectId=${release.projectId}` : '/app/releases')}
        breadcrumbs={[
          { label: t('nav.releases', '发版交付'), to: '/app/releases' },
          { label: release ? `v${release.version}` : t('release.detail.loading') },
        ]}
        actions={
          release ? (
            <Badge
              variant="secondary"
              className={cn('shrink-0 text-10', RELEASE_STATUS_TONE[release.status])}
            >
              {t(statusLabelKey(release.status))}
            </Badge>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-5 sm:px-8">
          {releaseQuery.isLoading || !release ? (
            <SkeletonCard className="h-64" />
          ) : (
            <>
              {/* 状态机进度链 */}
              <Card>
                <CardContent className="flex flex-wrap items-center gap-1.5 p-4">
                  {STATUS_FLOW.map((s, i) => {
                    const reached =
                      STATUS_FLOW.indexOf(release.status) >= i ||
                      (release.status === 'failed' && i === 0);
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        {i > 0 ? (
                          <span className="h-px w-4 bg-border" aria-hidden />
                        ) : null}
                        <span
                          className={cn(
                            'flex items-center gap-1 rounded-full px-2 py-0.5 text-10',
                            reached
                              ? 'bg-accent-blue/10 text-accent-blue'
                              : 'text-content-text-muted',
                          )}
                        >
                          {reached ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <CircleDashed className="size-3" />
                          )}
                          {t(statusLabelKey(s))}
                        </span>
                      </div>
                    );
                  })}
                  {release.status === 'failed' ? (
                    <Badge variant="secondary" className={cn('ml-1 text-10', RELEASE_STATUS_TONE.failed)}>
                      {t(statusLabelKey('failed'))}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>

              {release.failureReason ? (
                <Alert variant="destructive">
                  <XCircle className="size-4" />
                  <AlertTitle>{t('release.detail.failureTitle')}</AlertTitle>
                  <AlertDescription className="text-xs">
                    {release.failureReason}
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* 基本信息 + 发版说明（AI 起草） */}
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Rocket className="size-4 text-accent-green" />
                    {t('release.detail.notesTitle')}
                  </CardTitle>
                  {release.status === 'draft' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={updateNotes.isPending}
                      onClick={draftNotes}
                    >
                      <Sparkles className="mr-1 size-3 text-accent-purple" />
                      {t('release.detail.aiDraft')}
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {release.status === 'draft' && notesDraft !== null ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={8}
                        className="text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setNotesDraft(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={updateNotes.isPending}
                          onClick={() =>
                            updateNotes.mutate(
                              { notes: notesDraft },
                              {
                                onSuccess: () => {
                                  setNotesDraft(null);
                                  toast.success(t('release.detail.notesSaved'));
                                },
                                onError: (err) => toast.error((err as Error).message),
                              },
                            )
                          }
                        >
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  ) : release.notes ? (
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-content-text">
                      {release.notes}
                    </pre>
                  ) : (
                    <p className="text-xs text-content-text-muted">
                      {t('release.detail.noNotes')}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 border-t border-border pt-3 text-11 text-content-text-muted">
                    <span>{t('release.detail.tag')}: <span className="font-mono">{release.gitTag || `v${release.version}（${t('release.detail.tagPending')}）`}</span></span>
                    <span>
                      {t('release.detail.github')}:{' '}
                      {release.githubReleased ? t('release.detail.yes') : t('release.detail.no')}
                    </span>
                    {release.releasedAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(release.releasedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* 门禁 */}
              <GateCard
                releaseId={release.id}
                status={release.status}
                checks={release.gateResult?.checks ?? []}
                ranAt={release.gateResult?.ranAt}
                gatePending={gate.isPending}
                onGate={() =>
                  gate.mutate(undefined, {
                    onError: (err) => toast.error((err as Error).message),
                  })
                }
              />

              {/* 审批与发布动作 */}
              <ActionCard
                releaseId={release.id}
                status={release.status}
                approvalPending={approval.isPending}
                publishPending={publish.isPending}
                rejectPending={reject.isPending}
                reopenPending={reopen.isPending}
                onApproval={() =>
                  approval.mutate(undefined, {
                    onSuccess: () => toast.success(t('release.detail.approvalSent')),
                    onError: (err) => toast.error((err as Error).message),
                  })
                }
                onPublish={() =>
                  publish.mutate(undefined, {
                    onSuccess: () => toast.success(t('release.detail.publishDone')),
                    onError: (err) => toast.error((err as Error).message),
                  })
                }
                onReject={() =>
                  reject.mutate(undefined, {
                    onSuccess: () => toast.success(t('release.detail.rejected')),
                    onError: (err) => toast.error((err as Error).message),
                  })
                }
                onReopen={() =>
                  reopen.mutate(undefined, {
                    onSuccess: () => toast.success(t('release.detail.reopened')),
                    onError: (err) => toast.error((err as Error).message),
                  })
                }
              />

              {/* 发布执行日志 */}
              {release.executionLog && release.executionLog.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('release.detail.logTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {release.executionLog.map((step, i) => (
                      <ExecutionStepRow key={`${step.step}-${i}`} step={step} />
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function GateCard({
  releaseId,
  status,
  checks,
  ranAt,
  gatePending,
  onGate,
}: {
  releaseId: string;
  status: ReleaseStatus;
  checks: GateCheck[];
  ranAt?: string;
  gatePending: boolean;
  onGate: () => void;
}) {
  const { t } = useTranslation();
  void releaseId;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{t('release.gate.title')}</CardTitle>
        {status === 'draft' ? (
          <HeaderActionButton
            icon={Check}
            label={t('release.gate.submit')}
            disabled={gatePending}
            onClick={onGate}
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {ranAt ? (
          <p className="text-11 text-content-text-muted">
            {t('release.gate.ranAt')} {new Date(ranAt).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-content-text-muted">{t('release.gate.notRun')}</p>
        )}
        {checks.length > 0 ? (
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-xs">
                {c.passed ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent-green" />
                ) : (
                  <XCircle className="mt-0.5 size-3.5 shrink-0 text-accent-red" />
                )}
                <span>
                  <span className="font-medium">{c.label}</span>
                  <span className="ml-2 text-content-text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionCard({
  releaseId,
  status,
  approvalPending,
  publishPending,
  rejectPending,
  reopenPending,
  onApproval,
  onPublish,
  onReject,
  onReopen,
}: {
  releaseId: string;
  status: ReleaseStatus;
  approvalPending: boolean;
  publishPending: boolean;
  rejectPending: boolean;
  reopenPending: boolean;
  onApproval: () => void;
  onPublish: () => void;
  onReject: () => void;
  onReopen: () => void;
}) {
  const { t } = useTranslation();
  void releaseId;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('release.action.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {status === 'draft' ? (
          <p className="text-xs text-content-text-muted">{t('release.action.draftHint')}</p>
        ) : null}
        {status === 'gated' ? (
          <>
            <Button size="sm" className="h-7 text-xs" disabled={approvalPending} onClick={onApproval}>
              {t('release.action.requestApproval')}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={rejectPending} onClick={onReject}>
              {t('release.action.reject')}
            </Button>
          </>
        ) : null}
        {status === 'approved' ? (
          <>
            <Button size="sm" className="h-7 text-xs" disabled={publishPending} onClick={onPublish}>
              {t('release.action.publish')}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={rejectPending} onClick={onReject}>
              {t('release.action.reject')}
            </Button>
          </>
        ) : null}
        {status === 'failed' ? (
          <Button size="sm" className="h-7 text-xs" disabled={reopenPending} onClick={onReopen}>
            {t('release.action.reopen')}
          </Button>
        ) : null}
        {status === 'publishing' ? (
          <p className="text-xs text-content-text-muted">{t('release.action.publishingHint')}</p>
        ) : null}
        {status === 'released' ? (
          <p className="flex items-center gap-1 text-xs text-accent-green">
            <CheckCircle2 className="size-3.5" />
            {t('release.action.releasedHint')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExecutionStepRow({ step }: { step: ExecutionStep }) {
  const tone =
    step.status === 'ok'
      ? 'text-accent-green'
      : step.status === 'failed'
        ? 'text-accent-red'
        : 'text-content-text-muted';
  return (
    <div className="flex items-start gap-2 text-xs">
      {step.status === 'ok' ? (
        <CheckCircle2 className={cn('mt-0.5 size-3.5 shrink-0', tone)} />
      ) : step.status === 'failed' ? (
        <XCircle className={cn('mt-0.5 size-3.5 shrink-0', tone)} />
      ) : (
        <CircleDashed className={cn('mt-0.5 size-3.5 shrink-0', tone)} />
      )}
      <span>
        <span className="font-mono font-medium">{step.step}</span>
        <span className="ml-2 text-content-text-muted">{step.detail}</span>
      </span>
    </div>
  );
}

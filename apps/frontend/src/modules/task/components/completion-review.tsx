/**
 * CompletionReview - 任务详情页验收契约卡
 *
 * 按契约类型展示对应 evidence + 闭环操作：
 * - 状态徽章 / criteria 进度 / 审计风险点 / 链接到验收详情页
 * - 接收（聚合校验，服务端使用已回写证据）/ 驳回（原因弹窗）/ 无活契约时可新建
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  GitPullRequest,
  FileCode,
  FileText,
  Package,
  AlertCircle,
  Clock,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { acceptanceApi, isActiveAcceptance, extractFailures, type Acceptance, type CompletionType, type AcceptanceFailure } from '@/modules/acceptance/api/acceptance-api';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { AcceptanceFormDialog } from '@/modules/acceptance/components/acceptance-form-dialog';

interface CompletionReviewProps {
  taskId: string;
  acceptances: Acceptance[];
}

const TYPE_ICON: Record<CompletionType, typeof GitPullRequest> = {
  pr: GitPullRequest,
  test_report: FileCode,
  document: FileText,
  artifact: Package,
};

const STATUS_TONE: Record<string, string> = {
  draft: 'text-muted-foreground border-border',
  pending: 'text-muted-foreground border-border',
  in_review: 'text-accent-blue border-accent-blue/40',
  passed: 'text-accent-green border-accent-green/40',
  failed: 'text-accent-red border-accent-red/40',
  waived: 'text-muted-foreground border-border',
};

function EvidencePreview({ acceptance }: { acceptance: Acceptance }) {
  const { t } = useTranslation();
  const ev = acceptance.completionEvidence as Record<string, unknown> | null;
  if (!ev) {
    return <div className="text-xs text-muted-foreground">{t('acceptance.evidenceEmpty')}</div>;
  }
  const type = acceptance.completionType;

  if (type === 'test_report') {
    const report = (ev.report as Record<string, unknown>) || {};
    const total = Number(report.total ?? 0);
    const passed = Number(report.passed ?? 0);
    const failed = Number(report.failed ?? 0);
    const skipped = Number(report.skipped ?? 0);
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex gap-2">
          <span className="text-accent-green">{t('acceptance.evPassed', { count: passed })}</span>
          <span className="text-accent-red">{t('acceptance.evFailed', { count: failed })}</span>
          <span className="text-muted-foreground">{t('acceptance.evSkipped', { count: skipped })}</span>
          <span className="font-medium">{t('acceptance.evTotal', { count: total })}</span>
        </div>
        <div className="h-1.5 rounded bg-muted overflow-hidden">
          <div
            className={failed > 0 ? 'h-full bg-accent-red' : 'h-full bg-accent-green'}
            style={{ width: `${passRate}%` }}
          />
        </div>
        <div className="text-10 text-muted-foreground">
          {t('acceptance.passRate', { rate: passRate.toFixed(1), source: String(report.source ?? '?') })}
          {report.coverage ? (
            <>
              {' '}
              ·{' '}
              {t('acceptance.coverage', {
                count: Math.round(Number((report.coverage as Record<string, number>).lines ?? 0) * 100),
              })}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (type === 'pr') {
    return (
      <div className="space-y-1 text-xs">
        {ev.prUrl ? (
          <a
            href={String(ev.prUrl)}
            target="_blank"
            rel="noreferrer"
            className="text-accent-blue hover:underline truncate block"
          >
            {String(ev.prUrl)}
          </a>
        ) : null}
        <div className="text-10 text-muted-foreground">
          {t('acceptance.prState')} <Badge variant="outline" className="text-10 py-0">{String(ev.state ?? '?')}</Badge>
        </div>
      </div>
    );
  }

  if (type === 'document') {
    const files = (ev.filePaths as string[] | undefined) ?? [];
    return (
      <ul className="space-y-0.5 text-xs">
        {files.map((p, i) => (
          <li key={i} className="truncate text-accent-blue">{p}</li>
        ))}
        {files.length === 0 && (
          <li className="text-muted-foreground">{t('acceptance.noFiles')}</li>
        )}
      </ul>
    );
  }

  // artifact
  const artifacts = (ev.artifacts as Array<Record<string, unknown>> | undefined) ?? [];
  return (
    <ul className="space-y-0.5 text-xs">
      {artifacts.map((a, i) => (
        <li key={i} className="truncate">
          <span className="text-muted-foreground">[{String(a.type ?? '?')}]</span>{' '}
          <span>{String(a.name ?? a.id ?? '?')}</span>
        </li>
      ))}
      {artifacts.length === 0 && (
        <li className="text-muted-foreground">{t('acceptance.noArtifacts')}</li>
      )}
    </ul>
  );
}

function AcceptanceCard({
  acceptance,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: {
  acceptance: Acceptance;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON[acceptance.completionType];
  const statusColor = STATUS_TONE[acceptance.status] ?? 'text-muted-foreground';
  const canReview =
    acceptance.status === 'in_review' || acceptance.status === 'pending';

  // criteria 进度与审计风险点（findByTask 已 include）
  const criteria = acceptance.criteria ?? [];
  const passedCount = criteria.filter((c) => c.status === 'passed').length;
  const blockingCriteria = criteria.filter(
    (c) =>
      (c.severity === 'critical' || c.severity === 'high') &&
      (c.status === 'pending' || c.status === 'failed'),
  ).length;
  const riskLevel = acceptance.auditReport?.riskLevel;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-accent-purple shrink-0" />
        <div className="flex-1 min-w-0">
          <Link
            to={`/app/acceptance/${acceptance.id}`}
            className="text-sm font-medium truncate hover:underline flex items-center gap-1"
          >
            <span className="truncate">
              {acceptance.title || t('acceptance.titleFallback', { id: acceptance.id.slice(0, 8) })}
            </span>
            <ExternalLink size={11} className="shrink-0 text-muted-foreground" />
          </Link>
          <div className="text-10 text-muted-foreground flex items-center gap-1.5">
            <span>{t(`acceptance.completionType.${acceptance.completionType}`)}</span>
            <span>·</span>
            <span className={statusColor}>
              {t(`acceptance.status.${acceptance.status}`)}
            </span>
            {isActiveAcceptance(acceptance) && (
              <Badge variant="secondary" className="text-10 px-1 py-0">
                {t('acceptance.activeBadge')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* criteria 进度 + 审计风险点 */}
      {criteria.length > 0 && (
        <div className="flex items-center gap-2 text-10 text-muted-foreground">
          <div className="h-1 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-accent-green"
              style={{ width: `${Math.round((passedCount / criteria.length) * 100)}%` }}
            />
          </div>
          <span>{t('acceptanceDetail.criteria.progress', { passed: passedCount, total: criteria.length })}</span>
          {blockingCriteria > 0 && (
            <span className="text-accent-red">⚑{blockingCriteria}</span>
          )}
          {riskLevel === 'red' && <span className="text-accent-red">●</span>}
          {riskLevel === 'yellow' && <span className="text-accent-yellow">●</span>}
        </div>
      )}

      <EvidencePreview acceptance={acceptance} />

      {acceptance.rejectionReason && (
        <div className="text-11 text-accent-red flex gap-1 items-start">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>{t('acceptance.rejectionReason', { reason: acceptance.rejectionReason })}</span>
        </div>
      )}
      {acceptance.waiverReason && (
        <div className="text-11 text-muted-foreground flex gap-1 items-start">
          <span>{t('acceptance.waiverReason', { reason: acceptance.waiverReason })}</span>
        </div>
      )}

      {canReview && (
        <div className="flex gap-1.5 pt-1">
          <Button
            size="sm"
            variant="default"
            className="bg-accent-green hover:bg-accent-green/90 text-white"
            onClick={onAccept}
            disabled={isAccepting || isRejecting}
          >
            {isAccepting ? <Spinner className="size-3 mr-1 text-inherit" /> : <CheckCircle2 size={12} className="mr-1" />}
            {t('acceptance.accept')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-accent-red border-accent-red/50"
            onClick={onReject}
            disabled={isAccepting || isRejecting}
          >
            <XCircle size={12} className="mr-1" />
            {t('acceptance.reject')}
          </Button>
        </div>
      )}

      {acceptance.status === 'passed' && (
        <div className="flex items-center gap-1 text-11 text-accent-green">
          <CheckCircle2 size={12} />
          {t('acceptance.acceptedAt', {
            time: acceptance.completedAt ? new Date(acceptance.completedAt).toLocaleString() : '',
          })}
        </div>
      )}
      {acceptance.status === 'failed' && (
        <div className="flex items-center gap-1 text-11 text-accent-red">
          <XCircle size={12} />
          {t('acceptance.rejectedAt', {
            time: acceptance.rejectedAt ? new Date(acceptance.rejectedAt).toLocaleString() : '',
          })}
        </div>
      )}
    </div>
  );
}

export function CompletionReview({ taskId, acceptances }: CompletionReviewProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [acceptFailures, setAcceptFailures] = useState<AcceptanceFailure[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['acceptance', 'task', taskId] });
    qc.invalidateQueries({ queryKey: ['task', taskId] });
  };

  // 接收：不传 evidence，服务端使用 dispatch 回写快照做聚合校验
  const acceptMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      acceptanceApi.acceptCompletion(id, undefined, currentUser?.id),
    onSuccess: () => {
      refresh();
      toast.success(t('acceptanceDetail.actions.acceptedToast'));
    },
    onError: (e) => {
      const failures = extractFailures(e);
      if (failures) setAcceptFailures(failures);
      else
        toast.error(
          t('acceptance.acceptFailed', {
            message: e instanceof Error ? e.message : t('common.unknown'),
          }),
        );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      acceptanceApi.rejectCompletion(id, reason, currentUser?.id),
    onSuccess: () => {
      refresh();
      toast.success(t('acceptanceDetail.actions.rejectedToast'));
      setRejectingId(null);
      setReason('');
    },
    onError: (e) =>
      toast.error(
        t('acceptance.rejectFailed', {
          message: e instanceof Error ? e.message : t('common.unknown'),
        }),
      ),
  });

  const hasActive = acceptances.some(isActiveAcceptance);

  if (acceptances.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground text-xs">
          <span className="flex items-center gap-2">
            <Clock size={12} />
            {t('acceptance.empty')}
          </span>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCreate(true)}>
            <Plus size={12} className="mr-1" />
            {t('acceptance.new')}
          </Button>
        </div>
        <AcceptanceFormDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          defaultTaskId={taskId}
          onSuccess={refresh}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {acceptances.map((a) => (
          <AcceptanceCard
            key={a.id}
            acceptance={a}
            onAccept={() => acceptMutation.mutate({ id: a.id })}
            onReject={() => setRejectingId(a.id)}
            isAccepting={acceptMutation.isPending && acceptMutation.variables?.id === a.id}
            isRejecting={rejectMutation.isPending && rejectMutation.variables?.id === a.id}
          />
        ))}
        {/* 全部终态后可开启新一轮验收 */}
        {!hasActive && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={12} className="mr-1" />
            {t('acceptance.new')}
          </Button>
        )}
      </div>

      {/* 接收聚合校验失败清单 */}
      <Dialog open={!!acceptFailures} onOpenChange={(o) => !o && setAcceptFailures(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('acceptanceDetail.actions.blockedTitle')}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-1.5 py-1">
            {acceptFailures?.map((f, i) => (
              <li key={i} className="text-sm">
                <span className="mr-1.5 font-mono text-10 text-muted-foreground">
                  [{f.check}]
                </span>
                {f.reason}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptFailures(null)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectingId}
        onOpenChange={(o) => {
          if (!o) {
            setRejectingId(null);
            setReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('acceptanceDetail.actions.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('acceptanceDetail.actions.rejectDesc')}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('acceptanceDetail.actions.rejectPlaceholder')}
            className="w-full min-h-25 rounded-md border border-border bg-background p-2 text-sm outline-hidden focus:ring-1 focus:ring-accent-purple"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingId(null); setReason(''); }}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-accent-red hover:bg-accent-red/90 text-white"
              disabled={!reason.trim() || rejectMutation.isPending}
              onClick={() =>
                rejectingId && rejectMutation.mutate({ id: rejectingId, reason: reason.trim() })
              }
            >
              {rejectMutation.isPending ? <Spinner className="size-3.5 mr-1 text-inherit" /> : null}
              {t('acceptanceDetail.actions.rejectConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新一轮验收契约 */}
      <AcceptanceFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultTaskId={taskId}
        onSuccess={refresh}
      />
    </>
  );
}

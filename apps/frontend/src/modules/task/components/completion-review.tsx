/**
 * CompletionReview - 任务详情页接收/驳回面板
 *
 * 按契约类型展示对应 evidence:
 * - pr: PR 链接 + 状态
 * - test_report: 通过率 + 覆盖 + 用例详情
 * - document: 文件路径列表
 * - artifact: 产物链接
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, GitPullRequest, FileCode, FileText, Package,
  AlertCircle, Clock, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { acceptanceApi, type Acceptance, type CompletionType } from '@/modules/acceptance/api/acceptance-api';

interface CompletionReviewProps {
  taskId: string;
  acceptances: Acceptance[];
}

const TYPE_LABEL: Record<CompletionType, string> = {
  pr: 'PR 契约',
  test_report: '测试报告契约',
  document: '文档产物契约',
  artifact: '产物契约',
};

const TYPE_ICON: Record<CompletionType, typeof GitPullRequest> = {
  pr: GitPullRequest,
  test_report: FileCode,
  document: FileText,
  artifact: Package,
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待处理',
  in_review: '待接收',
  passed: '已接收',
  failed: '已驳回',
  waived: '豁免',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-muted-foreground',
  pending: 'text-muted-foreground',
  in_review: 'text-accent-blue',
  passed: 'text-accent-green',
  failed: 'text-accent-red',
  waived: 'text-muted-foreground',
};

function EvidencePreview({ acceptance }: { acceptance: Acceptance }) {
  const ev = acceptance.completionEvidence as Record<string, unknown> | null;
  if (!ev) {
    return <div className="text-xs text-muted-foreground">暂无证据</div>;
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
          <span className="text-accent-green">通过 {passed}</span>
          <span className="text-accent-red">失败 {failed}</span>
          <span className="text-muted-foreground">跳过 {skipped}</span>
          <span className="text-foreground font-medium">总计 {total}</span>
        </div>
        <div className="h-1.5 rounded bg-muted overflow-hidden">
          <div
            className={failed > 0 ? 'h-full bg-accent-red' : 'h-full bg-accent-green'}
            style={{ width: `${passRate}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground">
          通过率 {passRate.toFixed(1)}% · 来源 {String(report.source ?? '?')}
          {report.coverage ? (
            <>
              {' '}
              · 覆盖{' '}
              {Math.round(Number((report.coverage as Record<string, number>).lines ?? 0) * 100)}%
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
        <div className="text-[10px] text-muted-foreground">
          状态: <Badge variant="outline" className="text-[10px] py-0">{String(ev.state ?? '?')}</Badge>
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
          <li className="text-muted-foreground">无文件</li>
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
        <li className="text-muted-foreground">无产物</li>
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
  const Icon = TYPE_ICON[acceptance.completionType];
  const statusColor = STATUS_COLOR[acceptance.status] ?? 'text-muted-foreground';
  const canReview = acceptance.status === 'in_review' || acceptance.status === 'pending';

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-accent-purple shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {acceptance.title || `Acceptance ${acceptance.id.slice(0, 8)}`}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {TYPE_LABEL[acceptance.completionType]} · <span className={statusColor}>{STATUS_LABEL[acceptance.status] ?? acceptance.status}</span>
          </div>
        </div>
      </div>

      <EvidencePreview acceptance={acceptance} />

      {acceptance.rejectionReason && (
        <div className="text-[11px] text-accent-red flex gap-1 items-start">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>驳回原因：{acceptance.rejectionReason}</span>
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
            {isAccepting ? <Loader2 size={12} className="mr-1 animate-spin" /> : <CheckCircle2 size={12} className="mr-1" />}
            接收
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-accent-red border-accent-red/50"
            onClick={onReject}
            disabled={isAccepting || isRejecting}
          >
            <XCircle size={12} className="mr-1" />
            驳回
          </Button>
        </div>
      )}

      {acceptance.status === 'passed' && (
        <div className="flex items-center gap-1 text-[11px] text-accent-green">
          <CheckCircle2 size={12} />
          已接收 {acceptance.completedAt ? `于 ${new Date(acceptance.completedAt).toLocaleString('zh-CN')}` : ''}
        </div>
      )}
      {acceptance.status === 'failed' && (
        <div className="flex items-center gap-1 text-[11px] text-accent-red">
          <XCircle size={12} />
          已驳回 {acceptance.rejectedAt ? `于 ${new Date(acceptance.rejectedAt).toLocaleString('zh-CN')}` : ''}
        </div>
      )}
    </div>
  );
}

export function CompletionReview({ taskId, acceptances }: CompletionReviewProps) {
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const acceptMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => {
      const target = acceptances.find((a) => a.id === id);
      return acceptanceApi.acceptCompletion(id, (target?.completionEvidence as Record<string, unknown>) ?? {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acceptance', 'task', taskId] });
      toast.success('已接收');
    },
    onError: (e) => toast.error('接收失败: ' + (e instanceof Error ? e.message : '未知错误')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      acceptanceApi.rejectCompletion(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acceptance', 'task', taskId] });
      toast.success('已驳回');
      setRejectingId(null);
      setReason('');
    },
    onError: (e) => toast.error('驳回失败: ' + (e instanceof Error ? e.message : '未知错误')),
  });

  if (acceptances.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground text-xs">
        <Clock size={12} />
        该任务暂无验收契约
      </div>
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
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(o) => { if (!o) { setRejectingId(null); setReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回完成</DialogTitle>
            <DialogDescription>
              请说明驳回原因。AI 员工可在修复后重新派发。
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：测试覆盖率未达标 / 文档缺失图示 / PR 有错误变更…"
            className="w-full min-h-[100px] rounded-md border border-border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-accent-purple"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingId(null); setReason(''); }}>取消</Button>
            <Button
              className="bg-accent-red hover:bg-accent-red/90 text-white"
              disabled={!reason.trim() || rejectMutation.isPending}
              onClick={() => rejectingId && rejectMutation.mutate({ id: rejectingId, reason: reason.trim() })}
            >
              {rejectMutation.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

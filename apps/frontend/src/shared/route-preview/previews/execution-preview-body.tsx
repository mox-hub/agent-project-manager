import { Clock, Bot } from 'lucide-react';
import { useExecutionRunDetail } from '@/modules/executions/api/execution-api';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
  formatPreviewDateTime,
  getStatusTone,
} from './preview-fields';

export function ExecutionPreviewBody({ id }: { id: string }) {
  const { data: run, isLoading, isError } = useExecutionRunDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={4} />;
  if (isError || !run) return <PreviewBodyError />;

  const isPendingApproval = run.status === 'pending_approval';
  const tokensLabel =
    run.totalTokens != null && run.totalTokens > 0
      ? run.totalTokens >= 1000
        ? `${(run.totalTokens / 1000).toFixed(1)}k Tokens`
        : `${run.totalTokens} Tokens`
      : null;
  const costLabel =
    run.totalCost != null && run.totalCost > 0
      ? `$${run.totalCost.toFixed(4)}`
      : null;

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：审批状态 + 双轨度量 */}
      <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-accent-purple flex items-center gap-1">
            <Clock className="size-3" />
            {isPendingApproval
              ? '等待人审决议 (Pending Approval)'
              : run.status === 'completed'
                ? '执行通过 (Completed)'
                : `执行状态: ${run.status}`}
          </span>
          {isPendingApproval ? (
            <span className="text-10 font-mono px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red font-semibold">
              高风险拦截
            </span>
          ) : (
            <StatusPill tone={getStatusTone(run.status)}>{run.status}</StatusPill>
          )}
        </div>
        <div className="flex items-center justify-between text-10 font-mono text-accent-purple">
          <span className="flex items-center gap-1 font-semibold">
            <Bot className="size-3" />
            {run.providerId ?? 'AI Execution'}
          </span>
          <span className="flex items-center gap-1">
            {tokensLabel && <span>{tokensLabel}</span>}
            {costLabel && <span>({costLabel})</span>}
          </span>
        </div>
      </div>

      {run.goal && (
        <p className="line-clamp-2 text-11 text-muted-foreground font-mono">{run.goal}</p>
      )}

      <PreviewSection title="执行属性">
        <PreviewRow label="主体">
          <div className="flex items-center gap-1.5">
            <MemberAvatar
              size="xs"
              member={{
                type: run.subjectType === 'human' ? 'human' : 'ai_agent',
                displayName: run.subjectName ?? run.subjectId,
              }}
              fallbackInitials={run.subjectName ?? run.subjectId}
              showBadge={false}
            />
            <span className="truncate">{run.subjectName ?? run.subjectId}</span>
          </div>
        </PreviewRow>
        {run.issue && (
          <PreviewRow label="关联工单">{run.issue.title}</PreviewRow>
        )}
        {run.project && (
          <PreviewRow label="所属项目">{run.project.name}</PreviewRow>
        )}
      </PreviewSection>

      <PreviewFooterMeta>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatPreviewDateTime(run.startedAt ?? run.createdAt)}
        </span>
        <span className="ml-auto font-mono text-10">{run.id.slice(0, 8)}</span>
      </PreviewFooterMeta>
    </div>
  );
}

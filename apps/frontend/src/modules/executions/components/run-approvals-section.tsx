import { ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ExecutionRunDetail } from '../api/execution-api';

type ApprovalEntry = NonNullable<ExecutionRunDetail['approvals']>[number];

const RISK_TONE: Record<string, string> = {
  read: 'text-accent-blue bg-accent-blue-light/40',
  write: 'text-accent-yellow bg-accent-yellow-light/40',
  high_risk: 'text-accent-red bg-accent-red-light/40',
};

const STATUS_I18N: Record<string, string> = {
  pending: 'runApprovals.statusPending',
  approved: 'runApprovals.statusApproved',
  rejected: 'runApprovals.statusRejected',
  auto_approved: 'runApprovals.statusAutoApproved',
  expired: 'runApprovals.statusExpired',
  cancelled: 'runApprovals.statusCancelled',
};

/**
 * 执行详情审批段（CAP-A-27 P0-A 展示面）：人工执行验收流产生的审批单，
 * 附 AI 风险定级 advisory（metadata.aiJudge）——只展示不改变判定权，
 * 无审批单时整段不渲染。
 */
export function RunApprovalsSection({ approvals }: { approvals?: ApprovalEntry[] }) {
  const { t } = useTranslation();
  if (!approvals?.length) return null;

  return (
    <div className="shrink-0 border-b px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-muted-foreground">
        <ShieldAlert className="size-3.5" />
        {t('runApprovals.title')}
      </div>
      <ul className="space-y-1.5">
        {approvals.map((a) => {
          const ai = (a.metadata?.aiJudge ?? null) as
            | {
                riskLevel?: string | null;
                confidence?: number | null;
                safeToAutoApprove?: number | null;
                advisory?: boolean;
              }
            | null;
          return (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-sm border border-border/60 px-2 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{a.requestedAction}</span>
              <span
                className={cn(
                  'shrink-0 rounded-sm px-1.5 py-0.5 text-2xs font-medium',
                  RISK_TONE[a.riskLevel] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {t(`runApprovals.risk.${a.riskLevel}`, a.riskLevel)}
              </span>
              <span className="shrink-0 text-2xs text-muted-foreground">
                {t(STATUS_I18N[a.status] ?? 'runApprovals.statusPending')}
              </span>
              {ai?.advisory && ai.riskLevel ? (
                <span
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-medium',
                    (ai.confidence ?? 1) >= 0.7
                      ? 'bg-accent-purple-light/40 text-accent-purple'
                      : 'bg-accent-yellow-light/40 text-accent-yellow',
                  )}
                  title={t('runApprovals.aiJudgeTitle')}
                >
                  <Sparkles className="size-3" />
                  {`AI ${t(`runApprovals.risk.${ai.riskLevel}`, ai.riskLevel)}`}
                  {typeof ai.confidence === 'number'
                    ? ` ${Math.round(ai.confidence * 100)}%`
                    : ''}
                  {(ai.confidence ?? 1) < 0.7
                    ? ` · ${t('runApprovals.lowConfidence')}`
                    : ''}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

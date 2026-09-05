/**
 * 员工卡 —— 办公室首屏（候选 C）：
 * 「先看得见他」：在干什么（当前执行）、忙不忙（状态点）、压着多少待决、还能接多少活（容量条）。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, PlayCircle, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
import { TrustLevelBadge } from '@/modules/team-member/components/trust-level-badge';
import { useAppStore } from '@/infrastructure/store/app-store';
import { formatRelativeTime } from '@/shared/runtime/runtime-api';
import { STATE_DOT, STATE_TEXT } from '@/modules/assistant/components/assistant-status-dot';
import type { OfficeColleague, OfficeStatus } from '../api/office-api';

const STATUS_TONE: Record<OfficeStatus, string> = {
  needYou: 'border-accent-red/30 bg-accent-red/5',
  working: 'border-accent-blue/30 bg-accent-blue/5',
  suggestions: 'border-accent-yellow/30 bg-accent-yellow/5',
  idle: 'border-border bg-card',
};

const ACCEPTABILITY_TONE: Record<OfficeColleague['capacity']['acceptability'], string> = {
  available: 'bg-accent-green/10 text-accent-green',
  busy: 'bg-accent-yellow/10 text-accent-yellow',
  saturated: 'bg-accent-red/10 text-accent-red',
};

/** 容量条颜色：负载语义色（与可接活度一致） */
function loadBarTone(loadPct: number, saturated: boolean): string {
  if (saturated || loadPct >= 100) return 'bg-accent-red';
  if (loadPct >= 60) return 'bg-accent-yellow';
  return 'bg-accent-green';
}

export function ColleagueCard({ colleague }: { colleague: OfficeColleague }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);

  const { capacity } = colleague;
  const saturated = capacity.acceptability === 'saturated';

  const openChat = () => {
    openAssistantWithDraft(t('office.card.chatDraft', { name: colleague.displayName }));
    if (!aiPanelOpen) setAiPanelOpen(true);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 transition-colors',
        STATUS_TONE[colleague.status],
      )}
      data-ai-component="office.colleague-card"
      data-ai-role="panel"
    >
      {/* 头部：头像 + 名字 + 状态 */}
      <div className="flex items-start gap-3">
        <MemberAvatar
          member={{
            type: 'ai_agent',
            displayName: colleague.displayName,
            handle: colleague.memberId,
            avatarUrl: colleague.avatarUrl ?? null,
            isOnline: colleague.status === 'working',
          }}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-content-text">
              {colleague.displayName}
            </p>
            <TrustLevelBadge level={colleague.trustLevel} score={colleague.trustScore} />
          </div>
          <p className="flex items-center gap-1.5 truncate text-11 text-content-text-muted">
            <span className={cn('inline-block size-1.5 rounded-full', STATE_DOT[colleague.status])} />
            <span className={STATE_TEXT[colleague.status]}>
              {t(`office.status.${colleague.status}`)}
            </span>
            {colleague.executionRole && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t(`office.executionRole.${colleague.executionRole}`)}</span>
              </>
            )}
          </p>
        </div>
        {/* 待决数：blocking 优先展示 */}
        {colleague.blocking > 0 && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-red px-1.5 text-10 font-semibold text-white tabular-nums"
            title={t('office.card.blockingTitle')}
          >
            {colleague.blocking}
          </span>
        )}
      </div>

      {/* 在干什么：当前执行 */}
      <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2">
        {colleague.currentRun ? (
          <p className="flex items-center gap-1.5 truncate text-xs text-content-text">
            <PlayCircle className="size-3.5 shrink-0 text-accent-blue" />
            <span className="truncate" title={colleague.currentRun.goal}>
              {colleague.currentRun.taskTitle ?? colleague.currentRun.goal}
            </span>
          </p>
        ) : (
          <p className="truncate text-xs text-content-text-muted">
            {t('office.card.noActiveRun')}
          </p>
        )}
        <p className="mt-0.5 truncate text-10 text-content-text-muted">
          {colleague.lastRunAt
            ? t('office.card.lastRun', {
                time: formatRelativeTime(colleague.lastRunAt, t),
              })
            : t('office.card.neverRun')}
          {colleague.currentProvider
            ? ` · ${t('office.card.viaProvider', { provider: colleague.currentProvider })}`
            : ''}
        </p>
      </div>

      {/* 还能接多少活：容量条 + 可接活度 */}
      <div>
        <div className="flex items-center justify-between text-11 text-content-text-muted">
          <span>
            {t('office.card.capacity', {
              active: capacity.activeRuns,
              limit: capacity.capacityLimit,
            })}
          </span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 font-medium',
              ACCEPTABILITY_TONE[capacity.acceptability],
            )}
          >
            {t(`office.acceptability.${capacity.acceptability}`)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', loadBarTone(capacity.loadPct, saturated))}
            style={{ width: `${Math.max(4, capacity.loadPct)}%` }}
          />
        </div>
        <p className="mt-1 text-10 text-content-text-muted">
          {t('office.card.weeklyUsage', {
            tokens: capacity.weeklyTokens.toLocaleString(),
            cost: capacity.weeklyCostUsd.toFixed(2),
          })}
          {capacity.budgetUsagePct != null
            ? ` · ${t('office.card.budgetUsage', { pct: capacity.budgetUsagePct })}`
            : ''}
        </p>
      </div>

      {/* 待决摘要 + 动作 */}
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-11 text-content-text-muted">
          {t('office.card.decisions', { blocking: colleague.blocking, advisory: colleague.advisory })}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => navigate(`/app/members/${colleague.memberId}`)}
            data-ai-action="office.colleague.detail.click"
          >
            <UserRound className="size-3.5" />
            {t('office.card.detail')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={openChat}
            data-ai-action="office.colleague.chat.click"
          >
            <MessageCircle className="size-3.5" />
            {t('office.card.chat')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 协作分区（办公室页 · 交接试点）：
 * 前后端 AI 的接口协作卡列表——状态机透明可见，人在闸口（验证/打回/取消）。
 * 「对话建立理解，工件建立信任」：卡片展示结构化负载与流转日志，不是聊天记录。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useCollaborationActions,
  useCollaborationList,
  type CollaborationCard,
  type CollaborationStatus,
} from '../api/collaboration-api';

const STATUS_TONE: Record<CollaborationStatus, string> = {
  requested: 'bg-accent-yellow/10 text-accent-yellow',
  committed: 'bg-accent-blue/10 text-accent-blue',
  in_progress: 'bg-accent-blue/10 text-accent-blue',
  delivered: 'bg-accent-purple/10 text-accent-purple',
  verified: 'bg-accent-green/10 text-accent-green',
  rejected: 'bg-accent-red/10 text-accent-red',
  cancelled: 'bg-muted text-muted-foreground',
  escalated: 'bg-accent-red/10 text-accent-red',
};

function CardRow({ card }: { card: CollaborationCard }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { verify, cancel } = useCollaborationActions();

  return (
    <div
      className="rounded-lg border border-border px-3 py-2.5"
      data-ai-component="office.collaboration-card"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-content-text-muted hover:text-content-text"
          aria-label={expanded ? t('common.collapse') : t('common.expand')}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-content-text" title={card.title}>
            {card.title}
          </p>
          <p className="truncate text-11 text-content-text-muted">
            {card.requesterName ?? card.requesterMemberId}
            {' → '}
            {card.providerName ?? card.providerMemberId}
            {` · ${t('office.collaboration.rounds', { n: card.rounds })}`}
          </p>
        </div>
        <Badge className={cn('shrink-0', STATUS_TONE[card.status])} variant="secondary">
          {t(`office.collaboration.status.${card.status}`)}
        </Badge>
      </div>

      {/* 人闸口动作 */}
      <div className="mt-2 flex items-center justify-end gap-1.5">
        {card.status === 'delivered' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-11"
              disabled={verify.isPending}
              onClick={() =>
                verify.mutate({ id: card.id, verdict: 'changes_requested' })
              }
              data-ai-action="office.collaboration.reject.click"
            >
              {t('office.collaboration.reject')}
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-11"
              disabled={verify.isPending}
              onClick={() => verify.mutate({ id: card.id, verdict: 'verified' })}
              data-ai-action="office.collaboration.verify.click"
            >
              {t('office.collaboration.verify')}
            </Button>
          </>
        )}
        {!['verified', 'rejected', 'cancelled', 'delivered'].includes(card.status) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-11 text-muted-foreground"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(card.id)}
            data-ai-action="office.collaboration.cancel.click"
          >
            {t('office.collaboration.cancel')}
          </Button>
        )}
        {card.status === 'escalated' && (
          <Link
            to="/app/decisions"
            className="flex items-center gap-1 text-11 text-accent-red hover:underline"
            data-ai-action="office.collaboration.to-decisions.click"
          >
            <ExternalLink className="size-3" />
            {t('office.collaboration.toDecisions')}
          </Link>
        )}
      </div>

      {/* 展开区：结构化负载 + 流转日志 */}
      {expanded && (
        <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2.5">
          <div>
            <p className="text-10 font-medium text-content-text-muted">
              {t('office.collaboration.payload')}
            </p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-10 leading-relaxed text-content-text">
              {JSON.stringify(card.payload, null, 2)}
            </pre>
          </div>
          {card.events && card.events.length > 0 && (
            <div>
              <p className="text-10 font-medium text-content-text-muted">
                {t('office.collaboration.timeline')}
              </p>
              <ol className="mt-1 space-y-0.5">
                {card.events.map((event, index) => (
                  <li key={index} className="text-10 text-content-text-muted">
                    <span className="font-medium text-content-text">
                      {t(`office.collaboration.status.${event.status}`)}
                    </span>
                    {event.note ? ` · ${event.note}` : ''}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CollaborationSection({ projectId }: { projectId?: string }) {
  const { t } = useTranslation();
  const collaboration = useCollaborationList(projectId);
  const items = collaboration.data?.items ?? [];

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Handshake className="size-4 text-accent-blue" />
        <h2 className="text-sm font-semibold text-content-text">
          {t('office.collaboration.title')}
        </h2>
        <span className="text-11 text-content-text-muted">
          {t('office.collaboration.subtitle', { n: items.length })}
        </span>
      </div>
      {collaboration.isLoading ? null : items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-content-text-muted">
          {t('office.collaboration.empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}

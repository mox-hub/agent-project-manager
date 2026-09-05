/**
 * 执行行卡片 —— 「转执行」后的运行条目：轮询 run 状态（5s，终态停轮），
 * 终态时失效 decisions 缓存让建议卡回流；运行详情面板直开 + 执行中心入口。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, CheckCircle2, ExternalLink, FileText, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RunDetailsDialog } from '@/modules/executions';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';
import { decisionKeys } from '@/modules/decision/hooks/use-decisions';
import type { AssistantRunEntry } from '../hooks/use-assistant-dispatch';

const TERMINAL_STATUSES = ['completed', 'failed', 'blocked', 'superseded', 'cancelled'];

type RunStatus = string | undefined;

export function AssistantRunLine({ entry }: { entry: AssistantRunEntry }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['assistant', 'run-status', entry.runId],
    queryFn: () => aiHubApi.getExecutionStatus(entry.runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status as RunStatus;
      return status && TERMINAL_STATUSES.includes(status) ? false : 5000;
    },
  });

  const status = data?.status as RunStatus;
  const isTerminal = !!status && TERMINAL_STATUSES.includes(status);
  const isFailed = status === 'failed' || status === 'blocked' || status === 'cancelled';

  // 终态回流：失效待决缓存，CLI 回写的建议卡出现在「待你决定」区
  useEffect(() => {
    if (isTerminal) {
      qc.invalidateQueries({ queryKey: decisionKeys.all });
    }
  }, [isTerminal, qc]);

  return (
    <div className="flex items-start gap-2" data-ai-component="assistant.run-line">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
        <Bot className="size-3.5" />
      </span>
      <div
        className={cn(
          'max-w-4/5 flex-1 rounded-lg border px-3 py-2 text-xs',
          isFailed
            ? 'border-accent-red/30 bg-accent-red-light/60 text-accent-red'
            : isTerminal
              ? 'border-accent-green/30 bg-accent-green-light/60 text-content-text'
              : 'border-border bg-content-bg-secondary/60 text-content-text-secondary',
        )}
      >
        <p className="flex items-center gap-1.5 font-medium">
          {!isTerminal ? (
            <Spinner size="sm" className="size-3 text-accent-blue" />
          ) : isFailed ? (
            <XCircle className="size-3" />
          ) : (
            <CheckCircle2 className="size-3 text-accent-green" />
          )}
          {!isTerminal
            ? t('assistant.run.running')
            : isFailed
              ? t('assistant.run.failed')
              : t('assistant.run.completed')}
        </p>
        <p className="mt-0.5 line-clamp-2 text-11 text-content-text-muted">{entry.content}</p>
        {isFailed && data?.error ? (
          <p className="mt-0.5 break-words text-11">{data.error}</p>
        ) : null}
        <div className="mt-1 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDetailOpen(true)}
            className="h-5 gap-1 px-1 text-11 text-accent-blue underline-offset-2 hover:underline"
          >
            <FileText className="size-3" />
            {t('runDetails.viewDetail')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/app/executions')}
            className="h-5 gap-1 px-1 text-11 text-content-text-muted underline-offset-2 hover:underline"
          >
            <ExternalLink className="size-3" />
            {t('assistant.run.viewDetail')}
          </Button>
        </div>
      </div>

      <RunDetailsDialog
        runId={entry.runId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

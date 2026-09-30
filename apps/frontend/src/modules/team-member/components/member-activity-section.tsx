/**
 * 活动记录（个人页「活动」tab，2026-09-30 真实数据流重构）
 * - 成本预览：GET /members/:id/usage-summary（AI 成员 = Execution subject 聚合；
 *   人类成员无 CLI 执行口径，诚实空态）
 * - CLI 调用记录：GET /execution/runs?subjectType=platform_ai_member&subjectId=
 * - 成员活动流：member card recentActivities（MemberActivity 最近条目）
 */
import { useTranslation } from 'react-i18next';
import { Activity, Bot, Clock } from 'lucide-react';

import { SectionCard } from '@/components/semantic/section-card';
import { EmptyState } from '@/components/semantic/empty-state';
import { StatsCard } from '@/components/semantic/stats-card';
import { Badge } from '@/components/ui/badge';
import {
  useExecutionRuns,
  isTerminalRunStatus,
} from '@/modules/executions/api/execution-api';
import {
  formatTokens,
  formatCost,
} from '@/modules/executions/components/run-details-format';
import { useMemberCard, useMemberUsageSummary } from '../hooks';

function statusToneClass(status: string): string {
  if (status === 'completed') return 'bg-accent-green';
  if (status === 'failed' || status === 'blocked') return 'bg-accent-red';
  if (status === 'in_progress') return 'bg-accent-blue';
  return 'bg-muted-foreground/40';
}

export function MemberActivitySection({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { data: usage } = useMemberUsageSummary(memberId);
  const { data: runsData, isLoading: runsLoading } = useExecutionRuns({
    subjectType: 'platform_ai_member',
    subjectId: memberId,
    limit: 10,
  });
  const { data: card } = useMemberCard(memberId);

  const runs = runsData?.runs ?? [];
  const activities = card?.recentActivities ?? [];
  const isAI = usage?.scope === 'ai_agent';

  return (
    <>
      {/* 成本预览（AI 成员才有 CLI 用量口径；人类成员诚实说明） */}
      {isAI && usage ? (
        <>
          <StatsCard
            columns={4}
            items={[
              {
                key: 'totalTokens',
                value: formatTokens(usage.totals.totalTokens),
                label: t('memberDetail.usage.totalTokens', '总 Token'),
                icon: Bot,
                tone: 'blue',
              },
              {
                key: 'totalCost',
                value: formatCost(usage.totals.totalCost),
                label: t('memberDetail.usage.totalCost', '总成本'),
                icon: Activity,
                tone: 'yellow',
              },
              {
                key: 'executions',
                value: usage.executions.total,
                label: t('memberDetail.usage.executions', '执行次数'),
                icon: Activity,
                tone: 'green',
              },
              {
                key: 'lastExecution',
                value: usage.lastExecutionAt
                  ? new Date(usage.lastExecutionAt).toLocaleString()
                  : t('memberDetail.usage.never', '从未'),
                label: t('memberDetail.usage.lastExecution', '最近执行'),
                icon: Clock,
              },
            ]}
          />
          {usage.byModel.length > 0 && (
            <SectionCard title={t('memberDetail.usage.byModel', '按模型分解')}>
              <ul className="space-y-1">
                {usage.byModel.map((row) => (
                  <li
                    key={row.model}
                    className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted/30"
                  >
                    <span className="font-mono">{row.model}</span>
                    <span className="text-muted-foreground">
                      {formatTokens(row.tokens)} · {formatCost(row.cost)}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      ) : (
        <SectionCard title={t('memberDetail.usage.title', '成本预览')}>
          <p className="py-3 text-center text-xs text-muted-foreground">
            {t(
              'memberDetail.usage.humanNote',
              '人类成员无 CLI 执行用量；成本口径为日费率（工时），见右侧属性栏',
            )}
          </p>
        </SectionCard>
      )}

      {/* CLI 调用记录（真实执行数据流） */}
      <SectionCard
        title={t('memberDetail.activity.cliRuns', 'CLI 调用记录')}
        description={t(
          'memberDetail.activity.cliRunsDesc',
          '派发给该成员的执行记录（含 token 与成本）',
        )}
      >
        {runsLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('common.loading', '加载中…')}
          </p>
        ) : runs.length === 0 ? (
          <EmptyState
            variant="card"
            icon={Bot}
            title={t('memberDetail.activity.noRuns', '还没有执行记录')}
            description={t(
              'memberDetail.activity.noRunsDesc',
              '派发任务给该成员后，CLI 调用记录会出现在这里',
            )}
            className="min-h-0 border-0"
          />
        ) : (
          <ul className="space-y-1">
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${statusToneClass(run.status)}`}
                    title={run.status}
                  />
                  <span className="truncate text-sm">{run.goal || run.id}</span>
                  {run.issue && (
                    <span className="truncate text-xs text-muted-foreground">
                      {run.issue.title}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {run.totalTokens != null && (
                    <span className="font-mono">
                      {formatTokens(run.totalTokens)}
                    </span>
                  )}
                  {run.totalCost != null && (
                    <span className="font-mono">{formatCost(run.totalCost)}</span>
                  )}
                  {!isTerminalRunStatus(run.status) && (
                    <Badge variant="secondary" className="text-3xs">
                      {run.status}
                    </Badge>
                  )}
                  <span>{new Date(run.createdAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 成员活动流 */}
      <SectionCard title={t('memberDetail.recentActivities', '活动记录')}>
        {activities.length === 0 ? (
          <EmptyState
            variant="card"
            icon={Activity}
            title={t('memberDetail.noActivities', '还没有活动记录')}
            description={t(
              'memberDetail.noActivitiesDesc',
              '该成员产生操作后，记录会出现在这里',
            )}
            className="min-h-0 border-0"
          />
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>{a.type}</span>
                <span>{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

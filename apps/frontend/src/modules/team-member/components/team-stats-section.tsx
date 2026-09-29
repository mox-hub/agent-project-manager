import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/semantic/empty-state';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MetricRow } from '@/components/semantic/metric-row';
import { StatsCard } from '@/components/semantic/stats-card';
import { ActivityHeatmap } from '@/components/semantic/activity-heatmap';
import { getTeamStats } from '../api/team-member-api';
import { useTeamProjectStats } from '../hooks';

function fenToYuan(cents: number): string {
  return `¥${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** 团队统计页签：token 用量（真实 AIUsageLog）/ 活跃热力图（真实活动）/ 人天成本（费率缺失按默认档）/ 所辖项目统计 */
export function TeamStatsSection({ teamId }: { teamId: string }) {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['team-stats', teamId],
    queryFn: () => getTeamStats(teamId, 30),
  });
  const { data: projectStats } = useTeamProjectStats(teamId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-6 text-center">统计加载中…</div>;
  }
  if (!stats) return null;

  const anyDefaultRate = stats.personDays.rows.some((r) => r.rateIsDefault);

  return (
    <div className="space-y-3">
      {/* 汇总卡片：semantic/stats-card compact（2026-09-29 统计卡归一批，手写 Card 汇总卡退役） */}
      <StatsCard
        columns={4}
        items={[
          {
            key: 'members',
            label: '成员',
            value: (
              <>
                {stats.memberCount}
                <span className="ml-1.5 text-xs font-sans font-normal text-muted-foreground">
                  人类 {stats.humanCount} / AI {stats.aiCount}
                </span>
              </>
            ),
          },
          {
            key: 'tokens',
            label: '30 天 Token 用量',
            value: fmtTokens(stats.tokenUsage.totals.totalTokens),
          },
          {
            key: 'cost',
            label: '30 天估算成本',
            value: `$${stats.tokenUsage.totals.estimatedCost.toFixed(2)}`,
          },
          {
            key: 'personDays',
            label: '30 天人天成本',
            value: (
              <>
                {fenToYuan(stats.personDays.totalCostCents)}
                {anyDefaultRate && (
                  <span className="ml-1.5 text-3xs font-sans font-normal text-muted-foreground">部分按默认费率</span>
                )}
              </>
            ),
          },
        ]}
      />

      {/* Token 用量折线 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Token 用量（近 30 天，AIUsageLog 真实数据）</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {stats.tokenUsage.daily.length === 0 ? (
            <EmptyState title="暂无用量记录" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.tokenUsage.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number, name: string) =>
                    name === 'totalTokens' ? [fmtTokens(v), '总 Token'] : [v, name]
                  }
                />
                <Line
                  type="monotone"
                  dataKey="promptTokens"
                  stroke="var(--color-accent-blue)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="completionTokens"
                  stroke="var(--color-accent-green)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 热力图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">活跃热力图（MemberActivity 真实数据）</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap data={stats.heatmap} days={91} />
        </CardContent>
      </Card>

      {/* 人天成本 + 排行榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              人天成本
              {anyDefaultRate && (
                <span className="ml-2 text-3xs font-normal text-muted-foreground" data-mock="true">
                  未设费率成员按默认 ¥{(stats.personDays.defaultRateCents / 100).toFixed(0)}/天 估算
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="w-full text-sm">
              <TableHeader className="text-xs text-muted-foreground border-b border-border">
                <TableRow>
                  <TableHead className="text-left p-2">成员</TableHead>
                  <TableHead className="text-right p-2 w-20">活跃天</TableHead>
                  <TableHead className="text-right p-2 w-28">日费率</TableHead>
                  <TableHead className="text-right p-2 w-28">成本</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.personDays.rows.map((r) => (
                  <TableRow key={r.memberId} className="border-b border-border/50 last:border-0">
                    <TableCell className="p-2">{r.name}</TableCell>
                    <TableCell className="p-2 text-right">{r.activeDays}</TableCell>
                    <TableCell className="p-2 text-right">
                      {fenToYuan(r.rateCents)}
                      {r.rateIsDefault && (
                        <Badge variant="secondary" className="ml-1 text-3xs">默认</Badge>
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-right font-medium">
                      {fenToYuan(r.costCents)}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.personDays.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-2">
                      <EmptyState
                        title="还没有成员"
                        description="成员加入团队并产生活跃记录后，用量会在这里统计"
                        className="min-h-0 border-0 py-4"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">成员活跃排行</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="w-full text-sm">
              <TableHeader className="text-xs text-muted-foreground border-b border-border">
                <TableRow>
                  <TableHead className="text-left p-2">成员</TableHead>
                  <TableHead className="text-left p-2 w-16">类型</TableHead>
                  <TableHead className="text-right p-2 w-24">活动数</TableHead>
                  <TableHead className="text-right p-2 w-24">Token</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.leaderboard.map((r) => (
                  <TableRow key={r.memberId} className="border-b border-border/50 last:border-0">
                    <TableCell className="p-2">{r.name}</TableCell>
                    <TableCell className="p-2">
                      <Badge variant="outline" className="text-3xs">
                        {r.type === 'ai_agent' ? 'AI' : '人类'}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 text-right">{r.activityCount}</TableCell>
                    <TableCell className="p-2 text-right">{fmtTokens(r.totalTokens)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 所辖项目统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t('teamDetail.stats.projects.title', '项目统计')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectStats && projectStats.projects.length > 0 ? (
            <>
              {/* 项目汇总瓦片：semantic/stats-card compact + surface=muted（2026-09-29 统计卡归一批；
                  完成率/逾期的彩底改数值着色 coloredValue，居中改左对齐随基线统一） */}
              <StatsCard
                columns={4}
                items={[
                  { key: 'avgProgress', label: t('teamDetail.stats.projects.avgProgress', '平均进度'), value: `${projectStats.totals.avgProgress}%`, surface: 'muted' },
                  { key: 'taskCount', label: t('teamDetail.stats.projects.taskCount', '任务总数'), value: projectStats.totals.taskCount, surface: 'muted' },
                  { key: 'doneRate', label: t('teamDetail.stats.projects.doneRate', '完成率'), value: `${projectStats.totals.doneRate}%`, tone: 'green', coloredValue: true, surface: 'muted' },
                  { key: 'overdue', label: t('teamDetail.stats.projects.overdue', '逾期任务'), value: projectStats.totals.overdueCount, tone: 'red', coloredValue: true, surface: 'muted' },
                ]}
              />
              <div className="text-xs text-muted-foreground">
                {t('teamDetail.stats.projects.projectCount', { count: projectStats.projectCount })}
              </div>
              <Table className="w-full text-sm">
                <TableHeader className="text-xs text-muted-foreground border-b border-border">
                  <TableRow>
                    <TableHead className="text-left p-2">{t('teamDetail.projects.project', '项目')}</TableHead>
                    <TableHead className="text-left p-2 w-20">{t('teamDetail.stats.projects.status', '状态')}</TableHead>
                    <TableHead className="text-left p-2 w-32">{t('teamDetail.stats.projects.progress', '进度')}</TableHead>
                    <TableHead className="text-right p-2 w-16">{t('teamDetail.stats.projects.tasks', '任务')}</TableHead>
                    <TableHead className="text-right p-2 w-16">{t('teamDetail.stats.projects.inProgress', '进行中')}</TableHead>
                    <TableHead className="text-right p-2 w-16">{t('teamDetail.stats.projects.done', '已完成')}</TableHead>
                    <TableHead className="text-right p-2 w-16">{t('teamDetail.stats.projects.overdue', '逾期')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectStats.projects.map((p) => (
                    <TableRow key={p.projectId} className="border-b border-border/50 last:border-0">
                      <TableCell className="p-2">
                        <Link
                          to={`/app/projects/${p.projectId}`}
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: p.color || 'var(--color-brand-linear)' }}
                          />
                          <span className="truncate">{p.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge variant="outline" className="text-3xs">
                          {t(`project.sidebar.statusLabel.${p.status}`, p.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-2">
                        {/* 首消费 semantic/metric-row（2026-09-29）：label 缺省形态（label 在表格首列），
                            行形态与原手写等价（Progress flex-1 + w-8 右对齐数值），数值增 tabular-nums 基线 */}
                        <MetricRow value={p.progress} />
                      </TableCell>
                      <TableCell className="p-2 text-right">{p.taskCount}</TableCell>
                      <TableCell className="p-2 text-right">{p.inProgressCount}</TableCell>
                      <TableCell className="p-2 text-right">{p.doneCount}</TableCell>
                      <TableCell className={p.overdueCount > 0 ? 'p-2 text-right font-medium text-accent-red' : 'p-2 text-right'}>
                        {p.overdueCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {t('teamDetail.stats.projects.empty', '尚未绑定项目，绑定后展示项目交付统计')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

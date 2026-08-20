import { useQuery } from '@tanstack/react-query';
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
import { ActivityHeatmap } from '@/components/ui/activity-heatmap';
import { getTeamStats } from '../api/team-member-api';

function fenToYuan(cents: number): string {
  return `¥${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** 团队统计页签：token 用量（真实 AIUsageLog）/ 活跃热力图（真实活动）/ 人天成本（费率缺失按默认档） */
export function TeamStatsSection({ teamId }: { teamId: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['team-stats', teamId],
    queryFn: () => getTeamStats(teamId, 30),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-6 text-center">统计加载中…</div>;
  }
  if (!stats) return null;

  const anyDefaultRate = stats.personDays.rows.some((r) => r.rateIsDefault);

  return (
    <div className="space-y-3">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">成员</div>
            <div className="text-xl font-semibold">
              {stats.memberCount}
              <span className="ml-1.5 text-xs text-muted-foreground">
                人类 {stats.humanCount} / AI {stats.aiCount}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">30 天 Token 用量</div>
            <div className="text-xl font-semibold">{fmtTokens(stats.tokenUsage.totals.totalTokens)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">30 天估算成本</div>
            <div className="text-xl font-semibold">
              ${stats.tokenUsage.totals.estimatedCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">30 天人天成本</div>
            <div className="text-xl font-semibold">
              {fenToYuan(stats.personDays.totalCostCents)}
              {anyDefaultRate && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">部分按默认费率</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token 用量折线 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Token 用量（近 30 天，AIUsageLog 真实数据）</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {stats.tokenUsage.daily.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">暂无用量记录</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.tokenUsage.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                  stroke="var(--accent-blue)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="completionTokens"
                  stroke="var(--accent-green)"
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
                <span className="ml-2 text-[10px] font-normal text-muted-foreground" data-mock="true">
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
                        <Badge variant="secondary" className="ml-1 text-[9px]">默认</Badge>
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-right font-medium">
                      {fenToYuan(r.costCents)}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.personDays.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                      暂无成员
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
                      <Badge variant="outline" className="text-[10px]">
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
    </div>
  );
}

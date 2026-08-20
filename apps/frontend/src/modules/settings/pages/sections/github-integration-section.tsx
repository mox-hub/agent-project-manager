/**
 * GithubIntegrationSection - 设置页「GitHub 集成」子页
 * @description 由 github 模块的 GithubIntegrationPage 迁移而来（原路由 /app/integrations/github，2026-08-19 迁入设置页）
 * - 列出 GitHub integration 配置
 * - 显示 PR 状态、设置连接
 */
import { useEffect, useState } from 'react';
import { PageShell } from '@/components/ui/page-shell';
import { useIntegrations } from '@/modules/integration/hooks/use-integrations';
import { GithubPanel } from '@/modules/github/components/github-panel';
import { GithubSetupCard } from '@/modules/github/components/github-setup-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Github, Activity, MessageSquare, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function GithubIntegrationSection() {
  const { data: integrationsResp } = useIntegrations();
  const integrations = integrationsResp?.data ?? [];
  const githubInts = integrations.filter((i: any) => i.provider === 'github');
  const firstId = githubInts[0]?.id;

  return (
    <PageShell
      title="GitHub Integration"
      icon={Github}
      actions={
        <Badge variant="outline" className="font-mono text-[10px]">
          V3 Stage 2
        </Badge>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {githubInts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  尚未配置 GitHub 集成
                </CardTitle>
                <CardDescription>
                  请在 <code>集成管理 → GitHub</code> 创建一个 GitHub 集成配置（PAT + Webhook Secret）
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <GithubPanel integrationId={firstId} />
              <PrLifecycleExplainerCard />
            </>
          )}
        </div>
        <div className="space-y-4">
          {firstId && <GithubSetupCard integrationId={firstId} />}
          <Stage2SummaryCard />
        </div>
      </div>
    </PageShell>
  );
}

function PrLifecycleExplainerCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">PR 生命周期</CardTitle>
        <CardDescription>
          Webhook 触发的 PR 状态会写入 <code>RemotePullRequest</code> 表，并反馈到 Agent 信任评分
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Table className="w-full text-xs">
          <TableHeader className="text-muted-foreground">
            <TableRow>
              <TableHead className="text-left py-1">状态</TableHead>
              <TableHead className="text-left py-1">语义</TableHead>
              <TableHead className="text-left py-1">信任分变化</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="py-1">
                <Badge className="bg-purple-600">merged</Badge>
              </TableCell>
              <TableCell className="py-1">PR merge</TableCell>
              <TableCell className="py-1 text-green-600 font-semibold">+8</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1">
                <Badge variant="secondary">merged_with_comments</Badge>
              </TableCell>
              <TableCell className="py-1">合并但有评论</TableCell>
              <TableCell className="py-1 text-green-600">+4</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1">
                <Badge variant="destructive">changes_requested</Badge>
              </TableCell>
              <TableCell className="py-1">审查被打回</TableCell>
              <TableCell className="py-1 text-red-600">−4</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1">
                <Badge variant="destructive">closed</Badge>
              </TableCell>
              <TableCell className="py-1">未合并关闭</TableCell>
              <TableCell className="py-1 text-red-600">−2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Stage2SummaryCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          阶段 2 完成度
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Item label="GitHub API wrapper (octokit)" done />
        <Item label="Webhook 签名校验 + 路由" done />
        <Item label="PR 状态持久化（RemotePullRequest）" done />
        <Item label="TrustService.applyPrOutcome" done />
        <Item label="Dispatch → 真实 push + create PR" todo />
        <Item label="PR 状态面板（前端）" done />
        <Item label="e2e 验证" done />
      </CardContent>
    </Card>
  );
}

function Item({ label, done, todo }: { label: string; done?: boolean; todo?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done && <span className="text-green-600">✓</span>}
      {todo && <span className="text-amber-600">○</span>}
      <span className={todo ? 'text-muted-foreground' : ''}>{label}</span>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GitBranch,
  GitMerge,
  GitPullRequest,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  X,
  RefreshCcw,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useGithubPulls, useCreatePull } from '../hooks/use-github';
import type { GitHubPullRequest as Pr } from '../api/github-api';
import { cn } from '@/lib/utils';

/**
 * GitHub 集成面板（V3 阶段2）：
 * - 显示已有 PR 列表
 * - 允许手动触发创建 PR（高级）
 * - 状态徽章 + 链接跳转
 */
export function GithubPanel({
  integrationId,
  repoFullName,
}: {
  integrationId: string;
  repoFullName?: string; // owner/repo
}) {
  const [repo, setRepo] = useState(repoFullName || '');
  const [showCreate, setShowCreate] = useState(false);
  const [createInput, setCreateInput] = useState({
    title: '',
    head: '',
    base: 'main',
    body: '',
  });

  // repoFullName 变为非空且本地 repo 为空时补齐（渲染期间调整，避免 effect 内同步 setState）
  const [prevRepoFullName, setPrevRepoFullName] = useState(repoFullName);
  if (prevRepoFullName !== repoFullName) {
    setPrevRepoFullName(repoFullName);
    if (repoFullName && !repo) setRepo(repoFullName);
  }

  const { data: pulls, isLoading, isError, refetch } = useGithubPulls(
    repoFullName ? integrationId : undefined,
    repo || undefined,
    'open',
  );

  const createMut = useCreatePull(integrationId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4 w-4" />
              GitHub 集成
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              跟踪 PR 状态变化，PR 通过/Merged/Review 反馈驱动 Agent 信任评分
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-10">
              V3 Stage 2
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="repo-name" className="text-xs">
              仓库 (owner/repo)
            </Label>
            <Input
              id="repo-name"
              value={repo}
              onChange={(e) => setRepo(e.target.value.trim())}
              placeholder="例如 owner/repo"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={!repo || isLoading}
              className="h-8"
            >
              {isLoading ? (
                <Spinner className="h-3 w-3 text-inherit" />
              ) : (
                <RefreshCcw className="h-3 w-3" />
              )}
              <span className="ml-1">刷新</span>
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => setShowCreate((v) => !v)}
              disabled={!repo}
              className="h-8"
            >
              {showCreate ? <X className="h-3 w-3" /> : <GitPullRequest className="h-3 w-3" />}
              <span className="ml-1">新建 PR</span>
            </Button>
          </div>
        </div>

        {showCreate && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">PR 标题</Label>
              <Input
                value={createInput.title}
                onChange={(e) => setCreateInput((s) => ({ ...s, title: e.target.value }))}
                placeholder="feat(scope): ..."
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Head 分支</Label>
                <Input
                  value={createInput.head}
                  onChange={(e) => setCreateInput((s) => ({ ...s, head: e.target.value }))}
                  placeholder="feat/xxx"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Base 分支</Label>
                <Input
                  value={createInput.base}
                  onChange={(e) => setCreateInput((s) => ({ ...s, base: e.target.value }))}
                  placeholder="main"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">描述（可选）</Label>
              <Input
                value={createInput.body}
                onChange={(e) => setCreateInput((s) => ({ ...s, body: e.target.value }))}
                placeholder="关联任务：..."
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreate(false)}
                className="h-8"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const [owner, repoName] = repo.split('/');
                  await createMut.mutateAsync({
                    owner,
                    repo: repoName,
                    title: createInput.title,
                    head: createInput.head,
                    base: createInput.base,
                    body: createInput.body || undefined,
                  });
                  setShowCreate(false);
                  refetch();
                }}
                disabled={
                  createMut.isPending ||
                  !createInput.title ||
                  !createInput.head ||
                  !createInput.base
                }
                className="h-8"
              >
                {createMut.isPending ? (
                  <Spinner className="h-3 w-3 mr-1 text-inherit" />
                ) : (
                  <GitPullRequest className="h-3 w-3 mr-1" />
                )}
                提交
              </Button>
            </div>
          </div>
        )}

        {isError && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            无法连接到 GitHub，请检查仓库名与集成凭据
          </div>
        )}

        {isLoading && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Spinner className="h-3 w-3 text-inherit" />
            加载 PR 列表…
          </div>
        )}

        {!isLoading && (pulls?.length ?? 0) === 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CircleDashed className="h-3 w-3" />
            当前没有 Open PR
          </div>
        )}

        <div className="space-y-1">
          {(pulls ?? []).slice(0, 10).map((p: Pr) => (
            <PrRow key={p.id} pr={p} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PrRow({ pr }: { pr: Pr }) {
  return (
    <a
      href={pr.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-card hover:bg-accent transition-colors',
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {pr.merged ? (
          <GitMerge className="h-4 w-4 text-accent-purple shrink-0" />
        ) : pr.state === 'closed' ? (
          <X className="h-4 w-4 text-destructive shrink-0" />
        ) : (
          <GitPullRequest className="h-4 w-4 text-accent-green shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{pr.title}</div>
          <div className="flex items-center gap-2 text-11 text-muted-foreground">
            <span className="font-mono">#{pr.number}</span>
            <span>
              {pr.head.ref} → {pr.base.ref}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pr.merged ? (
          <Badge variant="default" className="bg-accent-purple hover:bg-accent-purple">
            <GitMerge className="h-3 w-3 mr-1" />
            merged
          </Badge>
        ) : pr.state === 'closed' ? (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            closed
          </Badge>
        ) : (
          <Badge variant="default" className="bg-accent-green hover:bg-accent-green">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            open
          </Badge>
        )}
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </div>
    </a>
  );
}

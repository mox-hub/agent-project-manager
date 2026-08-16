import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Github, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { githubApi } from '../api/github-api';
import { useGithubTestStored } from '../hooks/use-github';

/**
 * GitHub 集成配置面板
 * - 输入 PAT 测试
 * - 显示已存 integration 信息
 */
export function GithubSetupCard({
  integrationId,
  repoFullName,
}: {
  integrationId: string;
  repoFullName?: string;
}) {
  const [token, setToken] = useState('');
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    data?: { ok: boolean; viewer?: { login: string }; error?: string };
  }>({ loading: false });

  const storedTest = useGithubTestStored(integrationId);

  async function testInline() {
    if (!token.trim()) return;
    setTestResult({ loading: true });
    try {
      const res = await githubApi.testInline(token.trim());
      setTestResult({ loading: false, data: res });
    } catch (err) {
      setTestResult({
        loading: false,
        data: { ok: false, error: (err as Error).message },
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Github className="h-4 w-4" />
          GitHub Integration Setup
        </CardTitle>
        <CardDescription>
          通过 Personal Access Token (PAT) 连接 GitHub。V3 阶段2 启用 PR 状态追踪。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pat-token" className="text-xs">
            GitHub PAT（仅测试，不保存）
          </Label>
          <div className="flex gap-2">
            <Input
              id="pat-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="h-9 text-sm font-mono"
            />
            <Button
              onClick={testInline}
              disabled={testResult.loading || !token.trim()}
              className="h-9"
            >
              {testResult.loading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              Test
            </Button>
          </div>
          {testResult.data && (
            <div
              className={
                testResult.data.ok
                  ? 'text-xs text-green-600 flex items-center gap-1'
                  : 'text-xs text-red-600 flex items-center gap-1'
              }
            >
              {testResult.data.ok ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  连接成功：{testResult.data.viewer?.login}
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  {testResult.data.error || '连接失败'}
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">已存配置</Label>
            <Badge variant="outline" className="font-mono text-[10px]">
              ID: {integrationId.slice(-6)}
            </Badge>
          </div>
          {storedTest.isLoading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              验证已存凭据…
            </div>
          ) : storedTest.data ? (
            <div className="text-xs">
              {storedTest.data.ok ? (
                <span className="text-green-600">✓ 凭据有效</span>
              ) : (
                <span className="text-red-600">
                  ✗ 凭据失效：{storedTest.data.error}
                </span>
              )}
            </div>
          ) : null}
          {repoFullName && (
            <div className="text-xs text-muted-foreground">
              当前仓库：<span className="font-mono">{repoFullName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

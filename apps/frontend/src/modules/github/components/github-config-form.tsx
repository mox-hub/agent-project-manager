import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Github, CheckCircle2, AlertCircle } from 'lucide-react';
import { githubApi } from '../api/github-api';
import {
  useCreateIntegration,
} from '@/modules/integration/hooks/use-integrations';
import { cn } from '@/lib/utils';

interface GithubConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (integrationId: string) => void;
}

type TestState = 'idle' | 'loading' | 'success' | 'error';

/**
 * GitHub Connect 流（集成接入规范 v0 §3.1 五段式②，修复 F2 断裂）：
 * 凭据采集（PAT + 可选 webhookSecret）→ test-inline 受保护校验 → 保存 IntegrationConfig（必须落库）。
 * 「仅测试不保存」不得作为终态——保存走通用 POST /integrations（provider='github'，凭据由后端加密、响应恒脱敏）。
 */
export function GithubConfigForm({
  open,
  onClose,
  onSuccess,
}: GithubConfigFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('GitHub');
  const [token, setToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const create = useCreateIntegration();

  const testConnection = async () => {
    if (!token.trim()) {
      toast.error(t('github.connectDialog.testRequired'));
      return;
    }
    setTestState('loading');
    setTestMessage(null);
    try {
      const res = await githubApi.testInline(token.trim());
      if (res.ok && res.viewer) {
        setTestState('success');
        setTestMessage(
          res.sampleRepo
            ? t('github.connectDialog.connectedAsWithRepo', {
                login: res.viewer.login,
                repo: res.sampleRepo.fullName,
              })
            : t('github.connectDialog.connectedAs', {
                login: res.viewer.login,
              }),
        );
      } else {
        setTestState('error');
        setTestMessage(res.error ?? t('github.connectDialog.testFailed'));
      }
    } catch (err) {
      setTestState('error');
      setTestMessage(
        err instanceof Error
          ? err.message
          : t('github.connectDialog.testFailed'),
      );
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error(t('github.connectDialog.saveRequired'));
      return;
    }
    try {
      const result = await create.mutateAsync({
        provider: 'github',
        scope: 'global',
        name,
        config: {
          token,
          ...(webhookSecret.trim()
            ? { webhookSecret: webhookSecret.trim() }
            : {}),
        },
      });
      toast.success(t('github.connectDialog.saved'));
      onSuccess?.(result.id);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('github.connectDialog.saveFailed'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            {t('github.connectDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('github.connectDialog.desc')}
            <br />
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              github.com/settings/tokens
            </a>
            <br />
            {t('github.connectDialog.descWebhook')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="github-name">
              {t('github.connectDialog.nameLabel')}
            </Label>
            <Input
              id="github-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GitHub"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github-token">
              {t('github.connectDialog.tokenLabel')}
            </Label>
            <div className="flex gap-2">
              <Input
                id="github-token"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t('github.connectDialog.tokenPlaceholder')}
                required
                className="flex-1 font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={testConnection}
                disabled={testState === 'loading'}
                className="shrink-0"
              >
                {testState === 'loading' ? (
                  <Spinner className="h-3 w-3 mr-1 text-inherit" />
                ) : null}
                {testState === 'loading'
                  ? t('github.connectDialog.testing')
                  : t('github.connectDialog.test')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('github.connectDialog.tokenHint')}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github-webhook-secret">
              {t('github.connectDialog.webhookLabel')}
            </Label>
            <Input
              id="github-webhook-secret"
              type="password"
              autoComplete="off"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={t('github.connectDialog.webhookPlaceholder')}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t('github.connectDialog.webhookHint')}
            </p>
          </div>

          {testState !== 'idle' && testMessage ? (
            <div
              className={cn(
                'flex items-start gap-2 rounded-md border p-3 text-sm',
                testState === 'success'
                  ? 'border-accent-green/30 bg-accent-green/5 text-accent-green'
                  : 'border-destructive/30 bg-destructive/5 text-destructive',
              )}
            >
              {testState === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{testMessage}</span>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending
                ? t('github.connectDialog.saving')
                : t('github.connectDialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

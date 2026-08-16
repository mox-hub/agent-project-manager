/**
 * CLI Dispatch Panel Component
 * 任务详情页中的"派发给 CLI 执行"按钮和面板
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, Play, X, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { api } from '@/infrastructure/api-client';
import type { CliProvider, CliProviderId } from '../api/ai-hub-api';

interface CliDispatchPanelProps {
  taskId: string;
  taskTitle?: string;
  onDispatchSuccess?: (executionRunId: string) => void;
}

export function CliDispatchPanel({ taskId, taskTitle, onDispatchSuccess }: CliDispatchPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CliProviderId>('claude-code');
  const queryClient = useQueryClient();

  // Fetch available CLI providers
  const { data: providersData, isLoading: loadingProviders } = useQuery({
    queryKey: ['cliProviders'],
    queryFn: async () => {
      return api.get<{ providers: CliProvider[]; defaultProvider: CliProviderId | null }>('/ai/cli-providers');
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      return api.post<{ executionRunId: string; status: string }>(
        `/ai/tasks/${taskId}/dispatch-cli`,
        { providerId: selectedProvider }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['executionRuns'] });
      setOpen(false);
      onDispatchSuccess?.(data.executionRunId);
    },
  });

  const availableProviders = providersData?.providers?.filter((p) => p.available) || [];
  const defaultProvider = providersData?.defaultProvider;

  // Use default provider if selected is not available
  const isSelectedAvailable = availableProviders.some((p) => p.providerId === selectedProvider);
  const effectiveProvider = isSelectedAvailable
    ? selectedProvider
    : defaultProvider || availableProviders[0]?.providerId || 'claude-code';

  const providerDisplayName = {
    'claude-code': 'Claude Code',
    'codex': 'OpenAI Codex',
    'zcode': 'ZCode',
  };

  const selectedProviderInfo = providersData?.providers?.find(
    (p) => p.providerId === effectiveProvider
  );

  if (loadingProviders) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (availableProviders.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled title="No CLI providers available">
        <Bot className="mr-2 h-4 w-4" />
        No CLI Available
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="default" size="sm" onClick={() => setOpen(true)}>
        <Play className="mr-2 h-4 w-4" />
        派发给 AI 执行
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>派发给 CLI 执行</DialogTitle>
          <DialogDescription>
            选择一个 AI CLI 提供商来执行任务
            {taskTitle && <span className="mt-1 block text-sm font-medium">{taskTitle}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>CLI 提供商</Label>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  {providerDisplayName[effectiveProvider]}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {availableProviders.map((provider) => (
                  <DropdownMenuItem
                    key={provider.providerId}
                    onClick={() => setSelectedProvider((provider.providerId ?? provider.id) as CliProviderId)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      {providerDisplayName[provider.providerId]}
                    </span>
                    {selectedProvider === provider.providerId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Provider Info */}
          {selectedProviderInfo && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">版本</span>
                <Badge variant="secondary">{selectedProviderInfo.version || 'Unknown'}</Badge>
              </div>
              {selectedProviderInfo.error && (
                <p className="mt-2 text-xs text-destructive">
                  Error: {selectedProviderInfo.error}
                </p>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              CLI 执行将在服务器本地运行，请确保 Claude Code 已登录并配置正确的工作区。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => dispatchMutation.mutate()}
            disabled={dispatchMutation.isPending}
          >
            {dispatchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                派发中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                开始执行
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { LinearIcon } from '@/components/icons/linear';
import { LinearStatusIndicator } from './linear-provider-card';
import {
  useCreateIntegration,
} from '@/modules/integration/hooks/use-integrations';
import { useLinearViewer } from '../hooks/use-linear-sync';
import type { LinearViewer } from '../api/linear-api';
import { api } from '@/infrastructure/api-client';
import { cn } from '@/lib/utils';

interface LinearConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (integrationId: string) => void;
}

type TestState = 'idle' | 'loading' | 'success' | 'error';

export function LinearConfigForm({
  open,
  onClose,
  onSuccess,
}: LinearConfigFormProps) {
  const [name, setName] = useState('Linear Workspace');
  const [apiKey, setApiKey] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [viewer, setViewer] = useState<LinearViewer | null>(null);

  const create = useCreateIntegration();

  // For "test connection" we can either:
  // (a) call a temp endpoint, or
  // (b) call backend /integrations/linear/test after creation.
  // We do (a) for instant feedback using a lightweight inline test.
  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }
    setTestState('loading');
    setTestMessage(null);
    setViewer(null);
    try {
      // Use a temporary throwaway integration record. To keep things simple,
      // we call Linear's GraphQL API directly via a tiny test endpoint.
      const res = await api.post<{ ok: boolean; viewer?: LinearViewer; error?: string }>(
        '/integrations/linear/test-inline',
        { apiKey },
      );
      if (res.ok && res.viewer) {
        setTestState('success');
        setTestMessage(
          `Connected to ${res.viewer.name}'s Linear (${res.viewer.organizations[0]?.name ?? 'workspace'})`,
        );
        setViewer(res.viewer);
      } else {
        setTestState('error');
        setTestMessage(res.error ?? 'Connection failed');
      }
    } catch (err) {
      setTestState('error');
      setTestMessage(
        err instanceof Error ? err.message : 'Connection failed',
      );
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error('API Key is required');
      return;
    }
    try {
      const result = await create.mutateAsync({
        provider: 'linear',
        scope: 'global',
        name,
        config: { apiKey, apiKeyType: 'personal' },
        metadata: viewer
          ? {
              viewerName: viewer.name,
              viewerEmail: viewer.email,
              orgCount: viewer.organizations.length,
            }
          : undefined,
      } as any);
      toast.success('Linear integration saved');
      onSuccess?.((result as any).id);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save integration',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinearIcon size={24} /> Connect Linear
          </DialogTitle>
          <DialogDescription>
            Get your Personal API Key at{' '}
            <a
              href="https://linear.app/settings/api"
              target="_blank"
              rel="noreferrer"
              className="text-[#5E6AD2] underline"
            >
              linear.app/settings/api
            </a>{' '}
            → Personal API keys → Create key.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="linear-name">Display name</Label>
            <Input
              id="linear-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Linear Workspace"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linear-apikey">Personal API Key</Label>
            <div className="flex gap-2">
              <Input
                id="linear-apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="lin_api_..."
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={testConnection}
                disabled={testState === 'loading'}
                className="shrink-0"
              >
                <LinearStatusIndicator state={testState} className="mr-1.5" />
                {testState === 'loading' ? 'Testing…' : 'Test'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The key is encrypted with AES-256-GCM before being stored.
            </p>
          </div>

          {testState !== 'idle' && testMessage ? (
            <div
              className={cn(
                'rounded-md border p-3 text-sm',
                testState === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                  : testState === 'error'
                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-200'
                    : 'border-slate-500/30 bg-slate-500/5 text-slate-200',
              )}
            >
              {testMessage}
              {viewer && (
                <div className="mt-2 text-xs text-white/60">
                  {viewer.teams.length} team{viewer.teams.length === 1 ? '' : 's'} •{' '}
                  {viewer.organizations.length} organization
                  {viewer.organizations.length === 1 ? '' : 's'}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save & Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

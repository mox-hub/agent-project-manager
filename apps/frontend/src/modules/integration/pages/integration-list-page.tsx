import { useMemo, useState } from 'react';
import { Download, Plus, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useDeleteIntegration, useIntegrations, useUpdateIntegration } from '../hooks/use-integrations';
import { Puzzle } from 'lucide-react';

const MARKETPLACE = [
  { id: 'mp1', name: 'Sentry Monitor', description: 'Import error tracking and alert data into tasks', icon: '🔔', category: 'Monitoring', installs: 1234 },
  { id: 'mp2', name: 'Notion Sync', description: 'Sync project docs with Notion workspaces', icon: '📓', category: 'Documentation', installs: 876 },
  { id: 'mp3', name: 'Vercel Deploys', description: 'Track deployment status and preview links', icon: '▲', category: 'CI/CD', installs: 654 },
  { id: 'mp4', name: 'Loom Recorder', description: 'Attach Loom video recordings to tasks', icon: '🎥', category: 'Communication', installs: 432 },
];

function getProviderIcon(provider: string) {
  const value = provider.toLowerCase();
  if (value === 'github') return '🐙';
  if (value === 'gitlab') return '🦊';
  if (value === 'bitbucket') return '🪣';
  if (value === 'notion') return '📓';
  if (value === 'sentry') return '🔔';
  return '🔌';
}

export function IntegrationListPage() {
  const { data: integrationsData, isLoading } = useIntegrations();
  const updateIntegration = useUpdateIntegration();
  const deleteIntegration = useDeleteIntegration();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed');

  const integrations = useMemo(() => integrationsData?.data ?? [], [integrationsData?.data]);
  const enabledCount = integrations.filter((item) => item.enabled).length;

  const installedItems = useMemo(() => {
    return integrations.filter((item) => {
      const haystack = `${item.name} ${item.provider}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [integrations, search]);

  const marketplaceItems = useMemo(() => {
    return MARKETPLACE.filter((item) => {
      const haystack = `${item.name} ${item.description}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [search]);

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.integrationList}>
      <div className="flex h-full flex-col">
        <PageHeader
          aiId="integration.integration-list"
          title="Integrations"
          description={`${enabledCount} active`}
          icon={Puzzle}
          iconColor="text-accent-blue"
          actions={
            <Button size="sm" onClick={() => setTab('marketplace')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Browse Marketplace
            </Button>
          }
        />

        <div className="flex items-center gap-4 border-b border-border px-6 py-2.5">
          <div className="flex gap-3">
            {(['installed', 'marketplace'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  'border-b-2 pb-1 text-xs font-medium transition-colors',
                  tab === item
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {item === 'installed' ? 'Installed' : 'Marketplace'}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search plugins..."
              className="h-7 w-52 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading integrations...</div>
          ) : null}

          {!isLoading && tab === 'installed' ? (
            <div className="grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-2">
              {installedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                    {getProviderIcon(item.provider)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{item.name}</span>
                      <StatusPill tone={item.enabled ? 'success' : 'default'}>
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </StatusPill>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.errorMessage || `${item.provider} integration for workspace sync`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.lastSyncAt ? `Last sync: ${new Date(item.lastSyncAt).toLocaleString()}` : 'No recent sync'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      className={cn(
                        'h-5 w-9 rounded-full border transition-colors',
                        item.enabled ? 'border-accent-green bg-accent-green' : 'border-border bg-muted',
                      )}
                      onClick={() =>
                        updateIntegration.mutate({
                          id: item.id,
                          data: { enabled: !item.enabled },
                        })
                      }
                    >
                      <span
                        className={cn(
                          'block h-4 w-4 rounded-full bg-white transition-transform',
                          item.enabled ? 'translate-x-4' : 'translate-x-0',
                        )}
                      />
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-accent-red hover:bg-accent-red-light hover:text-accent-red"
                      onClick={() => deleteIntegration.mutateAsync(item.id)}
                    >
                      <span className="text-sm">×</span>
                    </Button>
                  </div>
                </div>
              ))}
              {installedItems.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No integrations found.
                </div>
              ) : null}
            </div>
          ) : null}

          {!isLoading && tab === 'marketplace' ? (
            <div className="grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-2">
              {marketplaceItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{item.name}</span>
                      <StatusPill>{item.category}</StatusPill>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.installs.toLocaleString()} installs</p>
                  </div>
                  <Button size="sm" className="h-7 shrink-0 gap-1.5 text-xs">
                    <Download className="h-3 w-3" />
                    Install
                  </Button>
                </div>
              ))}
              {marketplaceItems.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No marketplace plugins found.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}

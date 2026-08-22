/**
 * AiAgentsSection - 设置页「Agent 管理」子页
 * @description 由 ai-hub 的 AgentManagementPage 迁移而来（原路由 /app/ai/agents，2026-08-19 迁入设置页）。
 * 2026-08-20 重构：全量接入后端真实数据（CLI providers / 外部 MCP servers / Skills），
 * 移除 Routing 与 Capability Matrix（无后端数据源）；toolbar 改为标准 SegmentedControl rect 页签
 * （与 SubPageToolbar 同款居中滑块，设置页无需返回按钮）。
 */
import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  Check,
  Copy,
  Globe,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useConfirm } from '@/shared/confirm/use-confirm';
import {
  MCP_TRANSPORTS,
  PROVIDER_DESCRIPTIONS,
  PROVIDER_DISPLAY_NAMES,
  useCliProviders,
  useConfigureCliProvider,
  useCreateMcpServer,
  useDeleteMcpServer,
  useDetectCliProviders,
  useHealthCheckCliProvider,
  useMcpServers,
  useRefreshAllMcpServers,
  useRefreshMcpServer,
  useUpdateMcpServer,
  type CliProviderId,
  type CliProviderStatus,
  type McpServerStatus,
  type McpTransportType,
  type SaveMcpServerRequest,
} from '@/modules/mcp-server';
import { useSkills, useUpdateSkill, type SkillStatus as SkillItem } from '@/modules/skills';
import { useQueryClient } from '@tanstack/react-query';

// ── 页签与状态展示配置 ─────────────────────────────────────────────────────

type TabId = 'overview' | 'mcp' | 'tools' | 'skills';

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'mcp', label: 'MCP Servers', icon: Server },
  { id: 'tools', label: 'CLI Tools', icon: Bot },
  { id: 'skills', label: 'Skills', icon: Zap },
];

/** CLI 安装提示（静态，仅展示） */
const INSTALL_HINTS: Record<CliProviderId, string> = {
  'claude-code': 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex',
  zcode: 'zcode',
};

const STATUS_BADGE: Record<'online' | 'offline' | 'disabled' | 'unknown', string> = {
  online: 'bg-accent-green-light text-accent-green',
  offline: 'bg-accent-red-light text-accent-red',
  disabled: 'bg-muted text-muted-foreground',
  unknown: 'bg-muted/60 text-muted-foreground',
};

function StatusBadge({ status }: { status: 'online' | 'offline' | 'disabled' | 'unknown' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium leading-none',
        STATUS_BADGE[status],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'online' && 'bg-accent-green',
          status === 'offline' && 'bg-accent-red',
          (status === 'disabled' || status === 'unknown') && 'bg-muted-foreground/50',
        )}
      />
      {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : status === 'disabled' ? 'Disabled' : 'Unknown'}
    </span>
  );
}

function cliProviderStatus(p: CliProviderStatus): 'online' | 'offline' | 'disabled' {
  if (!p.enabled) return 'disabled';
  return p.available ? 'online' : 'offline';
}

function mcpServerStatus(s: McpServerStatus): 'online' | 'offline' | 'disabled' | 'unknown' {
  if (!s.enabled) return 'disabled';
  return s.status;
}

function CopyableCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-left font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy"
    >
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {copied ? <Check size={12} className="shrink-0 text-accent-green" /> : <Copy size={12} className="shrink-0" />}
    </button>
  );
}

function LoadingCards({ count = 3, height = 'h-28' }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('w-full', height)} />
      ))}
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────────────────────────────────

export function AiAgentsSection() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const queryClient = useQueryClient();
  const confirmDialog = useConfirm();

  // CLI providers（真实）
  const { data: cliData, isLoading: cliLoading } = useCliProviders();
  const detectMutation = useDetectCliProviders();
  const healthMutation = useHealthCheckCliProvider();
  const configureMutation = useConfigureCliProvider();
  const providers = cliData?.providers ?? [];

  // 外部 MCP servers（真实）
  const { data: mcpData, isLoading: mcpLoading } = useMcpServers();
  const createServerMutation = useCreateMcpServer();
  const updateServerMutation = useUpdateMcpServer();
  const deleteServerMutation = useDeleteMcpServer();
  const refreshServerMutation = useRefreshMcpServer();
  const refreshAllServersMutation = useRefreshAllMcpServers();
  const servers = mcpData?.servers ?? [];

  // Skills（真实）
  const { data: skillsData, isLoading: skillsLoading } = useSkills();
  const updateSkillMutation = useUpdateSkill();
  const skills = skillsData?.skills ?? [];

  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerStatus | null>(null);

  const stats = {
    onlineProviders: providers.filter((p) => cliProviderStatus(p) === 'online').length,
    onlineServers: servers.filter((s) => mcpServerStatus(s) === 'online').length,
    enabledSkills: skills.filter((s) => s.enabled).length,
    errors:
      providers.filter((p) => cliProviderStatus(p) === 'offline').length +
      servers.filter((s) => mcpServerStatus(s) === 'offline').length,
  };

  /** toolbar 右侧：重新探测 CLI + 刷新全部数据 */
  const handleRefreshAll = () => {
    detectMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
        queryClient.invalidateQueries({ queryKey: ['skills'] });
        toast.success('Re-detect complete');
      },
      onError: (err) => toast.error(`Detection failed: ${err instanceof Error ? err.message : 'unknown'}`),
    });
  };

  const handleTestProvider = (provider: CliProviderStatus) => {
    healthMutation.mutate(provider.providerId, {
      onSuccess: (result) => {
        const elapsed = (result.metadata?.lastHealthCheck as { elapsedMs?: number } | undefined)?.elapsedMs;
        if (result.available) {
          toast.success(
            `${PROVIDER_DISPLAY_NAMES[provider.providerId]} is online${elapsed ? ` · ${elapsed}ms` : ''}`,
          );
        } else {
          toast.error(
            `${PROVIDER_DISPLAY_NAMES[provider.providerId]} is offline${result.error ? `: ${result.error}` : ''}`,
          );
        }
      },
      onError: (err) => toast.error(`Health check failed: ${err instanceof Error ? err.message : 'unknown'}`),
    });
  };

  const handleToggleProvider = (provider: CliProviderStatus) => {
    configureMutation.mutate(
      { providerId: provider.providerId, data: { providerId: provider.providerId, enabled: !provider.enabled } },
      {
        onSuccess: () => toast.success(`${PROVIDER_DISPLAY_NAMES[provider.providerId]} ${provider.enabled ? 'disabled' : 'enabled'}`),
        onError: (err) => toast.error(`Update failed: ${err instanceof Error ? err.message : 'unknown'}`),
      },
    );
  };

  const handleDeleteServer = async (server: McpServerStatus) => {
    const ok = await confirmDialog({
      title: `Delete MCP server "${server.name}"?`,
      description: 'The configuration will be removed. This does not affect other servers.',
      variant: 'destructive',
    });
    if (!ok) return;
    deleteServerMutation.mutate(server.id, {
      onSuccess: () => toast.success(`MCP server "${server.name}" deleted`),
      onError: (err) => toast.error(`Delete failed: ${err instanceof Error ? err.message : 'unknown'}`),
    });
  };

  return (
    <PageShell aiPage="ai-hub.agent-management" className="overflow-hidden">
      <PageHeader aiId="ai-hub.agent-management" title="Agent Management" icon={Bot} iconColor="text-accent-purple" />

      {/* 标准 toolbar 行：与 SubPageToolbar 同款三栏 grid + 居中 rect 滑块页签（设置页无需返回按钮） */}
      <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-6 py-2 md:px-7">
        <div className="min-w-0" />
        <div className="justify-self-center">
          <SegmentedControl
            variant="rect"
            value={activeTab}
            onChange={(value) => setActiveTab(value as TabId)}
            options={TABS.map((tab) => ({
              value: tab.id,
              label: tab.label,
              icon: <tab.icon className="size-3.5" strokeWidth={1.75} />,
            }))}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <HeaderActionButton
            variant="outline"
            icon={detectMutation.isPending ? Loader2 : RefreshCw}
            label="Re-detect"
            onClick={handleRefreshAll}
            disabled={detectMutation.isPending}
            data-ai-component="ai-hub.agent-management.redetect-button"
            data-ai-action="ai-hub.agent-management.redetect-button.click"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6" data-ai-component="ai-hub.agent-management.tab" data-ai-tab={activeTab}>
          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            cliLoading || mcpLoading ? (
              <LoadingCards count={4} height="h-24" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <KpiCard label="CLI Providers" value={`${stats.onlineProviders}/${providers.length}`} hint="online" icon={Terminal} />
                  <KpiCard label="MCP Servers" value={`${stats.onlineServers}/${servers.length}`} hint="online" icon={Server} />
                  <KpiCard label="Skills" value={`${stats.enabledSkills}/${skills.length}`} hint="active" icon={Zap} />
                  <KpiCard label="Errors" value={String(stats.errors)} hint={stats.errors > 0 ? 'needs attention' : 'all good'} icon={AlertCircle} danger={stats.errors > 0} />
                </div>

                <Card className="border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">CLI Provider Health</CardTitle>
                    <CardDescription>Local agent CLIs detected on this machine</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      {providers.map((provider) => (
                        <button
                          key={provider.providerId}
                          type="button"
                          onClick={() => setActiveTab('tools')}
                          className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId}</span>
                            <StatusBadge status={cliProviderStatus(provider)} />
                          </div>
                          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                            {provider.version ? `v${provider.version}` : provider.commandPath}
                          </p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">MCP Server Health</CardTitle>
                    <CardDescription>External MCP servers configured for this workspace</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {servers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No MCP servers configured yet — add one from the MCP Servers tab.</p>
                    ) : (
                      <div className="space-y-2">
                        {servers.map((server) => (
                          <button
                            key={server.id}
                            type="button"
                            onClick={() => setActiveTab('mcp')}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{server.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {typeof server.toolCount === 'number' ? `${server.toolCount} tools` : server.transport}
                            </span>
                            <StatusBadge status={mcpServerStatus(server)} />
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )
          )}

          {/* ── MCP Servers ── */}
          {activeTab === 'mcp' && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">External MCP Servers</h2>
                  <p className="text-xs text-muted-foreground">
                    Connect external tool servers via stdio / HTTP / SSE. Status is probed with listTools.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      refreshAllServersMutation.mutate(undefined, {
                        onSuccess: () => toast.success('All MCP servers refreshed'),
                        onError: (err) => toast.error(`Refresh failed: ${err instanceof Error ? err.message : 'unknown'}`),
                      })
                    }
                    disabled={refreshAllServersMutation.isPending || servers.length === 0}
                    className="gap-1.5"
                  >
                    <RefreshCw size={14} className={refreshAllServersMutation.isPending ? 'animate-spin' : ''} />
                    Refresh all
                  </Button>
                  <Button size="sm" onClick={() => { setEditingServer(null); setServerDialogOpen(true); }} className="gap-1.5">
                    <Plus size={14} />
                    Add Server
                  </Button>
                </div>
              </div>

              {mcpLoading ? (
                <LoadingCards count={3} height="h-32" />
              ) : servers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
                  <Server size={20} className="mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No MCP servers configured</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditingServer(null); setServerDialogOpen(true); }}>
                    <Plus size={14} className="mr-1" /> Add your first server
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {servers.map((server) => (
                    <McpServerCard
                      key={server.id}
                      server={server}
                      onRefresh={() =>
                        refreshServerMutation.mutate(server.id, {
                          onSuccess: (result) =>
                            result.status === 'online'
                              ? toast.success(`"${result.name}" online · ${result.toolCount ?? 0} tools · ${result.lastLatencyMs ?? 0}ms`)
                              : toast.error(`"${result.name}" offline${result.lastError ? `: ${result.lastError}` : ''}`),
                          onError: (err) => toast.error(`Probe failed: ${err instanceof Error ? err.message : 'unknown'}`),
                        })
                      }
                      refreshing={refreshServerMutation.isPending && refreshServerMutation.variables === server.id}
                      onToggle={() =>
                        updateServerMutation.mutate(
                          { id: server.id, data: serverToRequest(server, { enabled: !server.enabled }) },
                          {
                            onSuccess: () => toast.success(`"${server.name}" ${server.enabled ? 'disabled' : 'enabled'}`),
                            onError: (err) => toast.error(`Update failed: ${err instanceof Error ? err.message : 'unknown'}`),
                          },
                        )
                      }
                      onEdit={() => { setEditingServer(server); setServerDialogOpen(true); }}
                      onDelete={() => handleDeleteServer(server)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── CLI Tools ── */}
          {activeTab === 'tools' && (
            <>
              <div>
                <h2 className="text-sm font-semibold text-foreground">CLI Tools</h2>
                <p className="text-xs text-muted-foreground">
                  Local agent CLIs detected on this machine. Enable/disable providers, or probe one to test its online status.
                </p>
              </div>
              {cliLoading ? (
                <LoadingCards count={3} height="h-36" />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {providers.map((provider) => (
                    <CliToolCard
                      key={provider.providerId}
                      provider={provider}
                      onTest={() => handleTestProvider(provider)}
                      onToggle={() => handleToggleProvider(provider)}
                      testing={healthMutation.isPending && healthMutation.variables === provider.providerId}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Skills ── */}
          {activeTab === 'skills' && (
            <>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Skills</h2>
                <p className="text-xs text-muted-foreground">Agent skill registry — toggles are persisted on the server.</p>
              </div>
              {skillsLoading ? (
                <LoadingCards count={4} height="h-16" />
              ) : (
                <div className="space-y-5">
                  {Object.entries(
                    skills.reduce<Record<string, SkillItem[]>>((acc, skill) => {
                      (acc[skill.category] ??= []).push(skill);
                      return acc;
                    }, {}),
                  ).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
                      <div className="space-y-2">
                        {items.map((skill) => (
                          <div
                            key={skill.key}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{skill.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{skill.description}</p>
                            </div>
                            <Button
                              variant={skill.enabled ? 'default' : 'outline'}
                              size="sm"
                              disabled={updateSkillMutation.isPending && updateSkillMutation.variables?.key === skill.key}
                              onClick={() =>
                                updateSkillMutation.mutate(
                                  { key: skill.key, data: { enabled: !skill.enabled } },
                                  {
                                    onSuccess: () => toast.success(`Skill "${skill.name}" ${skill.enabled ? 'disabled' : 'enabled'}`),
                                    onError: (err) => toast.error(`Update failed: ${err instanceof Error ? err.message : 'unknown'}`),
                                  },
                                )
                              }
                            >
                              {updateSkillMutation.isPending && updateSkillMutation.variables?.key === skill.key ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : skill.enabled ? (
                                'Enabled'
                              ) : (
                                'Disabled'
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 添加 / 编辑 MCP server */}
      <McpServerDialog
        open={serverDialogOpen}
        onOpenChange={setServerDialogOpen}
        server={editingServer}
        onSubmit={(data) => {
          if (editingServer) {
            updateServerMutation.mutate(
              { id: editingServer.id, data },
              {
                onSuccess: () => { toast.success(`MCP server "${data.name}" updated`); setServerDialogOpen(false); },
                onError: (err) => toast.error(`Update failed: ${err instanceof Error ? err.message : 'unknown'}`),
              },
            );
          } else {
            createServerMutation.mutate(data, {
              onSuccess: (result) => {
                toast.success(
                  result.status === 'online'
                    ? `MCP server "${result.name}" added · online · ${result.toolCount ?? 0} tools`
                    : `MCP server "${result.name}" added, but probe failed${result.lastError ? `: ${result.lastError}` : ''}`,
                );
                setServerDialogOpen(false);
              },
              onError: (err) => toast.error(`Create failed: ${err instanceof Error ? err.message : 'unknown'}`),
            });
          }
        }}
        pending={createServerMutation.isPending || updateServerMutation.isPending}
      />
    </PageShell>
  );
}

// ── 子组件 ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Terminal;
  danger?: boolean;
}) {
  return (
    <Card className="border-border shadow-none" size="sm">
      <CardContent className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', danger ? 'bg-accent-red-light' : 'bg-muted')}>
          <Icon size={16} className={danger ? 'text-accent-red' : 'text-muted-foreground'} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label} · {hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CliToolCard({
  provider,
  onTest,
  onToggle,
  testing,
}: {
  provider: CliProviderStatus;
  onTest: () => void;
  onToggle: () => void;
  testing: boolean;
}) {
  const name = PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId;
  const status = cliProviderStatus(provider);
  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot size={15} className="text-accent-purple" />
            {name}
          </CardTitle>
          <StatusBadge status={status} />
        </div>
        <CardDescription>{PROVIDER_DESCRIPTIONS[provider.providerId] ?? name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {provider.version ? <p className="font-mono">v{provider.version}</p> : null}
          <p className="truncate font-mono" title={provider.commandPath}>{provider.commandPath}</p>
          {provider.model ? <p>model: {provider.model}</p> : null}
        </div>
        {provider.error && status === 'offline' ? (
          <p className="flex items-start gap-1.5 rounded-md bg-accent-red-light/50 p-2 text-xs text-accent-red">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{provider.error}</span>
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onTest} disabled={testing} className="gap-1.5">
            {testing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Test
          </Button>
          <Button variant={provider.enabled ? 'secondary' : 'default'} size="sm" onClick={onToggle}>
            {provider.enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
        <div>
          <p className="mb-1 text-11 font-medium text-muted-foreground">Install</p>
          <CopyableCode text={INSTALL_HINTS[provider.providerId] ?? provider.commandPath} />
        </div>
      </CardContent>
    </Card>
  );
}

function McpServerCard({
  server,
  onRefresh,
  refreshing,
  onToggle,
  onEdit,
  onDelete,
}: {
  server: McpServerStatus;
  onRefresh: () => void;
  refreshing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            {server.transport === 'stdio' ? <Terminal size={15} className="shrink-0 text-accent-blue" /> : <Globe size={15} className="shrink-0 text-accent-blue" />}
            <span className="truncate">{server.name}</span>
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className="text-10 uppercase">{server.transport}</Badge>
            <StatusBadge status={mcpServerStatus(server)} />
          </div>
        </div>
        {server.description ? <CardDescription>{server.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {server.transport === 'stdio' ? (
          <CopyableCode text={[server.command, ...(server.args ?? [])].filter(Boolean).join(' ')} />
        ) : (
          <CopyableCode text={server.url ?? ''} />
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {typeof server.toolCount === 'number' ? <span>{server.toolCount} tools</span> : null}
          {typeof server.lastLatencyMs === 'number' ? <span>{server.lastLatencyMs}ms</span> : null}
          {server.lastPingAt ? <span>probed {new Date(server.lastPingAt).toLocaleString()}</span> : <span>not probed yet</span>}
        </div>
        {server.lastError && server.status === 'offline' ? (
          <p className="flex items-start gap-1.5 rounded-md bg-accent-red-light/50 p-2 text-xs text-accent-red">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{server.lastError}</span>
          </p>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Probe
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil size={13} />
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={onToggle}>
            {server.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="ml-auto text-accent-red hover:bg-accent-red-light/50 hover:text-accent-red">
            <Trash2 size={13} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function serverToRequest(server: McpServerStatus, overrides?: Partial<SaveMcpServerRequest>): SaveMcpServerRequest {
  return {
    name: server.name,
    description: server.description,
    transport: server.transport,
    command: server.command,
    args: server.args,
    env: server.env,
    url: server.url,
    headers: server.headers,
    enabled: server.enabled,
    ...overrides,
  };
}

/** 添加 / 编辑 MCP server 的弹窗表单 */
function McpServerDialog({
  open,
  onOpenChange,
  server,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: McpServerStatus | null;
  onSubmit: (data: SaveMcpServerRequest) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [transport, setTransport] = useState<McpTransportType>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');

  // 打开时用编辑目标初始化（Dialog 保持挂载，key 由 open 控制）
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const initKey = `${server?.id ?? 'new'}:${open}`;
  if (open && initializedFor !== initKey) {
    setInitializedFor(initKey);
    setName(server?.name ?? '');
    setDescription(server?.description ?? '');
    setTransport(server?.transport ?? 'stdio');
    setCommand(server?.command ?? '');
    setArgs((server?.args ?? []).join(' '));
    setUrl(server?.url ?? '');
  }

  const valid =
    name.trim().length > 0 &&
    (transport === 'stdio' ? command.trim().length > 0 : url.trim().length > 0);

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      transport,
      ...(transport === 'stdio'
        ? { command: command.trim(), args: args.trim() ? args.trim().split(/\s+/) : undefined }
        : { url: url.trim() }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{server ? 'Edit MCP Server' : 'Add MCP Server'}</DialogTitle>
          <DialogDescription>
            stdio runs a local command; http/sse connect to a remote endpoint. The server is probed on save.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="filesystem" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Transport</label>
            <SegmentedControl
              value={transport}
              onChange={(value) => setTransport(value as McpTransportType)}
              options={MCP_TRANSPORTS.map((item) => ({ value: item, label: item.toUpperCase() }))}
            />
          </div>
          {transport === 'stdio' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Command</label>
                <Input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Arguments</label>
                <Input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem ." className="font-mono" />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Endpoint URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" className="font-mono" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!valid || pending} className="gap-1.5">
            {pending ? <Loader2 size={13} className="animate-spin" /> : null}
            {server ? 'Save & Probe' : 'Add & Probe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

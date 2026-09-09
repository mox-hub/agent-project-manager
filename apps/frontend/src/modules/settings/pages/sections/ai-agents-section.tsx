/**
 * AiAgentsSection - 设置页「Agent 管理」子页
 * @description 由 ai-hub 的 AgentManagementPage 迁移而来（原路由 /app/ai/agents，2026-08-19 迁入设置页）。
 * 2026-08-20 重构：全量接入后端真实数据（CLI providers / 外部 MCP servers / Skills），
 * 移除 Routing 与 Capability Matrix（无后端数据源）；toolbar 改为标准 SegmentedControl rect 页签
 * （与 SubPageToolbar 同款居中滑块，设置页无需返回按钮）。
 */
import { useEffect, useState } from 'react';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Activity,
  AlertCircle,
  Bot,
  Check,
  Copy,
  FileInput,
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
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
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
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { Textarea } from '@/components/ui/textarea';
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
import {
  skillsApi,
  useCreateSkill,
  useDeleteSkill,
  useImportSkill,
  useSkills,
  useUpdateSkill,
  type CreateSkillRequest,
  type ImportSkillRequest,
  type SkillStatus as SkillItem,
  type UpdateSkillRequest,
} from '@/modules/skills';
import { useQueryClient } from '@tanstack/react-query';

// ── 页签与状态展示配置 ─────────────────────────────────────────────────────

type TabId = 'overview' | 'mcp' | 'tools' | 'skills';

// label 存 i18n key（渲染时经 t() 取文案）
const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'aiHub.overview', icon: Activity },
  { id: 'mcp', label: 'aiHub.mcpServers', icon: Server },
  { id: 'tools', label: 'aiHub.cliTools', icon: Bot },
  { id: 'skills', label: 'aiHub.skills', icon: Zap },
];

/** CLI 安装提示（静态命令，仅展示，不做 i18n 翻译） */
const INSTALL_HINTS: Record<CliProviderId, string> = {
  'claude-code': 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex',
  zcode: 'zcode',
};

function StatusBadge({ status }: { status: 'online' | 'offline' | 'disabled' | 'unknown' }) {
  const { t } = useTranslation();
  const tone = status === 'online' ? 'success' : status === 'offline' ? 'danger' : 'default';
  const labelMap = {
    online: t('aiHub.statusOnline'),
    offline: t('aiHub.statusOffline'),
    disabled: t('aiHub.disabled'),
    unknown: t('aiHub.statusUnknown'),
  } as const;
  return (
    <StatusPill tone={tone} className="gap-1.5">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'online' && 'bg-accent-green',
          status === 'offline' && 'bg-accent-red',
          (status === 'disabled' || status === 'unknown') && 'bg-muted-foreground/50',
        )}
      />
      {labelMap[status]}
    </StatusPill>
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
  const { t } = useTranslation();
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
      title={t('aiHub.copy')}
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
  const { t } = useTranslation();
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
  const createSkillMutation = useCreateSkill();
  const importSkillMutation = useImportSkill();
  const deleteSkillMutation = useDeleteSkill();
  const skills = skillsData?.skills ?? [];

  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerStatus | null>(null);
  const [skillDialog, setSkillDialog] = useState<{
    mode: 'create' | 'import' | 'edit';
    skill: SkillItem | null;
  } | null>(null);

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
        toast.success(t('aiHub.detectComplete'));
      },
      onError: (err) => toast.error(t('aiHub.detectFailed', { message: err instanceof Error ? err.message : t('common.unknown') })),
    });
  };

  const handleTestProvider = (provider: CliProviderStatus) => {
    const name = PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId;
    healthMutation.mutate(provider.providerId, {
      onSuccess: (result) => {
        const elapsed = (result.metadata?.lastHealthCheck as { elapsedMs?: number } | undefined)?.elapsedMs;
        if (result.available) {
          if (elapsed !== undefined) {
            toast.success(t('aiHub.providerOnlineMsToast', { name, ms: elapsed }));
          } else {
            toast.success(t('aiHub.providerOnlineToast', { name }));
          }
        } else if (result.error) {
          toast.error(t('aiHub.providerOfflineErrToast', { name, message: result.error }));
        } else {
          toast.error(t('aiHub.providerOfflineToast', { name }));
        }
      },
      onError: (err) => toast.error(t('aiHub.healthCheckFailed', { message: err instanceof Error ? err.message : t('common.unknown') })),
    });
  };

  const handleToggleProvider = (provider: CliProviderStatus) => {
    const name = PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId;
    configureMutation.mutate(
      { providerId: provider.providerId, data: { providerId: provider.providerId, enabled: !provider.enabled } },
      {
        onSuccess: () => toast.success(t(provider.enabled ? 'aiHub.toggleOffToast' : 'aiHub.toggleOnToast', { name })),
        onError: (err) => toast.error(t('aiHub.updateFailed', { message: err instanceof Error ? err.message : t('common.unknown') })),
      },
    );
  };

  const handleDeleteServer = async (server: McpServerStatus) => {
    const ok = await confirmDialog({
      title: t('aiHub.deleteServerTitle', { name: server.name }),
      description: t('aiHub.deleteServerDesc'),
      variant: 'destructive',
    });
    if (!ok) return;
    deleteServerMutation.mutate(server.id, {
      onSuccess: () => toast.success(t('aiHub.serverDeletedToast', { name: server.name })),
      onError: (err) => toast.error(t('aiHub.deleteFailed', { message: err instanceof Error ? err.message : t('common.unknown') })),
    });
  };

  const failMessage = (err: unknown) =>
    err instanceof Error ? err.message : t('common.unknown');

  const handleDeleteSkill = async (skill: SkillItem) => {
    const ok = await confirmDialog({
      title: t('aiHub.skillDeleteTitle', { name: skill.name }),
      description: t('aiHub.skillDeleteDesc'),
      variant: 'destructive',
    });
    if (!ok) return;
    deleteSkillMutation.mutate(skill.key, {
      onSuccess: () => toast.success(t('aiHub.skillDeletedToast', { name: skill.name })),
      onError: (err) => toast.error(t('aiHub.deleteFailed', { message: failMessage(err) })),
    });
  };

  return (
    <PageShell aiPage="ai-hub.agent-management" className="overflow-hidden">
      <PageHeader aiId="ai-hub.agent-management" title={t('aiHub.agentManagementTitle')} icon={Bot} iconColor="text-accent-purple" />

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
              label: t(tab.label),
              icon: <tab.icon className="size-3.5" strokeWidth={1.75} />,
            }))}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <HeaderActionButton
            variant="outline"
            icon={detectMutation.isPending ? Loader2 : RefreshCw}
            label={t('aiHub.redetect')}
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
                  <KpiCard label={t('aiHub.cliProviders')} value={`${stats.onlineProviders}/${providers.length}`} hint={t('aiHub.statusOnline')} icon={Terminal} />
                  <KpiCard label={t('aiHub.mcpServers')} value={`${stats.onlineServers}/${servers.length}`} hint={t('aiHub.statusOnline')} icon={Server} />
                  <KpiCard label={t('aiHub.skills')} value={`${stats.enabledSkills}/${skills.length}`} hint={t('aiHub.active')} icon={Zap} />
                  <KpiCard label={t('aiHub.kpiErrors')} value={String(stats.errors)} hint={stats.errors > 0 ? t('aiHub.needsAttention') : t('aiHub.allGood')} icon={AlertCircle} danger={stats.errors > 0} />
                </div>

                <Card className="border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">{t('aiHub.cliHealthTitle')}</CardTitle>
                    <CardDescription>{t('aiHub.cliHealthDesc')}</CardDescription>
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
                    <CardTitle className="text-base">{t('aiHub.mcpHealthTitle')}</CardTitle>
                    <CardDescription>{t('aiHub.mcpHealthDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {servers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('aiHub.mcpHealthEmpty')}</p>
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
                              {typeof server.toolCount === 'number' ? t('aiHub.toolsCount', { count: server.toolCount }) : server.transport}
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
                  <h2 className="text-sm font-semibold text-foreground">{t('aiHub.externalMcpTitle')}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t('aiHub.externalMcpDesc')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      refreshAllServersMutation.mutate(undefined, {
                        onSuccess: () => toast.success(t('aiHub.refreshedAllToast')),
                        onError: (err) => toast.error(t('aiHub.refreshFailed', { message: failMessage(err) })),
                      })
                    }
                    disabled={refreshAllServersMutation.isPending || servers.length === 0}
                    className="gap-1.5"
                  >
                    <RefreshCw size={14} className={refreshAllServersMutation.isPending ? 'animate-spin' : ''} />
                    {t('aiHub.refreshAll')}
                  </Button>
                  <Button size="sm" onClick={() => { setEditingServer(null); setServerDialogOpen(true); }} className="gap-1.5">
                    <Plus size={14} />
                    {t('aiHub.addServer')}
                  </Button>
                </div>
              </div>

              {mcpLoading ? (
                <LoadingCards count={3} height="h-32" />
              ) : servers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
                  <Server size={20} className="mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">{t('aiHub.noMcpServers')}</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditingServer(null); setServerDialogOpen(true); }}>
                    <Plus size={14} className="mr-1" /> {t('aiHub.addFirstServer')}
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
                          onSuccess: (result) => {
                            if (result.status === 'online') {
                              toast.success(t('aiHub.serverOnlineToast', { name: result.name, tools: result.toolCount ?? 0, ms: result.lastLatencyMs ?? 0 }));
                            } else if (result.lastError) {
                              toast.error(t('aiHub.serverOfflineErrToast', { name: result.name, message: result.lastError }));
                            } else {
                              toast.error(t('aiHub.serverOfflineToast', { name: result.name }));
                            }
                          },
                          onError: (err) => toast.error(t('aiHub.serverProbeFailed', { message: failMessage(err) })),
                        })
                      }
                      refreshing={refreshServerMutation.isPending && refreshServerMutation.variables === server.id}
                      onToggle={() =>
                        updateServerMutation.mutate(
                          { id: server.id, data: serverToRequest(server, { enabled: !server.enabled }) },
                          {
                            onSuccess: () => toast.success(t(server.enabled ? 'aiHub.toggleOffToast' : 'aiHub.toggleOnToast', { name: server.name })),
                            onError: (err) => toast.error(t('aiHub.updateFailed', { message: failMessage(err) })),
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
                <h2 className="text-sm font-semibold text-foreground">{t('aiHub.cliTools')}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('aiHub.cliToolsDesc')}
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{t('aiHub.skills')}</h2>
                  <p className="text-xs text-muted-foreground">{t('aiHub.skillsRegistryDesc')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSkillDialog({ mode: 'import', skill: null })}
                  >
                    <FileInput size={14} />
                    {t('aiHub.skillImport')}
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => setSkillDialog({ mode: 'create', skill: null })}>
                    <Plus size={14} />
                    {t('aiHub.skillCreate')}
                  </Button>
                </div>
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
                              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                                {skill.name}
                                <Badge variant="outline" className="shrink-0 text-10 uppercase">
                                  {skill.source}
                                </Badge>
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{skill.description}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Button
                                variant={skill.enabled ? 'default' : 'outline'}
                                size="sm"
                                disabled={updateSkillMutation.isPending && updateSkillMutation.variables?.key === skill.key}
                                onClick={() =>
                                  updateSkillMutation.mutate(
                                    { key: skill.key, data: { enabled: !skill.enabled } },
                                    {
                                      onSuccess: () => toast.success(t(skill.enabled ? 'aiHub.skillToggledOffToast' : 'aiHub.skillToggledOnToast', { name: skill.name })),
                                      onError: (err) => toast.error(t('aiHub.updateFailed', { message: failMessage(err) })),
                                    },
                                  )
                                }
                              >
                                {updateSkillMutation.isPending && updateSkillMutation.variables?.key === skill.key ? (
                                  <Spinner className="size-3.5 text-inherit" />
                                ) : skill.enabled ? (
                                  t('aiHub.enabled')
                                ) : (
                                  t('aiHub.disabled')
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 px-2"
                                aria-label={t('common.edit')}
                                onClick={() => setSkillDialog({ mode: 'edit', skill })}
                              >
                                <Pencil size={13} />
                              </Button>
                              {skill.source === 'custom' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="px-2 text-accent-red hover:bg-accent-red-light/50 hover:text-accent-red"
                                  aria-label={t('common.delete')}
                                  onClick={() => handleDeleteSkill(skill)}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              ) : null}
                            </div>
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
                onSuccess: () => { toast.success(t('aiHub.serverUpdatedToast', { name: data.name })); setServerDialogOpen(false); },
                onError: (err) => toast.error(t('aiHub.updateFailed', { message: failMessage(err) })),
              },
            );
          } else {
            createServerMutation.mutate(data, {
              onSuccess: (result) => {
                if (result.status === 'online') {
                  toast.success(t('aiHub.serverCreatedOnlineToast', { name: result.name, tools: result.toolCount ?? 0 }));
                } else {
                  toast.error(t('aiHub.serverCreatedProbeFailToast', { name: result.name, message: result.lastError || t('common.unknown') }));
                }
                setServerDialogOpen(false);
              },
              onError: (err) => toast.error(t('aiHub.createFailed', { message: failMessage(err) })),
            });
          }
        }}
        pending={createServerMutation.isPending || updateServerMutation.isPending}
      />

      {/* 新建 / 导入 / 编辑技能 */}
      <SkillDialog
        dialog={skillDialog}
        onClose={() => setSkillDialog(null)}
        onCreate={(data) =>
          createSkillMutation.mutate(data, {
            onSuccess: (result) => { toast.success(t('aiHub.skillCreatedToast', { name: result.name })); setSkillDialog(null); },
            onError: (err) => toast.error(t('aiHub.createFailed', { message: failMessage(err) })),
          })
        }
        onImport={(data) =>
          importSkillMutation.mutate(data, {
            onSuccess: (result) => { toast.success(t('aiHub.skillImportedToast', { name: result.name })); setSkillDialog(null); },
            onError: (err) => toast.error(t('aiHub.createFailed', { message: failMessage(err) })),
          })
        }
        onEdit={(key, data) =>
          updateSkillMutation.mutate(
            { key, data },
            {
              onSuccess: (result) => { toast.success(t('aiHub.skillUpdatedToast', { name: result.name })); setSkillDialog(null); },
              onError: (err) => toast.error(t('aiHub.updateFailed', { message: failMessage(err) })),
            },
          )
        }
        pending={createSkillMutation.isPending || importSkillMutation.isPending || updateSkillMutation.isPending}
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
  const { t } = useTranslation();
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
          {provider.model ? <p>{t('aiHub.modelLabel')}: {provider.model}</p> : null}
        </div>
        {provider.error && status === 'offline' ? (
          <p className="flex items-start gap-1.5 rounded-md bg-accent-red-light/50 p-2 text-xs text-accent-red">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{provider.error}</span>
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onTest} disabled={testing} className="gap-1.5">
            {testing ? <Spinner className="size-3.5 text-inherit" /> : <RefreshCw size={13} />}
            {t('aiHub.test')}
          </Button>
          <Button variant={provider.enabled ? 'secondary' : 'default'} size="sm" onClick={onToggle}>
            {provider.enabled ? t('aiHub.disable') : t('aiHub.enable')}
          </Button>
        </div>
        <div>
          <p className="mb-1 text-11 font-medium text-muted-foreground">{t('aiHub.install')}</p>
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
  const { t } = useTranslation();
  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            {server.transport === 'stdio' ? <Terminal size={15} className="shrink-0 text-accent-blue" /> : <Globe size={15} className="shrink-0 text-accent-blue" />}
            <span className="truncate">{server.name}</span>
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className="text-xs uppercase">{server.transport}</Badge>
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
          {typeof server.toolCount === 'number' ? <span>{t('aiHub.toolsCount', { count: server.toolCount })}</span> : null}
          {typeof server.lastLatencyMs === 'number' ? <span>{server.lastLatencyMs}ms</span> : null}
          {server.lastPingAt ? <span>{t('aiHub.probedAt', { time: new Date(server.lastPingAt).toLocaleString() })}</span> : <span>{t('aiHub.notProbed')}</span>}
        </div>
        {server.lastError && server.status === 'offline' ? (
          <p className="flex items-start gap-1.5 rounded-md bg-accent-red-light/50 p-2 text-xs text-accent-red">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{server.lastError}</span>
          </p>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Spinner className="size-3.5 text-inherit" /> : <RefreshCw size={13} />}
            {t('aiHub.probe')}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil size={13} />
            {t('common.edit')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onToggle}>
            {server.enabled ? t('aiHub.disable') : t('aiHub.enable')}
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
  const { t } = useTranslation();
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
          <DialogTitle>{server ? t('aiHub.editServerTitle') : t('aiHub.addServerTitle')}</DialogTitle>
          <DialogDescription>
            {t('aiHub.mcpDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{t('aiHub.mcpFieldName')}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="filesystem" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{t('aiHub.mcpFieldDescription')}</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('aiHub.mcpOptionalDescription')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{t('aiHub.mcpFieldTransport')}</label>
            <SegmentedControl
              value={transport}
              onChange={(value) => setTransport(value as McpTransportType)}
              options={MCP_TRANSPORTS.map((item) => ({ value: item, label: item.toUpperCase() }))}
            />
          </div>
          {transport === 'stdio' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t('aiHub.mcpFieldCommand')}</label>
                <Input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t('aiHub.mcpFieldArgs')}</label>
                <Input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem ." className="font-mono" />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('aiHub.mcpFieldUrl')}</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" className="font-mono" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!valid || pending} className="gap-1.5">
            {pending ? <Spinner className="size-3.5 text-inherit" /> : null}
            {server ? t('aiHub.saveProbe') : t('aiHub.addProbe')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 新建 / 本地导入 / 编辑技能的弹窗表单（edit 模式拉详情回填指令正文） */
function SkillDialog({
  dialog,
  onClose,
  onCreate,
  onImport,
  onEdit,
  pending,
}: {
  dialog: { mode: 'create' | 'import' | 'edit'; skill: SkillItem | null } | null;
  onClose: () => void;
  onCreate: (data: CreateSkillRequest) => void;
  onImport: (data: ImportSkillRequest) => void;
  onEdit: (key: string, data: UpdateSkillRequest) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const open = dialog !== null;
  const mode = dialog?.mode ?? 'create';
  const editing = dialog?.skill ?? null;

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  // 打开时初始化；edit 模式异步拉详情回填指令正文
  useEffect(() => {
    if (!open) return;
    const initKey = `${mode}:${editing?.key ?? 'new'}:${open}`;
    if (initializedFor === initKey) return;
    setInitializedFor(initKey);
    setKey(editing?.key ?? '');
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setCategory(editing?.category ?? '');
    setContent('');
    setSourcePath('');
    if (mode === 'edit' && editing) {
      let cancelled = false;
      skillsApi.getSkill(editing.key).then(
        (detail) => {
          if (!cancelled) setContent(detail.content ?? '');
        },
        () => undefined,
      );
      return () => {
        cancelled = true;
      };
    }
  }, [open, mode, editing, initializedFor]);

  const keyValid = /^[a-z0-9][a-z0-9-]*$/.test(key);
  const valid =
    mode === 'import'
      ? sourcePath.trim().length > 0
      : mode === 'edit'
        ? name.trim().length > 0
        : name.trim().length > 0 && keyValid;

  const handleSubmit = () => {
    if (!valid) return;
    if (mode === 'create') {
      onCreate({
        key: key.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        content: content.trim() || undefined,
      });
    } else if (mode === 'import') {
      onImport({
        sourcePath: sourcePath.trim(),
        key: key.trim() || undefined,
        name: name.trim() || undefined,
        category: category.trim() || undefined,
      });
    } else if (editing) {
      onEdit(editing.key, {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        content: content.trim() || undefined,
      });
    }
  };

  const titleKey =
    mode === 'create' ? 'aiHub.skillCreateTitle' : mode === 'import' ? 'aiHub.skillImportTitle' : 'aiHub.skillEditTitle';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>
            {mode === 'import' ? t('aiHub.skillImportDesc') : t('aiHub.skillDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {mode === 'import' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldSourcePath')}</label>
              <Input
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="C:\skills\grill-me\SKILL.md"
                className="font-mono"
              />
            </div>
          ) : null}
          {mode !== 'edit' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t('aiHub.skillFieldKey')}
                {mode === 'import' ? `（${t('aiHub.skillOptional')}）` : ''}
              </label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={mode === 'import' ? t('aiHub.skillKeyFromPath') : 'my-skill'}
                className="font-mono"
              />
              {mode === 'create' && key.length > 0 && !keyValid ? (
                <p className="text-xs text-accent-red">{t('aiHub.skillKeyInvalid')}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t('aiHub.skillFieldName')}
              {mode === 'import' ? `（${t('aiHub.skillOptional')}）` : ''}
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grilling 需求拷问" />
          </div>
          {mode !== 'import' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldDescription')}</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('aiHub.mcpOptionalDescription')} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldCategory')}</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Development" />
          </div>
          {mode !== 'import' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldContent')}</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="font-mono text-xs"
                placeholder={t('aiHub.skillContentPlaceholder')}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!valid || pending} className="gap-1.5">
            {pending ? <Spinner className="size-3.5 text-inherit" /> : null}
            {mode === 'import' ? t('aiHub.skillImportAction') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

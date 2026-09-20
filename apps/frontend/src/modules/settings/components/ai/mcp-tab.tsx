/**
 * MCP 服务 Tab —— 外部 MCP 服务器注册表（新增 / 编辑 / 删除 / 探活 / 启停）。
 * @description 由原 ai-agents-section mcp 页签迁移（2026-09-19 页面合并）。
 */
import { useState } from 'react';
import { AlertCircle, Globe, Pencil, Plus, RefreshCw, Server, Terminal, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/shared/confirm/use-confirm';
import {
  MCP_TRANSPORTS,
  useCreateMcpServer,
  useDeleteMcpServer,
  useMcpServers,
  useRefreshAllMcpServers,
  useRefreshMcpServer,
  useUpdateMcpServer,
  type McpServerStatus,
  type McpTransportType,
  type SaveMcpServerRequest,
} from '@/modules/mcp-server';

function mcpServerStatus(s: McpServerStatus): 'online' | 'offline' | 'disabled' | 'unknown' {
  if (!s.enabled) return 'disabled';
  return s.status;
}

function McpStatusBadge({ status }: { status: 'online' | 'offline' | 'disabled' | 'unknown' }) {
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
            <McpStatusBadge status={mcpServerStatus(server)} />
          </div>
        </div>
        {server.description ? <CardDescription>{server.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="truncate rounded-md border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
          {server.transport === 'stdio'
            ? [server.command, ...(server.args ?? [])].filter(Boolean).join(' ')
            : server.url}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {typeof server.toolCount === 'number' ? <span>{t('aiHub.toolsCount', { count: server.toolCount })}</span> : null}
          {typeof server.lastLatencyMs === 'number' ? <span>{server.lastLatencyMs}ms</span> : null}
          {server.lastPingAt ? (
            <span>{t('aiHub.probedAt', { time: new Date(server.lastPingAt).toLocaleString() })}</span>
          ) : (
            <span>{t('aiHub.notProbed')}</span>
          )}
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
          <DialogDescription>{t('aiHub.mcpDialogDesc')}</DialogDescription>
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

export function McpTab() {
  const { t } = useTranslation();
  const confirmDialog = useConfirm();

  const { data: mcpData, isLoading: mcpLoading } = useMcpServers();
  const createServerMutation = useCreateMcpServer();
  const updateServerMutation = useUpdateMcpServer();
  const deleteServerMutation = useDeleteMcpServer();
  const refreshServerMutation = useRefreshMcpServer();
  const refreshAllServersMutation = useRefreshAllMcpServers();
  const servers = mcpData?.servers ?? [];

  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerStatus | null>(null);

  const failMessage = (err: unknown) => (err instanceof Error ? err.message : t('common.unknown'));

  const handleDeleteServer = async (server: McpServerStatus) => {
    const ok = await confirmDialog({
      title: t('aiHub.deleteServerTitle', { name: server.name }),
      description: t('aiHub.deleteServerDesc'),
      variant: 'destructive',
    });
    if (!ok) return;
    deleteServerMutation.mutate(server.id, {
      onSuccess: () => toast.success(t('aiHub.serverDeletedToast', { name: server.name })),
      onError: (err) => toast.error(t('aiHub.deleteFailed', { message: failMessage(err) })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('aiHub.externalMcpTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('aiHub.externalMcpDesc')}</p>
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
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
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
                onSuccess: () => {
                  toast.success(t('aiHub.serverUpdatedToast', { name: data.name }));
                  setServerDialogOpen(false);
                },
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
    </div>
  );
}

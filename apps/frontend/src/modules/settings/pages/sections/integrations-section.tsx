/**
 * IntegrationsSettingsSection - 设置页「集成管理」子页
 * @description 由 integration 模块的 IntegrationListPage 迁移而来（原路由 /app/integrations，2026-08-19 迁入设置页）
 * 头部已改造为标准 PageHeader + SegmentedControl 工具栏
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plug2,
  Search,
  Check,
  X,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Settings,
  Zap,
  AlertTriangle,
  ArrowRight,
  Globe,
  Lock,
  Webhook,
  Activity,
  Clock,
  Shield,
  GitPullRequest,
  FolderKanban,
  Bug,
  FileText,
  Users,
  BarChart3,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useIntegrations, useDeleteIntegration } from '@/modules/integration/hooks/use-integrations';
import type { IntegrationConfig } from '@/modules/integration/api/integration-api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/components/ui/toast';
import { LinearConfigForm } from '@/modules/linear/components/linear-config-form';

// ── Types ──────────────────────────────────────────────────────────────────────
type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';
type IntegrationCategory = 'task' | 'code' | 'monitoring' | 'communication';
type FilterTab = 'all' | IntegrationCategory;

interface IntegrationFeature {
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
}

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  task: 'Task Providers',
  code: 'Code & PR Sync',
  monitoring: 'Monitoring',
  communication: 'Communication',
};

const CATEGORY_ORDER: IntegrationCategory[] = ['task', 'code', 'communication', 'monitoring'];

const STATUS_CFG: Record<ConnectionStatus, { label: string; color: string; dot: string; bg: string }> = {
  connected: {
    label: 'Connected',
    color: 'text-accent-green',
    dot: 'bg-accent-green',
    bg: 'bg-accent-green/10 border-accent-green/30',
  },
  disconnected: {
    label: 'Not connected',
    color: 'text-muted-foreground',
    dot: 'bg-muted-foreground/40',
    bg: 'bg-muted/40 border-border',
  },
  error: {
    label: 'Error',
    color: 'text-destructive',
    dot: 'bg-destructive',
    bg: 'bg-destructive/10 border-destructive/30',
  },
  pending: {
    label: 'Connecting…',
    color: 'text-accent-yellow',
    dot: 'bg-accent-yellow',
    bg: 'bg-accent-yellow/10 border-accent-yellow/30',
  },
};

// ── Mock data for demo (matches Figma design) ─────────────────────────────────

// 供应商目录（展示性元数据）；连接状态一律来自真实 /integrations 配置（宪法 §9）
const INTEGRATION_CATALOG: Array<{
  id: string;
  name: string;
  logo: string;
  logoColor: string;
  description: string;
  longDescription: string;
  category: IntegrationCategory;
  features: IntegrationFeature[];
  docsUrl: string;
}> = [
  {
    id: 'linear',
    name: 'Linear',
    logo: 'L',
    logoColor: '#5E6AD2',
    description: 'Sync issues, cycles, and projects from Linear into AgentPM tasks.',
    longDescription:
      'Connect your Linear workspace to import and two-way sync issues as tasks. AI agents can create Linear issues directly, and acceptance results are posted back as issue comments.',
    category: 'task',
    features: [
      { icon: FolderKanban, label: 'Issue sync', description: 'Import and sync Linear issues as AgentPM tasks', enabled: true },
      { icon: ArrowRight, label: 'Two-way sync', description: 'Changes in either system propagate automatically', enabled: true },
      { icon: Zap, label: 'AI issue creation', description: 'Agents can create Linear issues directly', enabled: true },
      { icon: FileText, label: 'Comment sync', description: 'Acceptance results posted as Linear comments', enabled: false },
      { icon: Users, label: 'Member mapping', description: 'Map Linear members to AgentPM team members', enabled: true },
      { icon: BarChart3, label: 'Cycle tracking', description: 'Import cycle progress into milestone view', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/linear',
  },
  {
    id: 'jira',
    name: 'Jira',
    logo: 'J',
    logoColor: '#0052CC',
    description: 'Import Jira tickets and epics; push AI-generated work back to your board.',
    longDescription:
      'Use your Jira Cloud or Data Center instance as a task source. Import epics, stories, and bugs. AI agents execute work tracked in Jira and post results as comments.',
    category: 'task',
    features: [
      { icon: FolderKanban, label: 'Ticket import', description: 'Import Jira epics, stories, and bugs as tasks', enabled: true },
      { icon: ArrowRight, label: 'Status sync', description: 'Sync Jira workflow statuses to AgentPM', enabled: true },
      { icon: Zap, label: 'AI ticket creation', description: 'Agents can create and update Jira tickets', enabled: false },
      { icon: FileText, label: 'Comment sync', description: 'Post acceptance results as Jira issue comments', enabled: false },
      { icon: Users, label: 'Assignee mapping', description: 'Map Jira users to AgentPM team members', enabled: true },
      { icon: Bug, label: 'Bug tracking', description: 'Import Jira bug reports into AgentPM bug list', enabled: true },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/jira',
  },
  {
    id: 'github',
    name: 'GitHub',
    logo: 'G',
    logoColor: '#24292E',
    description: 'Sync repositories, pull requests, and CI status. Link PRs to tasks automatically.',
    longDescription:
      'Connect GitHub to track pull requests, code reviews, and CI/CD runs. AI agents can open PRs, request reviews, and monitor build status in real time.',
    category: 'code',
    features: [
      { icon: GitPullRequest, label: 'PR sync', description: 'Link pull requests to tasks automatically', enabled: true },
      { icon: Zap, label: 'AI PR creation', description: 'Agents can open and update pull requests', enabled: true },
      { icon: Shield, label: 'Branch rules', description: 'Enforce branch protection via AgentPM policies', enabled: false },
      { icon: Activity, label: 'CI status', description: 'Show CI/CD build status on task cards', enabled: true },
      { icon: Webhook, label: 'Webhooks', description: 'Real-time push events via GitHub webhook', enabled: true },
      { icon: FileText, label: 'Review comments', description: 'Post acceptance audit results as PR comments', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/github',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    logo: 'GL',
    logoColor: '#FC6D26',
    description: 'Sync GitLab MRs and pipelines. Works with self-hosted and GitLab.com.',
    longDescription:
      'Integrate GitLab to manage merge requests, monitor pipelines, and keep your code and tasks in sync. Supports GitLab.com and self-hosted instances.',
    category: 'code',
    features: [
      { icon: GitPullRequest, label: 'MR sync', description: 'Sync merge requests to AgentPM task timeline', enabled: true },
      { icon: Zap, label: 'AI MR creation', description: 'Agents can open and update merge requests', enabled: false },
      { icon: Activity, label: 'Pipeline status', description: 'Track GitLab CI/CD pipeline status on tasks', enabled: true },
      { icon: Webhook, label: 'Webhooks', description: 'Real-time push events via GitLab webhook', enabled: true },
      { icon: Lock, label: 'Self-hosted', description: 'Connect your GitLab CE/EE instance via PAT', enabled: false },
      { icon: FileText, label: 'MR discussions', description: 'Post acceptance results as MR discussion threads', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/gitlab',
  },
  {
    id: 'slack',
    name: 'Slack',
    logo: 'S',
    logoColor: '#4A154B',
    description: 'Send task updates, AI execution alerts, and acceptance results to Slack channels.',
    longDescription:
      'Post notifications to your Slack workspace when tasks change status, AI agents complete runs, or acceptances are approved or rejected.',
    category: 'communication',
    features: [
      { icon: Activity, label: 'Task notifications', description: 'Post task status changes to chosen channels', enabled: true },
      { icon: Zap, label: 'AI run alerts', description: 'Alert when AI agents start or complete runs', enabled: true },
      { icon: Shield, label: 'Acceptance alerts', description: 'Post approval/rejection to a review channel', enabled: false },
      { icon: Clock, label: 'Daily digest', description: 'Send a morning digest of project activity', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/slack',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    logo: 'SE',
    logoColor: '#362D59',
    description: 'Turn Sentry error alerts into AgentPM bugs automatically.',
    longDescription:
      'Connect Sentry to automatically create bug reports from error events. AI agents can investigate stack traces and propose fixes.',
    category: 'monitoring',
    features: [
      { icon: Bug, label: 'Auto bug creation', description: 'Create bugs from Sentry error events automatically', enabled: true },
      { icon: Zap, label: 'AI diagnosis', description: 'Agents analyze stack traces and suggest root causes', enabled: false },
      { icon: Activity, label: 'Error trends', description: 'Surface error frequency on project health dashboard', enabled: true },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/sentry',
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function LogoBadge({ logo, color, size = 'md' }: { logo: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-7 h-7 text-10' : 'w-10 h-10 text-xs';
  return (
    <div
      className={cn('rounded-xl font-bold text-white flex items-center justify-center shrink-0', dim)}
      style={{ backgroundColor: color }}
    >
      {logo}
    </div>
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-11 font-medium px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          cfg.dot,
          (status === 'pending' || status === 'error') && 'animate-pulse',
        )}
      />
      {cfg.label}
    </span>
  );
}

function FeatureToggle({ feature }: { feature: IntegrationFeature }) {
  const Icon = feature.icon;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{feature.label}</p>
        <p className="text-11 text-muted-foreground mt-0.5 leading-relaxed">{feature.description}</p>
      </div>
      <div
        className={cn(
          'relative shrink-0 w-8 h-4.5 rounded-full border transition-all duration-200 mt-0.5',
          feature.enabled ? 'bg-primary border-primary' : 'bg-transparent border-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-3.5 h-3.5 rounded-full shadow-xs transition-all duration-200',
            feature.enabled ? 'left-4 bg-white' : 'left-0.5 bg-muted-foreground/40',
          )}
        />
      </div>
    </div>
  );
}

interface IntegrationCardProps {
  integration: (typeof INTEGRATION_CATALOG)[number];
  /** 父层解析好的真实连接状态（来自 /integrations 配置） */
  status: ConnectionStatus;
  connectedAs?: string;
  lastSync?: string;
  /** 提供即渲染 Connect 按钮（linear = 打开真实连接弹窗；无真实流程的供应商不提供） */
  onConnect?: () => void;
  /** 提供即渲染 Disconnect（存在真实配置时） */
  onDisconnect?: () => void;
  onConfigure?: () => void;
}

function IntegrationCard({ integration, status, connectedAs, lastSync, onConnect, onDisconnect, onConfigure }: IntegrationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleConnect = () => onConnect?.();
  const handleDisconnect = () => onDisconnect?.();

  const enabledCount = integration.features.filter((f) => f.enabled).length;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        status === 'connected' ? 'border-border bg-card' : status === 'error' ? 'border-destructive/30 bg-card' : 'border-border/60 bg-card/60',
      )}
    >
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <LogoBadge logo={integration.logo} color={integration.logoColor} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold">{integration.name}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{integration.description}</p>

            {/* Connected meta */}
            {status === 'connected' && connectedAs && (
              <div className="flex items-center gap-3 mt-2 text-11 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-accent-green" />
                  {connectedAs}
                </span>
                {lastSync && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lastSync}
                  </span>
                )}
              </div>
            )}

            {/* Error state */}
            {status === 'error' && (
              <div className="flex items-center gap-1.5 mt-2 text-11 text-destructive">
                <AlertTriangle className="w-3 h-3" />
                Connection lost · {lastSync ?? 'check provider status'}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {status === 'disconnected' && (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                style={{ backgroundColor: integration.logoColor }}
              >
                Connect {integration.name}
              </button>
            )}
            {status === 'pending' && (
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                Connecting…
              </button>
            )}
            {status === 'connected' && (
              <>
                <button
                  onClick={onConfigure}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Sync
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                  Disconnect
                </button>
              </>
            )}
            {status === 'error' && (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reconnect
              </button>
            )}

            {/* Expand toggle */}
            {status !== 'disconnected' && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
              </button>
            )}

            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Expanded: features + webhook */}
      {expanded && status === 'connected' && (
        <div className="border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Feature toggles */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Features</p>
                <span className="text-11 text-muted-foreground">
                  {enabledCount}/{integration.features.length} active
                </span>
              </div>
              <div>
                {integration.features.map((f) => (
                  <FeatureToggle key={f.label} feature={f} />
                ))}
              </div>
            </div>

            {/* Connection details */}
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connection Details</p>

              {/* Account / Last sync（来自真实配置，可能为空） */}
              <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-2">
                {connectedAs && (
                  <div className="flex items-center justify-between">
                    <span className="text-11 text-muted-foreground">Account</span>
                    <span className="text-xs font-medium">{connectedAs}</span>
                  </div>
                )}
                {lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-11 text-muted-foreground">Last sync</span>
                    <span className="text-xs text-accent-green">{lastSync}</span>
                  </div>
                )}
                {!connectedAs && !lastSync && (
                  <span className="text-11 text-muted-foreground">No connection details reported yet.</span>
                )}
              </div>


              {/* Docs link */}
              <a
                href={integration.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View setup guide
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Disconnected: description + connect CTA */}
      {status === 'disconnected' && (
        <div className="border-t border-border/60 px-5 pb-5 pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{integration.longDescription}</p>

          {/* Feature preview (greyed) */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
            {integration.features.slice(0, 4).map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-2 text-11 text-muted-foreground/60">
                  <Icon className="w-3 h-3 shrink-0" />
                  {f.label}
                </div>
              );
            })}
            {integration.features.length > 4 && (
              <div className="text-11 text-muted-foreground/40">+{integration.features.length - 4} more features</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onConnect && (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: integration.logoColor }}
              >
                Connect {integration.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs border border-border hover:bg-accent transition-colors text-muted-foreground"
            >
              <ExternalLink className="w-3 h-3" />
              Docs
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function IntegrationsSettingsSection() {
  const navigate = useNavigate();
  const { data: integrationsData } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [linearFormOpen, setLinearFormOpen] = useState(false);

  const integrations = useMemo(() => integrationsData?.data ?? [], [integrationsData?.data]);

  // 真实连接状态：目录只提供展示元数据，status/lastSync 全部来自 /integrations 配置（宪法 §9）
  const configByProvider = useMemo(() => {
    const map = new Map<string, IntegrationConfig>();
    for (const c of integrations) if (!map.has(c.provider)) map.set(c.provider, c);
    return map;
  }, [integrations]);

  const resolveStatus = (config?: IntegrationConfig): ConnectionStatus => {
    if (!config || config.enabled === false) return 'disconnected';
    return config.status === 'error' ? 'error' : 'connected';
  };

  const liveCatalog = useMemo(
    () =>
      INTEGRATION_CATALOG.map((item) => {
        const config = configByProvider.get(item.id);
        return {
          ...item,
          status: resolveStatus(config),
          lastSync: config?.lastSyncAt
            ? formatDistanceToNow(new Date(config.lastSyncAt), { addSuffix: true })
            : undefined,
          configId: config?.id,
        };
      }),
    [configByProvider],
  );

  const connectedCount = liveCatalog.filter((i) => i.status === 'connected').length;
  const errorCount = liveCatalog.filter((i) => i.status === 'error').length;

  const filtered = useMemo(() => {
    return liveCatalog.filter((i) => {
      if (activeTab !== 'all' && i.category !== activeTab) return false;
      if (
        search &&
        !i.name.toLowerCase().includes(search.toLowerCase()) &&
        !i.description.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, search, liveCatalog]);

  // Group filtered results
  const grouped = CATEGORY_ORDER.reduce<Record<IntegrationCategory, typeof liveCatalog>>((acc, cat) => {
    const items = filtered.filter((i) => i.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<IntegrationCategory, typeof liveCatalog>);

  const categoryOptions: SegmentedOption<FilterTab>[] = [
    { value: 'all', label: 'All' },
    { value: 'task', label: 'Task Providers' },
    { value: 'code', label: 'Code & PR' },
    { value: 'communication', label: 'Communication' },
    { value: 'monitoring', label: 'Monitoring' },
  ];

  const linearInstances = integrations.filter((i) => i.provider === 'linear');

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.integrationList}>
      <div className="flex flex-col h-full overflow-auto bg-background">
        {/* Header */}
        <PageHeader
          title="Integrations"
          icon={Plug2}
          aiId="integration.integration-list.main"
          metrics={[
            ...(errorCount > 0
              ? [{ id: 'errors', label: 'Errors', value: errorCount, tone: 'danger' as const }]
              : []),
            { id: 'connected', label: 'Connected', value: connectedCount, tone: 'success' as const },
          ]}
        />

        {/* Toolbar: 分类筛选 + 搜索 */}
        <div className="flex shrink-0 flex-col gap-2 border-b border-border px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Connect your tools to supercharge AI-driven development.
          </p>
          <div className="flex items-center justify-between gap-4">
            <SegmentedControl
              value={activeTab}
              options={categoryOptions}
              onChange={(value) => setActiveTab(value)}
            />
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search integrations…"
                className="pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-hidden focus:border-ring w-44 h-8"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {Object.entries(grouped).map(([cat, items]) => (
              <section key={cat}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {CATEGORY_LABELS[cat as IntegrationCategory]}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-11 text-muted-foreground/60">
                    {items.length} integration{items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Section description */}
                {cat === 'task' && (
                  <p className="text-xs text-muted-foreground mb-4 p-3 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    Task providers are the source of truth for work items. Connect one or more to import tasks and let AI agents execute work directly.
                  </p>
                )}
                {cat === 'code' && (
                  <p className="text-xs text-muted-foreground mb-4 p-3 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-2">
                    <GitPullRequest className="w-3.5 h-3.5 text-accent-purple shrink-0 mt-0.5" />
                    Code integrations link repositories to tasks, enabling AI agents to open PRs, track CI status, and post acceptance results as code review comments.
                  </p>
                )}

                <div className="space-y-3">
                  {items.map((i) => {
                    const config = configByProvider.get(i.id);
                    return (
                    <IntegrationCard
                      key={i.id}
                      integration={i}
                      status={i.status}
                      lastSync={i.lastSync}
                      onConnect={
                        i.id === 'linear'
                          ? () => setLinearFormOpen(true)
                          : undefined
                      }
                      onDisconnect={
                        config
                          ? () =>
                              deleteIntegration.mutate(config.id, {
                                onSuccess: () => toast.success(`${i.name} 已断开连接`),
                                onError: () => toast.error('断开连接失败，请重试'),
                              })
                          : undefined
                      }
                      onConfigure={() => {
                        if (i.id === 'linear') {
                          if (linearInstances[0]) {
                            navigate(`/app/settings/integrations/linear/${linearInstances[0].id}`);
                          } else {
                            setLinearFormOpen(true);
                          }
                        }
                      }}
                    />
                    );
                  })}
                </div>
              </section>
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Plug2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No integrations match your search</p>
                <button
                  onClick={() => {
                    setSearch('');
                    setActiveTab('all');
                  }}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Coming soon */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coming Soon</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: 'Notion', logo: 'N', color: '#000000', desc: 'Sync project docs and wikis' },
                  { name: 'Figma', logo: 'F', color: '#F24E1E', desc: 'Link design files to task specs' },
                  { name: 'Vercel', logo: '▲', color: '#000000', desc: 'Track deployment status on tasks' },
                  { name: 'Datadog', logo: 'DD', color: '#632CA6', desc: 'Alert on anomalies, create incidents' },
                  { name: 'PagerDuty', logo: 'PD', color: '#06AC38', desc: 'Route on-call alerts to AgentPM tasks' },
                  { name: 'Loom', logo: '🎥', color: '#625DF5', desc: 'Attach screen recordings to tasks' },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-border/60 bg-muted/20 opacity-60"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: item.color === '#000000' ? '#374151' : item.color }}
                    >
                      {item.logo}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-10 text-muted-foreground truncate">{item.desc}</p>
                    </div>
                    <span className="ml-auto text-10 px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Soon</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <LinearConfigForm
        open={linearFormOpen}
        onClose={() => setLinearFormOpen(false)}
        onSuccess={(id) => {
          navigate(`/app/settings/integrations/linear/${id}`);
        }}
      />
    </PageShell>
  );
}

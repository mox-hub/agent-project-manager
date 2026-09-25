/**
 * IntegrationsSettingsSection - 设置页「集成管理」子页
 * @description 由 integration 模块的 IntegrationListPage 迁移而来（原路由 /app/integrations，2026-08-19 迁入设置页）
 * 头部已改造为标准 PageHeader + SegmentedControl 工具栏
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/ui/status-pill';
import { useNavigate } from 'react-router-dom';
import {
  Plug2,
  Search,
  Check,
  X,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Zap,
  AlertTriangle,
  ArrowRight,
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
import { PageShell, PageBody } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useIntegrations, useDeleteIntegration } from '@/modules/integration/hooks/use-integrations';
import type { IntegrationConfig } from '@/modules/integration/api/integration-api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { LinearConfigForm } from '@/modules/linear/components/linear-config-form';
import { GithubConfigForm } from '@/modules/github/components/github-config-form';

// ── Types ──────────────────────────────────────────────────────────────────────
type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';
type IntegrationCategory = 'task' | 'code' | 'monitoring' | 'communication';
type FilterTab = 'all' | IntegrationCategory;

interface IntegrationFeature {
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
  enabled: boolean;
}

const CATEGORY_LABEL_KEYS: Record<IntegrationCategory, string> = {
  task: 'settings.integration.category.task',
  code: 'settings.integration.category.code',
  monitoring: 'settings.integration.category.monitoring',
  communication: 'settings.integration.category.communication',
};

const CATEGORY_ORDER: IntegrationCategory[] = ['task', 'code', 'communication', 'monitoring'];

const STATUS_CFG: Record<ConnectionStatus, { labelKey: string; color: string; dot: string; bg: string }> = {
  connected: {
    labelKey: 'settings.integration.status.connected',
    color: 'text-accent-green',
    dot: 'bg-accent-green',
    bg: 'bg-accent-green/10 border-accent-green/30',
  },
  disconnected: {
    labelKey: 'settings.integration.status.disconnected',
    color: 'text-muted-foreground',
    dot: 'bg-muted-foreground/40',
    bg: 'bg-muted/40 border-border',
  },
  error: {
    labelKey: 'settings.integration.status.error',
    color: 'text-destructive',
    dot: 'bg-destructive',
    bg: 'bg-destructive/10 border-destructive/30',
  },
  pending: {
    labelKey: 'settings.integration.status.pending',
    color: 'text-accent-yellow',
    dot: 'bg-accent-yellow',
    bg: 'bg-accent-yellow/10 border-accent-yellow/30',
  },
};

// ── Mock data for demo (matches Figma design) ─────────────────────────────────

// 供应商目录（展示性元数据）；连接状态一律来自真实 /integrations 配置（宪法 §9）
// 文案一律走 i18n 键（settings.integration.catalog.*），名称为品牌名保留原文
const INTEGRATION_CATALOG: Array<{
  id: string;
  name: string;
  logo: string;
  logoColor: string;
  descKey: string;
  longDescKey: string;
  category: IntegrationCategory;
  features: IntegrationFeature[];
  docsUrl: string;
}> = [
  {
    id: 'linear',
    name: 'Linear',
    logo: 'L',
    logoColor: '#5E6AD2',
    descKey: 'settings.integration.catalog.linear.desc',
    longDescKey: 'settings.integration.catalog.linear.longDesc',
    category: 'task',
    features: [
      { icon: FolderKanban, labelKey: 'settings.integration.catalog.linear.f1.label', descKey: 'settings.integration.catalog.linear.f1.desc', enabled: true },
      { icon: ArrowRight, labelKey: 'settings.integration.catalog.linear.f2.label', descKey: 'settings.integration.catalog.linear.f2.desc', enabled: true },
      { icon: Zap, labelKey: 'settings.integration.catalog.linear.f3.label', descKey: 'settings.integration.catalog.linear.f3.desc', enabled: true },
      { icon: FileText, labelKey: 'settings.integration.catalog.linear.f4.label', descKey: 'settings.integration.catalog.linear.f4.desc', enabled: false },
      { icon: Users, labelKey: 'settings.integration.catalog.linear.f5.label', descKey: 'settings.integration.catalog.linear.f5.desc', enabled: true },
      { icon: BarChart3, labelKey: 'settings.integration.catalog.linear.f6.label', descKey: 'settings.integration.catalog.linear.f6.desc', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/linear',
  },
  {
    id: 'jira',
    name: 'Jira',
    logo: 'J',
    logoColor: '#0052CC',
    descKey: 'settings.integration.catalog.jira.desc',
    longDescKey: 'settings.integration.catalog.jira.longDesc',
    category: 'task',
    features: [
      { icon: FolderKanban, labelKey: 'settings.integration.catalog.jira.f1.label', descKey: 'settings.integration.catalog.jira.f1.desc', enabled: true },
      { icon: ArrowRight, labelKey: 'settings.integration.catalog.jira.f2.label', descKey: 'settings.integration.catalog.jira.f2.desc', enabled: true },
      { icon: Zap, labelKey: 'settings.integration.catalog.jira.f3.label', descKey: 'settings.integration.catalog.jira.f3.desc', enabled: false },
      { icon: FileText, labelKey: 'settings.integration.catalog.jira.f4.label', descKey: 'settings.integration.catalog.jira.f4.desc', enabled: false },
      { icon: Users, labelKey: 'settings.integration.catalog.jira.f5.label', descKey: 'settings.integration.catalog.jira.f5.desc', enabled: true },
      { icon: Bug, labelKey: 'settings.integration.catalog.jira.f6.label', descKey: 'settings.integration.catalog.jira.f6.desc', enabled: true },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/jira',
  },
  {
    id: 'github',
    name: 'GitHub',
    logo: 'G',
    logoColor: '#24292E',
    descKey: 'settings.integration.catalog.github.desc',
    longDescKey: 'settings.integration.catalog.github.longDesc',
    category: 'code',
    features: [
      { icon: GitPullRequest, labelKey: 'settings.integration.catalog.github.f1.label', descKey: 'settings.integration.catalog.github.f1.desc', enabled: true },
      { icon: Zap, labelKey: 'settings.integration.catalog.github.f2.label', descKey: 'settings.integration.catalog.github.f2.desc', enabled: true },
      { icon: Shield, labelKey: 'settings.integration.catalog.github.f3.label', descKey: 'settings.integration.catalog.github.f3.desc', enabled: false },
      { icon: Activity, labelKey: 'settings.integration.catalog.github.f4.label', descKey: 'settings.integration.catalog.github.f4.desc', enabled: true },
      { icon: Webhook, labelKey: 'settings.integration.catalog.github.f5.label', descKey: 'settings.integration.catalog.github.f5.desc', enabled: true },
      { icon: FileText, labelKey: 'settings.integration.catalog.github.f6.label', descKey: 'settings.integration.catalog.github.f6.desc', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/github',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    logo: 'GL',
    logoColor: '#FC6D26',
    descKey: 'settings.integration.catalog.gitlab.desc',
    longDescKey: 'settings.integration.catalog.gitlab.longDesc',
    category: 'code',
    features: [
      { icon: GitPullRequest, labelKey: 'settings.integration.catalog.gitlab.f1.label', descKey: 'settings.integration.catalog.gitlab.f1.desc', enabled: true },
      { icon: Zap, labelKey: 'settings.integration.catalog.gitlab.f2.label', descKey: 'settings.integration.catalog.gitlab.f2.desc', enabled: false },
      { icon: Activity, labelKey: 'settings.integration.catalog.gitlab.f3.label', descKey: 'settings.integration.catalog.gitlab.f3.desc', enabled: true },
      { icon: Webhook, labelKey: 'settings.integration.catalog.gitlab.f4.label', descKey: 'settings.integration.catalog.gitlab.f4.desc', enabled: true },
      { icon: Lock, labelKey: 'settings.integration.catalog.gitlab.f5.label', descKey: 'settings.integration.catalog.gitlab.f5.desc', enabled: false },
      { icon: FileText, labelKey: 'settings.integration.catalog.gitlab.f6.label', descKey: 'settings.integration.catalog.gitlab.f6.desc', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/gitlab',
  },
  {
    id: 'slack',
    name: 'Slack',
    logo: 'S',
    logoColor: '#4A154B',
    descKey: 'settings.integration.catalog.slack.desc',
    longDescKey: 'settings.integration.catalog.slack.longDesc',
    category: 'communication',
    features: [
      { icon: Activity, labelKey: 'settings.integration.catalog.slack.f1.label', descKey: 'settings.integration.catalog.slack.f1.desc', enabled: true },
      { icon: Zap, labelKey: 'settings.integration.catalog.slack.f2.label', descKey: 'settings.integration.catalog.slack.f2.desc', enabled: true },
      { icon: Shield, labelKey: 'settings.integration.catalog.slack.f3.label', descKey: 'settings.integration.catalog.slack.f3.desc', enabled: false },
      { icon: Clock, labelKey: 'settings.integration.catalog.slack.f4.label', descKey: 'settings.integration.catalog.slack.f4.desc', enabled: false },
    ],
    docsUrl: 'https://docs.agentpm.io/integrations/slack',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    logo: 'SE',
    logoColor: '#362D59',
    descKey: 'settings.integration.catalog.sentry.desc',
    longDescKey: 'settings.integration.catalog.sentry.longDesc',
    category: 'monitoring',
    features: [
      { icon: Bug, labelKey: 'settings.integration.catalog.sentry.f1.label', descKey: 'settings.integration.catalog.sentry.f1.desc', enabled: true },
      { icon: Zap, labelKey: 'settings.integration.catalog.sentry.f2.label', descKey: 'settings.integration.catalog.sentry.f2.desc', enabled: false },
      { icon: Activity, labelKey: 'settings.integration.catalog.sentry.f3.label', descKey: 'settings.integration.catalog.sentry.f3.desc', enabled: true },
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

const CONN_TONE: Record<ConnectionStatus, 'success' | 'default' | 'warning' | 'danger'> = {
  connected: 'success',
  disconnected: 'default',
  pending: 'warning',
  error: 'danger',
};

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CFG[status];
  return (
    <StatusPill tone={CONN_TONE[status]} className="gap-1.5">
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          cfg.dot,
          (status === 'pending' || status === 'error') && 'animate-pulse',
        )}
      />
      {t(cfg.labelKey)}
    </StatusPill>
  );
}

function FeatureToggle({ feature }: { feature: IntegrationFeature }) {
  const { t } = useTranslation();
  const Icon = feature.icon;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{t(feature.labelKey)}</p>
        <p className="text-11 text-muted-foreground mt-0.5 leading-relaxed">{t(feature.descKey)}</p>
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
  const { t } = useTranslation();
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
            <p className="text-xs text-muted-foreground leading-relaxed">{t(integration.descKey)}</p>

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
                {t('settings.integration.errorConnectionLost')} · {lastSync ?? t('settings.integration.errorCheckProvider')}
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
                {t('settings.integration.connect', { name: integration.name })}
              </button>
            )}
            {status === 'pending' && (
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                {t('settings.integration.connecting')}
              </button>
            )}
            {status === 'connected' && (
              <>
                <button
                  onClick={onConfigure}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('settings.integration.sync')}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                  {t('settings.integration.disconnect')}
                </button>
              </>
            )}
            {status === 'error' && (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                {t('settings.integration.reconnect')}
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.integration.features')}</p>
                <span className="text-11 text-muted-foreground">
                  {t('settings.integration.featuresActive', { active: enabledCount, total: integration.features.length })}
                </span>
              </div>
              <div>
                {integration.features.map((f) => (
                  <FeatureToggle key={f.labelKey} feature={f} />
                ))}
              </div>
            </div>

            {/* Connection details */}
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.integration.connectionDetails')}</p>

              {/* Account / Last sync（来自真实配置，可能为空） */}
              <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-2">
                {connectedAs && (
                  <div className="flex items-center justify-between">
                    <span className="text-11 text-muted-foreground">{t('settings.integration.account')}</span>
                    <span className="text-xs font-medium">{connectedAs}</span>
                  </div>
                )}
                {lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-11 text-muted-foreground">{t('settings.integration.lastSync')}</span>
                    <span className="text-xs text-accent-green">{lastSync}</span>
                  </div>
                )}
                {!connectedAs && !lastSync && (
                  <span className="text-11 text-muted-foreground">{t('settings.integration.noConnectionDetails')}</span>
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
                {t('settings.integration.viewSetupGuide')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Disconnected: description + connect CTA */}
      {status === 'disconnected' && (
        <div className="border-t border-border/60 px-5 pb-5 pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t(integration.longDescKey)}</p>

          {/* Feature preview (greyed) */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
            {integration.features.slice(0, 4).map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.labelKey} className="flex items-center gap-2 text-11 text-muted-foreground/60">
                  <Icon className="w-3 h-3 shrink-0" />
                  {t(f.labelKey)}
                </div>
              );
            })}
            {integration.features.length > 4 && (
              <div className="text-11 text-muted-foreground/40">
                {t('settings.integration.moreFeatures', { count: integration.features.length - 4 })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onConnect ? (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: integration.logoColor }}
              >
                {t('settings.integration.connect', { name: integration.name })}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-10 px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {t('settings.integration.soon')}
              </span>
            )}
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs border border-border hover:bg-accent transition-colors text-muted-foreground"
            >
              <ExternalLink className="w-3 h-3" />
              {t('settings.integration.docs')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function IntegrationsSettingsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: integrationsData } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [linearFormOpen, setLinearFormOpen] = useState(false);
  const [githubFormOpen, setGithubFormOpen] = useState(false);

  // Provider 动作注册表（集成接入规范 v0 §3.1 / §七#15）：有真实 Connect 流（凭据采集 →
  // 校验 → 保存 IntegrationConfig）的 provider 在此登记；卡片渲染只消费映射，不再写
  // `i.id === 'xxx'` 的 if-else 硬编码链。未登记的 provider 不渲染 Connect 入口。
  const connectFlows: Record<string, () => void> = {
    linear: () => setLinearFormOpen(true),
    github: () => setGithubFormOpen(true),
  };

  // Provider 配置页路由：Configure 按钮跳转目标；withId = 路由需要配置实例 ID
  const providerSettingsRoutes: Record<string, { path: string; withId: boolean }> = {
    linear: { path: '/app/settings/integrations/linear', withId: true },
    github: { path: '/app/settings/integrations/github', withId: false },
  };

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
        !t(i.descKey).toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, search, liveCatalog, t]);

  // Group filtered results
  const grouped = CATEGORY_ORDER.reduce<Record<IntegrationCategory, typeof liveCatalog>>((acc, cat) => {
    const items = filtered.filter((i) => i.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<IntegrationCategory, typeof liveCatalog>);

  const categoryOptions: SegmentedOption<FilterTab>[] = [
    { value: 'all', label: t('settings.integration.tabs.all') },
    { value: 'task', label: t('settings.integration.tabs.task') },
    { value: 'code', label: t('settings.integration.tabs.code') },
    { value: 'communication', label: t('settings.integration.tabs.communication') },
    { value: 'monitoring', label: t('settings.integration.tabs.monitoring') },
  ];

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.integrationList}>
      <div className="flex flex-col h-full overflow-auto bg-background">
        {/* Header */}
        <PageHeader
          title={t('settings.integration.title')}
          icon={Plug2}
          aiId="integration.integration-list.main"
          metrics={[
            ...(errorCount > 0
              ? [{ id: 'errors', label: t('settings.integration.metricErrors'), value: errorCount, tone: 'danger' as const }]
              : []),
            { id: 'connected', label: t('settings.integration.metricConnected'), value: connectedCount, tone: 'success' as const },
          ]}
        />

        {/* Toolbar: 左说明 / 中 rect 分类页签 / 右搜索 */}
        <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border px-6 py-2 md:px-7">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {t('settings.integration.subtitle')}
          </p>
          <div className="justify-self-center">
            <SegmentedControl
              variant="rect"
              value={activeTab}
              options={categoryOptions}
              onChange={(value) => setActiveTab(value)}
            />
          </div>
          <div className="flex items-center justify-end">
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('settings.integration.searchPlaceholder')}
                className="pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-hidden focus:border-ring w-44 h-8"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <PageBody variant="standard" className="space-y-8">
            {Object.entries(grouped).map(([cat, items]) => (
              <section key={cat}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(CATEGORY_LABEL_KEYS[cat as IntegrationCategory])}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-11 text-muted-foreground/60">
                    {t('settings.integration.count', { count: items.length })}
                  </span>
                </div>

                {/* Section description */}
                {cat === 'task' && (
                  <p className="text-xs text-muted-foreground mb-4 p-3 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    {t('settings.integration.catDesc.task')}
                  </p>
                )}
                {cat === 'code' && (
                  <p className="text-xs text-muted-foreground mb-4 p-3 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-2">
                    <GitPullRequest className="w-3.5 h-3.5 text-accent-purple shrink-0 mt-0.5" />
                    {t('settings.integration.catDesc.code')}
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
                        connectFlows[i.id]
                          ? () => connectFlows[i.id]()
                          : undefined
                      }
                      onDisconnect={
                        config
                          ? () =>
                              deleteIntegration.mutate(config.id, {
                                onSuccess: () => toast.success(t('settings.integration.disconnectSuccess', { name: i.name })),
                                onError: () => toast.error(t('settings.integration.disconnectFailed')),
                              })
                          : undefined
                      }
                      onConfigure={() => {
                        const route = providerSettingsRoutes[i.id];
                        if (!route) return;
                        if (config && route.withId) {
                          navigate(`${route.path}/${config.id}`);
                        } else if (connectFlows[i.id]) {
                          // 尚无实例但有 Connect 流：先走创建（原 linear 行为）
                          connectFlows[i.id]();
                        } else {
                          navigate(route.path);
                        }
                      }}
                    />
                    );
                  })}
                </div>
              </section>
            ))}

            {filtered.length === 0 && (
              <EmptyState
                icon={Plug2}
                title={t('settings.integration.emptyFiltered', '没有符合条件的集成')}
                description={t('settings.integration.emptyFilteredHint', '调整搜索关键词或清除筛选再试')}
                action={
                  <button
                    onClick={() => {
                      setSearch('');
                      setActiveTab('all');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('common.filterClear')}
                  </button>
                }
              />
            )}

            {/* Coming soon */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.integration.comingSoon')}</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: 'Notion', logo: 'N', color: '#000000', descKey: 'settings.integration.soonDesc.notion' },
                  { name: 'Figma', logo: 'F', color: '#F24E1E', descKey: 'settings.integration.soonDesc.figma' },
                  { name: 'Vercel', logo: '▲', color: '#000000', descKey: 'settings.integration.soonDesc.vercel' },
                  { name: 'Datadog', logo: 'DD', color: '#632CA6', descKey: 'settings.integration.soonDesc.datadog' },
                  { name: 'PagerDuty', logo: 'PD', color: '#06AC38', descKey: 'settings.integration.soonDesc.pagerduty' },
                  { name: 'Loom', logo: '🎥', color: '#625DF5', descKey: 'settings.integration.soonDesc.loom' },
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
                      <p className="text-10 text-muted-foreground truncate">{t(item.descKey)}</p>
                    </div>
                    <span className="ml-auto text-10 px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{t('settings.integration.soon')}</span>
                  </div>
                ))}
              </div>
            </section>
          </PageBody>
        </div>
      </div>

      <LinearConfigForm
        open={linearFormOpen}
        onClose={() => setLinearFormOpen(false)}
        onSuccess={(id) => {
          navigate(`/app/settings/integrations/linear/${id}`);
        }}
      />

      <GithubConfigForm
        open={githubFormOpen}
        onClose={() => setGithubFormOpen(false)}
        onSuccess={() => {
          navigate('/app/settings/integrations/github');
        }}
      />
    </PageShell>
  );
}

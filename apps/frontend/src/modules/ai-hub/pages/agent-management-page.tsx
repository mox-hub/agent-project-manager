/**
 * @deprecated 暂时抛弃（2026-08-19）：本页面已迁入设置页作为子页，路由已取消挂载，旧路径重定向到新路由。
 * 新实现：src/modules/settings/pages/sections/ai-agents-section.tsx（新路由 /app/settings/ai/agents）
 * 文件暂时保留备查，请勿在新代码中引用。
 */
/**
 * AgentManagementPage - Agent 智能体管理页面
 * @description 管理 MCP Servers、AI Tools、Agent Routing 和 Capability Matrix
 * @design Figma: AgentManagementPage.tsx
 * @version v1.0.0
 * @created 2026-07-29
 */

import { useState } from 'react';
import {
  Bot, Server, AlertTriangle,
  Circle, RefreshCw, ExternalLink, ChevronDown,
  Key, Eye, EyeOff, Zap, ArrowRight, Activity,
  Layers, Plus, Copy, Check, Package,
  Brain, Wrench, Network, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';

// ── Types ─────────────────────────────────────────────────────────────────────

type HealthStatus = 'online' | 'offline' | 'error' | 'degraded' | 'unknown';
type InstallStatus = 'installed' | 'not_installed' | 'update_available';
type TabId = 'overview' | 'mcp' | 'tools' | 'routing' | 'matrix';

interface MCPServer {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'http';
  status: HealthStatus;
  toolCount: number;
  lastPing: string;
  description: string;
  command?: string;
  url?: string;
  scope: 'project' | 'global';
}

interface AITool {
  id: string;
  name: string;
  vendor: string;
  logo: string;
  logoColor: string;
  category: 'cli' | 'ide' | 'api' | 'agent';
  installStatus: InstallStatus;
  connectionStatus: HealthStatus;
  version?: string;
  configuredModel?: string;
  apiKeyConfigured: boolean;
  capabilities: string[];
  binaryPath?: string;
  latencyMs?: number;
  docsUrl: string;
  installCmd?: string;
}

interface RoutingRule {
  id: string;
  taskType: string;
  taskTypeColor: string;
  primaryTool: string;
  fallbackTool?: string;
  enabled: boolean;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MCP_SERVERS: MCPServer[] = [
  {
    id: 'filesystem',
    name: 'filesystem',
    transport: 'stdio',
    status: 'online',
    toolCount: 8,
    lastPing: '1s ago',
    description: 'Read, write, and list files within allowed directories.',
    command: 'npx -y @modelcontextprotocol/server-filesystem /workspace',
    scope: 'project',
  },
  {
    id: 'github',
    name: 'github',
    transport: 'stdio',
    status: 'online',
    toolCount: 22,
    lastPing: '3s ago',
    description: 'Manage repositories, issues, PRs, and code search via GitHub API.',
    command: 'npx -y @modelcontextprotocol/server-github',
    scope: 'global',
  },
  {
    id: 'figma-make',
    name: 'figma-make-mcp',
    transport: 'stdio',
    status: 'online',
    toolCount: 6,
    lastPing: '2s ago',
    description: 'Figma Make internal server — theme generation and design imports.',
    command: 'figma-make-mcp',
    scope: 'project',
  },
  {
    id: 'memory',
    name: 'memory',
    transport: 'stdio',
    status: 'online',
    toolCount: 5,
    lastPing: '1s ago',
    description: 'Persistent key-value knowledge graph for long-running agent context.',
    command: 'npx -y @modelcontextprotocol/server-memory',
    scope: 'global',
  },
  {
    id: 'brave-search',
    name: 'brave-search',
    transport: 'stdio',
    status: 'degraded',
    toolCount: 2,
    lastPing: '12s ago',
    description: 'Real-time web search using the Brave Search API.',
    command: 'npx -y @modelcontextprotocol/server-brave-search',
    scope: 'global',
  },
  {
    id: 'postgres',
    name: 'postgres',
    transport: 'stdio',
    status: 'offline',
    toolCount: 4,
    lastPing: '5 min ago',
    description: 'Read-only SQL query interface to your PostgreSQL database.',
    command: 'npx -y @modelcontextprotocol/server-postgres $DATABASE_URL',
    scope: 'project',
  },
  {
    id: 'unsplash',
    name: 'unsplash',
    transport: 'stdio',
    status: 'online',
    toolCount: 1,
    lastPing: '4s ago',
    description: 'Search and retrieve high-resolution photos from Unsplash.',
    command: 'unsplash-mcp',
    scope: 'global',
  },
];

const AI_TOOLS: AITool[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    vendor: 'Anthropic',
    logo: '⬡',
    logoColor: '#D97706',
    category: 'cli',
    installStatus: 'installed',
    connectionStatus: 'online',
    version: '1.0.58',
    configuredModel: 'claude-sonnet-4-6',
    apiKeyConfigured: true,
    capabilities: ['File edit', 'Terminal', 'Web fetch', 'MCP client', 'Agents', 'GitHub'],
    binaryPath: '/usr/local/bin/claude',
    latencyMs: 42,
    docsUrl: 'https://docs.anthropic.com/claude-code',
    installCmd: 'npm install -g @anthropic-ai/claude-code',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    vendor: 'Cursor AI',
    logo: '⌥',
    logoColor: '#000000',
    category: 'ide',
    installStatus: 'installed',
    connectionStatus: 'online',
    version: '0.44.11',
    configuredModel: 'claude-sonnet-4-5',
    apiKeyConfigured: true,
    capabilities: ['File edit', 'Inline chat', 'Composer', 'Agent mode', 'Codebase index'],
    latencyMs: 55,
    docsUrl: 'https://cursor.sh/docs',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    vendor: 'OpenAI',
    logo: '⊕',
    logoColor: '#10A37F',
    category: 'cli',
    installStatus: 'installed',
    connectionStatus: 'error',
    version: '0.1.2505',
    configuredModel: 'codex-mini-latest',
    apiKeyConfigured: false,
    capabilities: ['File edit', 'Shell exec', 'Diff review', 'Test generation'],
    binaryPath: '/usr/local/bin/codex',
    docsUrl: 'https://github.com/openai/codex',
    installCmd: 'npm install -g @openai/codex',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    vendor: 'SST',
    logo: '◈',
    logoColor: '#6366F1',
    category: 'cli',
    installStatus: 'not_installed',
    connectionStatus: 'unknown',
    apiKeyConfigured: false,
    capabilities: ['File edit', 'Terminal', 'Multi-provider', 'LSP integration', 'TUI'],
    docsUrl: 'https://opencode.ai',
    installCmd: 'curl -fsSL https://opencode.ai/install | bash',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    vendor: 'Google',
    logo: '✦',
    logoColor: '#4285F4',
    category: 'cli',
    installStatus: 'not_installed',
    connectionStatus: 'unknown',
    apiKeyConfigured: false,
    capabilities: ['File edit', 'Terminal', '1M context', 'MCP client', 'Google Search'],
    docsUrl: 'https://github.com/google-gemini/gemini-cli',
    installCmd: 'npm install -g @google/gemini-cli',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    vendor: 'GitHub / Microsoft',
    logo: '◎',
    logoColor: '#161B22',
    category: 'ide',
    installStatus: 'installed',
    connectionStatus: 'online',
    version: '1.232.0',
    configuredModel: 'gpt-4o',
    apiKeyConfigured: true,
    capabilities: ['Inline complete', 'Chat', 'PR summary', 'Code review', 'CLI'],
    latencyMs: 38,
    docsUrl: 'https://docs.github.com/copilot',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    vendor: 'Codeium',
    logo: '≋',
    logoColor: '#05A8AA',
    category: 'ide',
    installStatus: 'not_installed',
    connectionStatus: 'unknown',
    apiKeyConfigured: false,
    capabilities: ['Cascade agent', 'File edit', 'Terminal', 'Web search', 'MCP client'],
    docsUrl: 'https://codeium.com/windsurf',
  },
  {
    id: 'aider',
    name: 'Aider',
    vendor: 'Paul Gauthier',
    logo: 'ai',
    logoColor: '#7C3AED',
    category: 'cli',
    installStatus: 'not_installed',
    connectionStatus: 'unknown',
    apiKeyConfigured: false,
    capabilities: ['File edit', 'Git integration', 'Multi-file', 'Architect mode', 'Linting'],
    docsUrl: 'https://aider.chat',
    installCmd: 'pip install aider-chat',
  },
];

const ROUTING_RULES: RoutingRule[] = [
  { id: 'r1', taskType: 'Bug fix', taskTypeColor: 'text-red-500', primaryTool: 'Claude Code', fallbackTool: 'Aider', enabled: true },
  { id: 'r2', taskType: 'Feature', taskTypeColor: 'text-blue-500', primaryTool: 'Claude Code', fallbackTool: 'Cursor', enabled: true },
  { id: 'r3', taskType: 'PR review', taskTypeColor: 'text-violet-500', primaryTool: 'GitHub Copilot', fallbackTool: 'Claude Code', enabled: true },
  { id: 'r4', taskType: 'Test generation', taskTypeColor: 'text-emerald-500', primaryTool: 'Codex CLI', fallbackTool: 'Claude Code', enabled: false },
  { id: 'r5', taskType: 'Refactor', taskTypeColor: 'text-amber-500', primaryTool: 'Claude Code', enabled: true },
  { id: 'r6', taskType: 'Doc writing', taskTypeColor: 'text-sky-500', primaryTool: 'Claude Code', enabled: true },
];

// ── Config ────────────────────────────────────────────────────────────────────

const HEALTH_CFG: Record<HealthStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  online: { label: 'Online', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900' },
  offline: { label: 'Offline', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', bg: 'bg-muted/40', border: 'border-border' },
  error: { label: 'Error', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900' },
  degraded: { label: 'Degraded', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900' },
  unknown: { label: 'Unknown', dot: 'bg-muted-foreground/30', text: 'text-muted-foreground', bg: 'bg-muted/40', border: 'border-border' },
};

const INSTALL_CFG: Record<InstallStatus, { label: string; color: string }> = {
  installed: { label: 'Installed', color: 'text-foreground' },
  not_installed: { label: 'Not installed', color: 'text-muted-foreground' },
  update_available: { label: 'Update available', color: 'text-amber-600 dark:text-amber-400' },
};

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'mcp', label: 'MCP Servers', icon: Server },
  { id: 'tools', label: 'AI Tools', icon: Bot },
  { id: 'routing', label: 'Routing', icon: Network },
  { id: 'matrix', label: 'Capabilities', icon: Layers },
];

// ── Helper Components ──────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: HealthStatus }) {
  const cfg = HEALTH_CFG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-11 font-medium px-2 py-0.5 rounded-full border', cfg.bg, cfg.border, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot, (status === 'degraded' || status === 'error') && 'animate-pulse')} />
      {cfg.label}
    </span>
  );
}

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5 group">
      <code className="text-10 font-mono text-muted-foreground flex-1 truncate">{value}</code>
      <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ── MCP Section ────────────────────────────────────────────────────────────────

function MCPSection() {
  const [servers, setServers] = useState(MCP_SERVERS);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const onlineCount = servers.filter(s => s.status === 'online').length;
  const totalTools = servers.reduce((a, s) => a + (s.status === 'online' ? s.toolCount : 0), 0);

  const refresh = (id: string) => {
    setRefreshing(id);
    setTimeout(() => setRefreshing(null), 1200);
  };

  const scopeColors: Record<string, string> = {
    project: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900',
    global: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900',
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            MCP Servers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {onlineCount}/{servers.length} online · {totalTools} tools available
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add server
        </Button>
      </div>

      <div className="space-y-2">
        {servers.map(server => {
          const cfg = HEALTH_CFG[server.status];
          return (
            <div
              key={server.id}
              className={cn(
                'rounded-xl border p-4 transition-colors',
                server.status === 'online' ? 'bg-card border-border' :
                server.status === 'error' ? 'bg-card border-red-200 dark:border-red-900' :
                server.status === 'degraded' ? 'bg-card border-amber-200 dark:border-amber-900' :
                'bg-muted/20 border-border/60',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', cfg.dot, server.status === 'degraded' && 'animate-pulse')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono font-medium">{server.name}</code>
                    <span className={cn('text-10 px-1.5 py-0.5 rounded-full border font-medium', scopeColors[server.scope])}>
                      {server.scope}
                    </span>
                    <span className="text-11 text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/60">
                      {server.transport}
                    </span>
                    <HealthBadge status={server.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{server.description}</p>
                  {server.command && (
                    <div className="mt-2">
                      <CopyableCode value={server.command} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium">{server.status === 'online' ? server.toolCount : '—'} tools</p>
                    <p className="text-10 text-muted-foreground">{server.lastPing}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => refresh(server.id)}
                    className="w-7 h-7"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', refreshing === server.id && 'animate-spin')} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── AI Tool Card ───────────────────────────────────────────────────────────────

function AIToolCard({ tool }: { tool: AITool }) {
  const [showKey, setShowKey] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [installing, setInstalling] = useState(false);
  const healthCfg = HEALTH_CFG[tool.connectionStatus];
  const installCfg = INSTALL_CFG[tool.installStatus];

  const isConnected = tool.connectionStatus === 'online';
  const isInstalled = tool.installStatus === 'installed' || tool.installStatus === 'update_available';

  const handleInstall = () => {
    setInstalling(true);
    setTimeout(() => setInstalling(false), 2000);
  };

  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-200',
      isConnected ? 'bg-card border-border' :
      tool.connectionStatus === 'error' ? 'bg-card border-red-200 dark:border-red-900' :
      'bg-card/50 border-border/60',
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: tool.logoColor === '#000000' || tool.logoColor === '#161B22' ? '#374151' : tool.logoColor }}
          >
            {tool.logo}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{tool.name}</span>
              <span className="text-10 text-muted-foreground">{tool.vendor}</span>
              <HealthBadge status={tool.connectionStatus} />
              {tool.installStatus === 'update_available' && (
                <span className="text-10 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-medium">
                  Update available
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-11 text-muted-foreground flex-wrap">
              <span className={cn('flex items-center gap-1', installCfg.color)}>
                {isInstalled ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                {installCfg.label}
              </span>
              {tool.version && <span>v{tool.version}</span>}
              {tool.configuredModel && (
                <span className="flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {tool.configuredModel}
                </span>
              )}
              {tool.latencyMs && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Zap className="w-3 h-3" />
                  {tool.latencyMs}ms
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isInstalled && tool.installCmd && (
              <Button
                size="sm"
                onClick={handleInstall}
                disabled={installing}
              >
                {installing ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Package className="w-3 h-3 mr-1.5" />}
                {installing ? 'Installing…' : 'Install'}
              </Button>
            )}
            {tool.connectionStatus === 'error' && (
              <Button size="sm" variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30">
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Reconnect
              </Button>
            )}
            {isInstalled && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded(v => !v)}
                className="w-7 h-7"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
              </Button>
            )}
            <a
              href={tool.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {tool.capabilities.map(cap => (
            <span
              key={cap}
              className={cn(
                'text-10 px-2 py-0.5 rounded-full border',
                isInstalled
                  ? 'bg-accent/60 border-border text-foreground'
                  : 'bg-muted/30 border-border/40 text-muted-foreground/60',
              )}
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {expanded && isInstalled && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {tool.binaryPath && (
            <div>
              <p className="text-11 text-muted-foreground mb-1">Binary path</p>
              <CopyableCode value={tool.binaryPath} />
            </div>
          )}
          {tool.installCmd && (
            <div>
              <p className="text-11 text-muted-foreground mb-1">Install command</p>
              <CopyableCode value={tool.installCmd} />
            </div>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">API key</span>
            </div>
            <div className="flex items-center gap-2">
              {tool.apiKeyConfigured ? (
                <>
                  <code className="text-11 font-mono text-muted-foreground">
                    {showKey ? 'sk-ant-api03-••••••••••••••••' : '••••••••••••••••••••'}
                  </code>
                  <button onClick={() => setShowKey(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Configured
                  </span>
                </>
              ) : (
                <Button size="sm">
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add key
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Routing Section ─────────────────────────────────────────────────────────────

function RoutingSection() {
  const [rules, setRules] = useState(ROUTING_RULES);

  const toggle = (id: string) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Network className="w-4 h-4 text-muted-foreground" />
            Agent Routing
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose which AI tool handles each task type automatically.
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add rule
        </Button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] text-11 font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 px-4 py-2.5 border-b border-border gap-4">
          <span>Task type</span>
          <span>Primary tool</span>
          <span>Fallback</span>
          <span>Active</span>
        </div>
        {rules.map((rule, i) => (
          <div
            key={rule.id}
            className={cn(
              'grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 gap-4 transition-colors border-b border-border last:border-0',
              rule.enabled ? 'bg-card' : 'bg-muted/10 opacity-60',
            )}
          >
            <span className={cn('text-xs font-medium', rule.taskTypeColor)}>{rule.taskType}</span>
            <span className="text-xs text-right whitespace-nowrap">{rule.primaryTool}</span>
            <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
              {rule.fallbackTool ?? '—'}
            </span>
            <button
              onClick={() => toggle(rule.id)}
              className={cn(
                'relative w-8 h-4.5 rounded-full border transition-all duration-200',
                rule.enabled ? 'bg-primary border-primary' : 'bg-transparent border-border',
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-3.25 h-3.25 rounded-full shadow-xs transition-all duration-200',
                rule.enabled ? 'left-[calc(100%-15px)] bg-white' : 'left-0.5 bg-muted-foreground/40',
              )} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Capability Matrix ──────────────────────────────────────────────────────────

function CapabilityMatrix() {
  const installedTools = AI_TOOLS.filter(t => t.installStatus !== 'not_installed');
  const shownCaps = ['File edit', 'Terminal', 'MCP client', 'Git integration', 'PR review', 'Test generation', 'Web search', 'Agent mode'];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          Capability Matrix
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Installed tools and their supported capabilities.
        </p>
      </div>

      <div className="rounded-2xl border border-border overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted/30 border-b border-border">
              <TableHead className="text-left px-4 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider text-11 whitespace-nowrap">Capability</TableHead>
              {installedTools.map(t => (
                <TableHead key={t.id} className="px-4 py-2.5 text-center whitespace-nowrap">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-9 font-bold text-white"
                      style={{ backgroundColor: t.logoColor === '#000000' || t.logoColor === '#161B22' ? '#374151' : t.logoColor }}
                    >
                      {t.logo}
                    </div>
                    <span className="text-10 text-muted-foreground">{t.name.split(' ')[0]}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shownCaps.map((cap, i) => (
              <TableRow key={cap} className={cn('border-b border-border last:border-0', i % 2 === 0 ? 'bg-card' : 'bg-muted/10')}>
                <TableCell className="px-4 py-2 font-medium whitespace-nowrap">{cap}</TableCell>
                {installedTools.map(t => (
                  <TableCell key={t.id} className="px-4 py-2 text-center">
                    {t.capabilities.includes(cap)
                      ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                      : <span className="text-muted-foreground/30 text-base leading-none">—</span>
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AgentManagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // 统计数据
  const totalMCP = MCP_SERVERS.length;
  const onlineMCP = MCP_SERVERS.filter(s => s.status === 'online').length;
  const totalTools = AI_TOOLS.length;
  const installedTools = AI_TOOLS.filter(t => t.installStatus !== 'not_installed').length;
  const connectedTools = AI_TOOLS.filter(t => t.connectionStatus === 'online').length;
  const errorTools = AI_TOOLS.filter(t => t.connectionStatus === 'error').length;
  const totalToolCount = MCP_SERVERS.reduce((a, s) => a + (s.status === 'online' ? s.toolCount : 0), 0);

  const handleRefreshAll = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <PageShell aiPage="ai-hub.agent-management" className="overflow-hidden">
      {/* Header */}
      <PageHeader
        aiId="ai-hub.agent-management"
        title="Agent Management"
        icon={Bot}
        iconColor="text-primary"
        actions={
          <HeaderActionButton variant="outline" icon={RefreshCw} label="Refresh all" onClick={handleRefreshAll} />
        }
      />

      {/* Tabs */}
      <div className="px-6 border-b border-border bg-muted/20">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList>
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'MCP Servers', value: `${onlineMCP}/${totalMCP}`, sub: 'online', icon: Server, color: onlineMCP === totalMCP ? 'text-emerald-500' : 'text-amber-500' },
                  { label: 'MCP Tools', value: totalToolCount, sub: 'available', icon: Wrench, color: 'text-primary' },
                  { label: 'AI Tools', value: `${connectedTools}/${installedTools}`, sub: 'connected', icon: Bot, color: connectedTools === installedTools ? 'text-emerald-500' : 'text-amber-500' },
                  { label: 'Errors', value: errorTools, sub: 'need attention', icon: AlertTriangle, color: errorTools > 0 ? 'text-red-500' : 'text-muted-foreground' },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <Card key={card.label} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn('w-4 h-4', card.color)} />
                        <span className="text-xs text-muted-foreground">{card.label}</span>
                      </div>
                      <p className={cn('text-2xl font-bold tracking-tight', card.color)}>{card.value}</p>
                      <p className="text-11 text-muted-foreground mt-0.5">{card.sub}</p>
                    </Card>
                  );
                })}
              </div>

              {/* Quick status: MCP servers */}
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  MCP Server Health
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {MCP_SERVERS.map(s => {
                    const cfg = HEALTH_CFG[s.status];
                    return (
                      <div
                        key={s.id}
                        className={cn('rounded-xl border p-3 flex items-center gap-2.5 cursor-pointer transition-colors hover:bg-accent/50', cfg.bg, cfg.border)}
                        onClick={() => setActiveTab('mcp')}
                      >
                        <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot, s.status === 'degraded' && 'animate-pulse')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-medium truncate">{s.name}</p>
                          <p className={cn('text-10', cfg.text)}>{s.status === 'online' ? `${s.toolCount} tools` : cfg.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick status: AI tools */}
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  AI Tool Status
                </h2>
                <div className="space-y-2">
                  {AI_TOOLS.filter(t => t.installStatus !== 'not_installed').map(tool => {
                    const cfg = HEALTH_CFG[tool.connectionStatus];
                    return (
                      <div
                        key={tool.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-accent/30 transition-colors"
                        onClick={() => setActiveTab('tools')}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-10 font-bold text-white shrink-0"
                          style={{ backgroundColor: tool.logoColor === '#000000' || tool.logoColor === '#161B22' ? '#374151' : tool.logoColor }}
                        >
                          {tool.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{tool.name}</span>
                            {tool.version && <span className="text-10 text-muted-foreground">v{tool.version}</span>}
                          </div>
                          {tool.configuredModel && (
                            <p className="text-11 text-muted-foreground">{tool.configuredModel}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {tool.latencyMs && (
                            <span className="text-11 text-muted-foreground">{tool.latencyMs}ms</span>
                          )}
                          <HealthBadge status={tool.connectionStatus} />
                        </div>
                      </div>
                    );
                  })}
                  {AI_TOOLS.filter(t => t.installStatus === 'not_installed').length > 0 && (
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-accent/20 transition-colors"
                      onClick={() => setActiveTab('tools')}
                    >
                      <Plus className="w-4 h-4 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground">
                        {AI_TOOLS.filter(t => t.installStatus === 'not_installed').length} more tools available to install
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── MCP Servers ── */}
          {activeTab === 'mcp' && <MCPSection />}

          {/* ── AI Tools ── */}
          {activeTab === 'tools' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    AI Coding Tools
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {installedTools} installed · {connectedTools} connected · {totalTools - installedTools} available
                  </p>
                </div>
              </div>

              {AI_TOOLS.filter(t => t.installStatus !== 'not_installed').length > 0 && (
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Installed</p>
                  {AI_TOOLS.filter(t => t.installStatus !== 'not_installed').map(t => (
                    <AIToolCard key={t.id} tool={t} />
                  ))}
                </div>
              )}

              {AI_TOOLS.filter(t => t.installStatus === 'not_installed').length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available to install</p>
                  {AI_TOOLS.filter(t => t.installStatus === 'not_installed').map(t => (
                    <AIToolCard key={t.id} tool={t} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Routing ── */}
          {activeTab === 'routing' && <RoutingSection />}

          {/* ── Capability Matrix ── */}
          {activeTab === 'matrix' && <CapabilityMatrix />}
        </div>
      </div>
    </PageShell>
  );
}

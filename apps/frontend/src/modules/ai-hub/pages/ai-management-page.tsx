/**
 * AIManagementPage - AI 管理页面
 * @description 主要实现关于ai接入功能以及ai模型、权限、角色管理
 * @version v1.0
 * @author cursor
 * @created 2026-06-02
 * @modified 2026-06-02
 */

import { useState } from 'react';
import { Bot, Settings, Key, Sparkles, Zap, Check, Server, Puzzle, Terminal, Shield, UserCircle, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';

interface AIProvider {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  models: string[];
}

interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: boolean;
  icon: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

const AI_PROVIDERS: AIProvider[] = [
  { id: 'openai', name: 'OpenAI', icon: '/icons/openai.svg', status: 'connected', models: ['GPT-4o', 'GPT-4o-mini', 'GPT-4-Turbo'] },
  { id: 'anthropic', name: 'Anthropic', icon: '/icons/anthropic.svg', status: 'connected', models: ['Claude Opus 4', 'Claude Sonnet 4', 'Claude Haiku'] },
  { id: 'gemini', name: 'Google Gemini', icon: '/icons/gemini.svg', status: 'disconnected', models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash'] },
];

const MCP_SERVERS: MCPServer[] = [
  { id: 'github', name: 'GitHub', description: 'Repository and PR management', status: true, icon: '🐙' },
  { id: 'filesystem', name: 'Filesystem', description: 'File read/write operations', status: true, icon: '📁' },
  { id: 'database', name: 'Database', description: 'Database query and management', status: false, icon: '🗄️' },
  { id: 'slack', name: 'Slack', description: 'Team notifications', status: false, icon: '💬' },
  { id: 'linear', name: 'Linear', description: 'Issue tracking integration', status: false, icon: '📊' },
];

const SKILLS: Skill[] = [
  { id: 'code-review', name: 'Code Review', description: 'Analyze code for quality and bugs', enabled: true, category: 'Development' },
  { id: 'bug-analysis', name: 'Bug Analysis', description: 'Debug and analyze error reports', enabled: true, category: 'Development' },
  { id: 'test-gen', name: 'Test Generation', description: 'Generate unit and integration tests', enabled: true, category: 'Development' },
  { id: 'doc-gen', name: 'Documentation', description: 'Generate code documentation', enabled: false, category: 'Development' },
  { id: 'refactor', name: 'Refactoring', description: 'Suggest code improvements', enabled: false, category: 'Development' },
  { id: 'pm-assist', name: 'PM Assistant', description: 'Help with project management', enabled: true, category: 'Management' },
  { id: 'planning', name: 'Sprint Planning', description: 'Assist with sprint planning', enabled: false, category: 'Management' },
];

export function AIManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('GPT-4o');
  const [trustLevel] = useState(75);
  const [mcpServers, setMCPServers] = useState<Record<string, boolean>>(
    MCP_SERVERS.reduce((acc, server) => ({ ...acc, [server.id]: server.status }), {})
  );

  const toggleMCPServer = (id: string) => {
    setMCPServers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentProvider = AI_PROVIDERS.find((p) => p.id === selectedProvider);

  const quotaLimit = 100000;
  const usedTokens = 45000;

  const connectedCount = AI_PROVIDERS.filter((p) => p.status === 'connected').length;
  const activeSkillsCount = SKILLS.filter((s) => s.enabled).length;
  const activeServersCount = MCP_SERVERS.filter((s) => s.status).length;

  return (
    <PageShell aiPage="ai-hub.ai-management" className="overflow-hidden">
      {/* Header - 使用 PageHeader 组件 */}
      <PageHeader
        aiId="ai-hub.ai-management"
        title="AI Management"
        description="Configure AI providers, MCP servers, skills, and roles"
        icon={Brain}
        iconColor="text-accent-purple"
        actions={
          <Button size="sm" data-ai-component="ai-hub.ai-management.settings-button" data-ai-action="ai-hub.ai-management.settings-button.click" data-ai-role="submit">
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Settings
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="mcp">MCP Servers</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Active Model Switcher Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left: Icon + Title */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Active AI Model</p>
                      <p className="text-xs text-muted-foreground">Switch between available models</p>
                    </div>
                  </div>

                  {/* Right: Selector + Status Badge */}
                  <div className="flex items-center gap-3">
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.filter((p) => p.status === 'connected').map((provider) =>
                          provider.models.map((model) => (
                            <SelectItem key={model} value={model}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                {model}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <Zap className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Setup Guide */}
            <Card className="border-dashed border-2 border-violet-200 bg-violet-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <QuickSetupButton
                    icon={Server}
                    title="Setup MCP Servers"
                    description="Connect tools & integrations"
                    onClick={() => setActiveTab('mcp')}
                  />
                  <QuickSetupButton
                    icon={Puzzle}
                    title="Enable AI Skills"
                    description="Activate code review, testing"
                    onClick={() => setActiveTab('skills')}
                  />
                  <QuickSetupButton
                    icon={Terminal}
                    title="Configure CLI"
                    description="Install command-line tools"
                    onClick={() => {}}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Usage & Trust Levels - Horizontal layout */}
            <div className="space-y-4">
              {/* AI Quota - 3 columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <QuotaCard provider={AI_PROVIDERS[0]} usedTokens={usedTokens} quotaLimit={quotaLimit} />
                <QuotaCard provider={AI_PROVIDERS[1]} usedTokens={32000} quotaLimit={quotaLimit} />
                <TrustLevelCard level={trustLevel} />
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Connected Providers" value={`${connectedCount} / ${AI_PROVIDERS.length}`} color="emerald" />
              <StatCard label="Active Skills" value={`${activeSkillsCount} / ${SKILLS.length}`} color="violet" />
              <StatCard label="Active Servers" value={`${activeServersCount} / ${MCP_SERVERS.length}`} color="blue" />
            </div>
          </TabsContent>

          {/* Providers Tab */}
          <TabsContent value="providers" className="mt-0 space-y-4">
            {/* Tab Guide */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900">AI Provider Configuration</p>
                  <p className="text-xs text-emerald-700">
                    Connect to AI providers like OpenAI, Anthropic, or local models. Each provider requires an API key.
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                  {connectedCount} Connected
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {AI_PROVIDERS.length - connectedCount} Disconnected
                </Badge>
              </div>
            </div>

            {/* Provider Cards */}
            <div className="grid grid-cols-3 gap-4">
              {AI_PROVIDERS.map((provider) => (
                <Card
                  key={provider.id}
                  className={cn(
                    'cursor-pointer transition-all',
                    selectedProvider === provider.id && 'border-violet-500 ring-2 ring-violet-500/20'
                  )}
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <StatusBadge status={provider.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">Available models:</p>
                    <div className="space-y-1">
                      {provider.models.map((model) => (
                        <div
                          key={model}
                          className={cn(
                            'text-sm px-2 py-1 rounded cursor-pointer',
                            selectedModel === model && currentProvider?.id === provider.id
                              ? 'bg-violet-100 text-violet-700 font-medium'
                              : 'hover:bg-muted'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModel(model);
                          }}
                        >
                          {model}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>Configure API keys for selected provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium">API Key</label>
                      <div className="flex gap-2 mt-1">
                        <Button variant="outline" size="sm" className="flex-1 justify-start">
                          <Key className="w-4 h-4 mr-2" />
                          ••••••••••••••••
                        </Button>
                        <Button variant="outline" size="sm">
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Servers Tab */}
          <TabsContent value="mcp" className="mt-0 space-y-4">
            {/* Tab Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Model Context Protocol (MCP)</p>
                  <p className="text-xs text-blue-700">
                    MCP servers provide AI with access to tools and integrations. Enable the servers you need for your project.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="border-blue-200">
                  Learn More
                </Button>
              </div>
            </div>

            {/* MCP Server Grid */}
            <div className="grid grid-cols-2 gap-4">
              {MCP_SERVERS.map((server) => (
                <div
                  key={server.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{server.icon}</span>
                    <div>
                      <p className="font-medium">{server.name}</p>
                      <p className="text-sm text-muted-foreground">{server.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={mcpServers[server.id] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMCPServer(server.id)}
                  >
                    {mcpServers[server.id] ? (
                      <>
                        <Check className="w-4 h-4 mr-1" /> Active
                      </>
                    ) : (
                      'Enable'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="mt-0 space-y-4">
            {/* Tab Guide */}
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Puzzle className="w-5 h-5 text-violet-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-900">AI Skills</p>
                  <p className="text-xs text-violet-700">
                    Skills are specialized AI capabilities for your project. Enable code review, testing, documentation, and more.
                  </p>
                </div>
                <Badge variant="outline" className="bg-violet-100 text-violet-700">
                  {activeSkillsCount} Active
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {SKILLS.length - activeSkillsCount} Inactive
                </Badge>
              </div>
            </div>

            {/* Skills by Category */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-6">
                  {['Development', 'Management'].map((category) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {SKILLS.filter((s) => s.category === category).map((skill) => (
                          <div
                            key={skill.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">{skill.name}</p>
                              <p className="text-xs text-muted-foreground">{skill.description}</p>
                            </div>
                            <Button
                              variant={skill.enabled ? 'default' : 'outline'}
                              size="sm"
                            >
                              {skill.enabled ? 'Enabled' : 'Disabled'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="mt-0 space-y-4">
            {/* Tab Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <UserCircle className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">AI Roles & Personas</p>
                  <p className="text-xs text-blue-700">
                    Define AI personas with specific expertise and permissions. Activate the role that best fits your current workflow.
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                  <Check className="w-3 h-3 mr-1" />
                  Senior Engineer Active
                </Badge>
              </div>
            </div>

            {/* Roles */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {[
                    { id: 'senior', name: 'Senior Engineer', desc: 'Full access to development tasks', perms: ['code:read', 'code:write', 'code:review', 'deploy'] },
                    { id: 'junior', name: 'Junior Engineer', desc: 'Limited development access', perms: ['code:read', 'code:write'] },
                    { id: 'pm', name: 'Project Manager', desc: 'Project and task management', perms: ['task:read', 'task:write', 'project:read'] },
                    { id: 'qa', name: 'QA Engineer', desc: 'Bug tracking and testing', perms: ['task:read', 'bug:write', 'test:run'] },
                  ].map((role) => (
                    <div
                      key={role.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium">{role.name}</p>
                          <p className="text-xs text-muted-foreground">{role.desc}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {role.perms.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-1 bg-muted rounded text-xs font-mono"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="mt-0 space-y-4">
            {/* Tab Guide */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Security & Permissions</p>
                  <p className="text-xs text-amber-700">
                    Control what AI can access and modify in your project. Enable only the permissions you need for security.
                  </p>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Changes take effect immediately
                </Badge>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </PageShell>
  );
}

// Helper Components
function StatusBadge({ status }: { status: 'connected' | 'disconnected' | 'error' }) {
  const config = {
    connected: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Connected' },
    disconnected: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Disconnected' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
  };
  const { bg, text, label } = config[status];

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}>
      {label}
    </span>
  );
}

function QuickSetupButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Server;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 border border-violet-200 rounded-lg bg-white hover:bg-violet-50 transition-colors text-left"
    >
      <Icon className="w-5 h-5 text-violet-600 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-violet-900">{title}</p>
        <p className="text-[10px] text-violet-700">{description}</p>
      </div>
    </button>
  );
}

function QuotaCard({ provider, usedTokens, quotaLimit }: { provider: AIProvider; usedTokens: number; quotaLimit: number }) {
  const percentage = Math.round((usedTokens / quotaLimit) * 100);

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium">{provider.name}</p>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
          {percentage}%
        </Badge>
      </div>
      <Progress value={percentage} className="h-1.5 mb-1" />
      <p className="text-[10px] text-muted-foreground">
        {usedTokens.toLocaleString()} / {quotaLimit.toLocaleString()} tokens
      </p>
    </div>
  );
}

function TrustLevelCard({ level }: { level: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium">Trust Level</p>
        <span className="text-sm font-semibold">{level}%</span>
      </div>
      <Progress value={level} className="h-1.5 mb-1" />
      <p className="text-[10px] text-muted-foreground">AI autonomy level</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'emerald' | 'violet' | 'blue' }) {
  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    violet: 'bg-violet-50 border-violet-200 text-violet-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
  };

  return (
    <div className={cn('rounded-lg p-3 border', colorClasses[color])}>
      <p className="text-[10px] opacity-70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

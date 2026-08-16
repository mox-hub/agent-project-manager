import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useTheme } from '@/shared/theme/theme-context';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useGlobalConfig, useUpdateGlobalConfig, useShortIdPrefix, useUpdateShortIdPrefix } from '@/modules/config/hooks/use-global-config';
import { useShortIdStats, useBackfillShortIds } from '@/modules/task/hooks/use-project-tasks';
import { LanguageSwitcher } from '@/components/kibo-ui/language-switcher';
import { useGitToolStatus, useSetGitPath } from '@/modules/git/hooks/use-git-tool';
import { useTerminalStatus, useTestShell } from '@/modules/runtime/hooks/use-terminal-status';
import { eventClient } from '@/infrastructure/event-client';
import {
  Settings,
  Palette,
  GitBranch,
  Terminal,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangleIcon,
  Tags,
  FolderOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TagManager } from '@/modules/core-config/components/tag-manager';
import { StatusManager } from '@/modules/core-config/components/status-manager';
import { RoleManager } from '@/modules/core-config/components/role-manager';
import { TemplateManager } from '@/modules/core-config/components/template-manager';
import { StorageSettings } from '@/modules/settings/components/storage-settings';
import type { FontFamily } from '@/shared/theme/theme-context';
import { Hash, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

// 设置菜单类型
type SettingsMenuItem = 'appearance' | 'git' | 'terminal' | 'labels' | 'statuses' | 'roles' | 'templates' | 'storage' | 'shortId';

interface SettingsMenuProps {
  activeMenu: SettingsMenuItem;
  onMenuChange: (menu: SettingsMenuItem) => void;
}

function SettingsMenu({ activeMenu, onMenuChange }: SettingsMenuProps) {
  const { t } = useTranslation();
  const { data: gitStatus, isLoading: gitLoading } = useGitToolStatus();
  const { data: terminalStatus, isLoading: terminalLoading } = useTerminalStatus();

  const menuItems: { id: SettingsMenuItem; label: string; icon: React.ElementType }[] = [
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'git', label: t('settings.git'), icon: GitBranch },
    { id: 'terminal', label: t('settings.terminal'), icon: Terminal },
    { id: 'labels', label: t('settings.labels'), icon: Tags },
    { id: 'statuses', label: t('settings.statuses'), icon: Tags },
    { id: 'roles', label: t('settings.roles'), icon: Tags },
    { id: 'templates', label: t('settings.templates'), icon: Tags },
    { id: 'shortId', label: 'Short ID', icon: Hash },
    { id: 'storage', label: '存储', icon: FolderOpen },
  ];

  return (
    <div className="flex flex-col gap-1 p-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeMenu === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onMenuChange(item.id)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Icon size={16} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.id === 'git' && (
              <GitStatusIndicator status={gitStatus} isLoading={gitLoading} />
            )}
            {item.id === 'terminal' && (
              <TerminalStatusIndicator status={terminalStatus} isLoading={terminalLoading} />
            )}
            <ChevronRight
              size={14}
              className={cn(
                'transition-transform',
                isActive ? 'rotate-90 text-accent-blue' : 'text-muted-foreground/50'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function GitStatusIndicator({
  status,
  isLoading,
}: {
  status?: { available?: boolean; error?: string };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span className="flex h-2 w-2">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-muted-foreground opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
      </span>
    );
  }

  if (!status) {
    return <span className="h-2 w-2 rounded-full bg-accent-red" />;
  }

  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full',
        status.available ? 'bg-accent-green' : 'bg-accent-yellow'
      )}
    />
  );
}

function TerminalStatusIndicator({
  status,
  isLoading,
}: {
  status?: { available?: boolean };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span className="flex h-2 w-2">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-muted-foreground opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
      </span>
    );
  }

  if (!status) {
    return <span className="h-2 w-2 rounded-full bg-accent-red" />;
  }

  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full',
        status.available ? 'bg-accent-green' : 'bg-accent-red'
      )}
    />
  );
}

// Git 工具状态卡片
function GitToolStatusCard() {
  const { t } = useTranslation();
  const { data: gitStatus, isLoading, refetch } = useGitToolStatus();
  const setGitPath = useSetGitPath();
  const [gitPathInput, setGitPathInput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (gitStatus?.path) {
      setGitPathInput(gitStatus.path);
    }
  }, [gitStatus]);

  const handleTestGit = async () => {
    setTesting(true);
    await refetch();
    setTesting(false);
  };

  const handleSaveGitPath = async () => {
    if (!gitPathInput.trim()) {
      toast.error('Please enter a valid Git path');
      return;
    }
    try {
      await setGitPath.mutateAsync(gitPathInput.trim());
      toast.success('Git path updated successfully');
      await refetch();
    } catch {
      toast.error('Failed to update Git path');
    }
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-accent-blue" />
            <CardTitle>{t('settings.gitToolStatus')}</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestGit}
            disabled={testing || isLoading}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? t('settings.gitTesting') : t('settings.gitTest')}
          </Button>
        </div>
        <CardDescription>{t('settings.gitToolStatusDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" />
            <span>{t('settings.gitChecking')}</span>
          </div>
        ) : gitStatus?.available ? (
          <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-4">
            <div className="flex items-center gap-2 text-accent-green">
              <CheckCircle2 size={16} />
              <span className="font-medium">{t('settings.gitAvailable')}</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('settings.gitVersion')}</p>
                <p className="font-mono text-sm">{gitStatus.version || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('settings.gitPath')}</p>
                <p className="truncate font-mono text-sm" title={gitStatus.path}>
                  {gitStatus.path || 'In PATH'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-4">
            <div className="flex items-center gap-2 text-accent-red">
              <XCircle size={16} />
              <span className="font-medium">{t('settings.gitUnavailable')}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {gitStatus?.error || 'Git executable could not be found.'}
            </p>
            {gitStatus?.suggestion && (
              <p className="mt-1 text-xs text-muted-foreground">{gitStatus.suggestion}</p>
            )}
          </div>
        )}

        {/* Git 路径配置 */}
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-foreground">{t('settings.gitPathInput')}</p>
          <div className="flex gap-2">
            <Input
              value={gitPathInput}
              onChange={(e) => setGitPathInput(e.target.value)}
              placeholder={t('settings.gitPathPlaceholder')}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleSaveGitPath}
              disabled={setGitPath.isPending}
              className="shrink-0"
            >
              {setGitPath.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                t('settings.gitPathSave')
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('settings.gitPathDesc')}
          </p>

          {/* 常用路径快捷选择 */}
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">{t('settings.gitQuickSelect')}</p>
            <div className="mt-2 space-y-1">
              {[
                { label: t('settings.gitPathSystem'), value: 'git' },
                { label: 'C:\\Program Files\\Git\\bin\\git.exe', value: 'C:\\Program Files\\Git\\bin\\git.exe' },
                { label: 'C:\\Program Files (x86)\\Git\\bin\\git.exe', value: 'C:\\Program Files (x86)\\Git\\bin\\git.exe' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGitPathInput(option.value)}
                  className="block w-full rounded px-2 py-1 text-left font-mono text-xs hover:bg-muted/50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 终端工具状态卡片
function TerminalToolStatusCard() {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(eventClient.isConnected());
  const { data: terminalStatus, isLoading, refetch } = useTerminalStatus();
  const testShell = useTestShell();
  const [shellPathInput, setShellPathInput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    eventClient.on('connected', handleConnect);
    eventClient.on('disconnected', handleDisconnect);
    setIsConnected(eventClient.isConnected());

    return () => {
      eventClient.off('connected', handleConnect);
      eventClient.off('disconnected', handleDisconnect);
    };
  }, []);

  useEffect(() => {
    if (terminalStatus?.defaultShell) {
      setShellPathInput(terminalStatus.defaultShell);
    }
  }, [terminalStatus]);

  const handleTestTerminal = async () => {
    setTesting(true);
    await refetch();
    setTesting(false);
  };

  const handleTestShell = async () => {
    if (!shellPathInput.trim()) {
      toast.error(t('settings.terminalPathRequired') || 'Please enter a shell path');
      return;
    }
    try {
      await testShell.mutateAsync(shellPathInput.trim());
      await refetch();
    } catch {
      // error handled in hook
    }
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-accent-blue" />
            <CardTitle>{t('settings.terminalStatus')}</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestTerminal}
            disabled={testing || isLoading}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? t('settings.terminalTesting') : t('settings.terminalTest')}
          </Button>
        </div>
        <CardDescription>{t('settings.terminalStatusDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" />
            <span>{t('settings.terminalChecking')}</span>
          </div>
        ) : terminalStatus?.available ? (
          <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-4">
            <div className="flex items-center gap-2 text-accent-green">
              <CheckCircle2 size={16} />
              <span className="font-medium">{t('settings.terminalAvailable')}</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('settings.terminalPlatform')}</p>
                <p className="font-mono text-sm">
                  {terminalStatus.isWindows ? 'Windows' : terminalStatus.platform}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('settings.terminalDefaultShell')}</p>
                <p className="truncate font-mono text-sm" title={terminalStatus.defaultShell}>
                  {terminalStatus.defaultShell}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('settings.terminalActiveSessions')}</p>
                <p className="font-mono text-sm">{terminalStatus.activeSessions}</p>
              </div>
            </div>
            {terminalStatus.availableShells && terminalStatus.availableShells.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">{t('settings.terminalAvailableShells')}</p>
                <div className="flex flex-wrap gap-2">
                  {terminalStatus.availableShells.map((shellPath) => (
                    <button
                      key={shellPath}
                      type="button"
                      onClick={() => setShellPathInput(shellPath)}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-xs hover:border-muted-foreground"
                      title={shellPath}
                    >
                      {shellPath}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-4">
            <div className="flex items-center gap-2 text-accent-red">
              <XCircle size={16} />
              <span className="font-medium">{t('settings.terminalUnavailable')}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {terminalStatus?.availableShells?.length === 0
                ? t('settings.terminalNoShells')
                : t('settings.terminalCheckFailed')}
            </p>
          </div>
        )}

        {/* Shell 路径配置 */}
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t('settings.terminalShellPath')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.terminalShellPathDesc')}</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={shellPathInput}
              onChange={(e) => setShellPathInput(e.target.value)}
              placeholder={t('settings.terminalShellPlaceholder')}
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestShell}
              disabled={testShell.isPending}
            >
              {testShell.isPending ? t('settings.terminalTesting') : t('settings.terminalTest')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 表单类型定义
type GitConfigForm = {
  defaultProvider: string;
  defaultBranch: string;
  userName: string;
  userEmail: string;
  sshKeyPath: string;
  autoSync: boolean;
  diffShowWhitespace: boolean;
};

type TerminalConfigForm = {
  defaultShell: string;
  defaultCwd: string;
  theme: string;
  historySize: number;
  autoSaveOutput: boolean;
  aiDiagnostics: boolean;
};

const defaultGitConfig: GitConfigForm = {
  defaultProvider: 'github',
  defaultBranch: 'main',
  userName: '',
  userEmail: '',
  sshKeyPath: '',
  autoSync: true,
  diffShowWhitespace: false,
};

const defaultTerminalConfig: TerminalConfigForm = {
  defaultShell: 'pwsh',
  defaultCwd: '',
  theme: 'default',
  historySize: 1000,
  autoSaveOutput: false,
  aiDiagnostics: true,
};

export function SettingsPage() {
  const { t } = useTranslation();
  const { data: config = {}, isLoading } = useGlobalConfig();
  const updateConfig = useUpdateGlobalConfig();
  const { mode, setTheme, preset, setPreset, appearance, setAppearance } = useTheme();
  const [activeMenu, setActiveMenu] = useState<SettingsMenuItem>('appearance');
  const [isSaving, setIsSaving] = useState(false);

  const gitForm = useForm<GitConfigForm>({
    defaultValues: defaultGitConfig,
  });
  const terminalForm = useForm<TerminalConfigForm>({
    defaultValues: defaultTerminalConfig,
  });

  useEffect(() => {
    if (!isLoading && Object.keys(config).length > 0) {
      gitForm.reset({
        defaultProvider: config['git.defaultProvider'] || 'github',
        defaultBranch: config['git.defaultBranch'] || 'main',
        userName: config['git.user.name'] || '',
        userEmail: config['git.user.email'] || '',
        sshKeyPath: config['git.sshKeyPath'] || '',
        autoSync: config['git.autoSync'] ?? true,
        diffShowWhitespace: config['git.diff.showWhitespace'] ?? false,
      });
      terminalForm.reset({
        defaultShell: config['terminal.defaultShell'] || 'pwsh',
        defaultCwd: config['terminal.defaultCwd'] || '',
        theme: config['terminal.theme'] || 'default',
        historySize: config['terminal.historySize'] || 1000,
        autoSaveOutput: config['terminal.autoSaveOutput'] ?? false,
        aiDiagnostics: config['terminal.aiDiagnostics'] ?? true,
      });
    }
  }, [config, gitForm, isLoading, terminalForm]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const gitValues = gitForm.getValues();
      const terminalValues = terminalForm.getValues();
      await updateConfig.mutateAsync({
        'git.defaultProvider': gitValues.defaultProvider,
        'git.defaultBranch': gitValues.defaultBranch,
        'git.user.name': gitValues.userName,
        'git.user.email': gitValues.userEmail,
        'git.sshKeyPath': gitValues.sshKeyPath,
        'git.autoSync': gitValues.autoSync,
        'git.diff.showWhitespace': gitValues.diffShowWhitespace,
        'terminal.defaultShell': terminalValues.defaultShell,
        'terminal.defaultCwd': terminalValues.defaultCwd,
        'terminal.theme': terminalValues.theme,
        'terminal.historySize': terminalValues.historySize,
        'terminal.autoSaveOutput': terminalValues.autoSaveOutput,
        'terminal.aiDiagnostics': terminalValues.aiDiagnostics,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sectionTitleClassName = 'text-sm font-medium text-foreground';
  const checkboxLabelClassName = 'flex items-center gap-2 text-sm text-muted-foreground';

  return (
    <PageShell aiPage={CORE_AI_PAGE_IDS.settings} className="overflow-auto">
      <PageHeader
        aiId="settings.global-settings"
        title={t('settings.title')}
        description={t('settings.metadataDesc')}
        icon={Settings}
        iconColor="text-accent-blue"
        actions={
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            data-ai-component="settings.global-settings.header.save"
            data-ai-action="settings.global-settings.header.save.click"
            data-ai-role="submit"
          >
            {isSaving ? t('settings.saving') : t('settings.saveChanges')}
          </Button>
        }
      />

      <div className="flex h-full">
        {/* 左侧菜单 */}
        <aside className="w-56 shrink-0 border-r border-border bg-background">
          <SettingsMenu activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Appearance 设置 */}
            {activeMenu === 'appearance' && (
              <>
                <Card
                  className="border-border shadow-none"
                  data-ai-component="settings.global-settings.appearance-card"
                >
                  <CardHeader>
                    <CardTitle>{t('settings.appearanceTitle')}</CardTitle>
                    <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 主题模式预览卡片 */}
                    <div>
                      <p className={sectionTitleClassName}>{t('settings.themeMode')}</p>
                      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {[
                          { id: 'light', label: t('settings.lightMode'), desc: '清爽明亮，适合白天使用', bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200', preview: 'bg-gray-50' },
                          { id: 'dark', label: t('settings.darkMode'), desc: '柔和护眼，适合夜间使用', bg: 'bg-[#09090b]', text: 'text-gray-100', border: 'border-gray-800', preview: 'bg-gray-900' },
                        ].map((item) => {
                          const isActive = mode === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setTheme(item.id as 'light' | 'dark')}
                              className={`relative rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.02] ${
                                isActive ? `${item.border} ring-2 ring-accent-blue` : 'border-border hover:border-muted-foreground'
                              }`}
                            >
                              {/* 预览窗口 */}
                              <div className={`aspect-video w-full rounded-lg ${item.bg} ${item.border} border p-2 mb-3`}>
                                <div className={`h-full ${item.preview} rounded-md p-1.5`}>
                                  <div className={`h-2 w-3/4 rounded ${item.id === 'light' ? 'bg-gray-300' : 'bg-gray-700'} mb-1`} />
                                  <div className={`h-1.5 w-1/2 rounded ${item.id === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} />
                                </div>
                              </div>
                              <p className={`font-medium ${isActive ? item.text : 'text-foreground'}`}>{item.label}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                              {isActive && (
                                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue">
                                  <CheckCircle2 size={12} className="text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 主题预设 */}
                    <div>
                      <p className={sectionTitleClassName}>{t('settings.themePreset')}</p>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {[
                          { id: 'figma', label: 'Figma', desc: '现代简洁' },
                          { id: 'linear', label: 'Linear', desc: '科技感强' },
                          { id: 'notion', label: 'Notion', desc: '简约优雅' },
                        ].map((item) => {
                          const isActive = preset === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setPreset(item.id as 'figma' | 'linear' | 'notion')}
                              className={`rounded-lg border p-3 text-center transition-all hover:scale-[1.02] ${
                                isActive
                                  ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                                  : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <p className="font-medium">{item.label}</p>
                              <p className="mt-0.5 text-xs opacity-70">{item.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 界面缩放 */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className={sectionTitleClassName}>{t('settings.interfaceZoom')}</p>
                        <span className="font-mono text-sm text-muted-foreground">{appearance.zoom}%</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAppearance({ zoom: Math.max(50, appearance.zoom - 10) })}
                          disabled={appearance.zoom <= 50}
                        >
                          <span className="text-lg">−</span>
                        </Button>
                        <input
                          type="range"
                          min="50"
                          max="200"
                          step="10"
                          value={appearance.zoom}
                          onChange={(e) => setAppearance({ zoom: Number(e.target.value) })}
                          className="flex-1 accent-accent-blue"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAppearance({ zoom: Math.min(200, appearance.zoom + 10) })}
                          disabled={appearance.zoom >= 200}
                        >
                          <span className="text-lg">+</span>
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{t('settings.interfaceZoomDesc')}</p>
                    </div>

                    {/* 字体选择 */}
                    <div>
                      <p className={sectionTitleClassName}>{t('settings.fontFamily')}</p>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {[
                          { id: 'default', label: t('settings.fontDefault'), sample: 'Aa', style: 'font-sans' },
                          { id: 'sans', label: t('settings.fontSans'), sample: 'Aa', style: 'font-[system-ui]' },
                          { id: 'mono', label: t('settings.fontMono'), sample: 'Aa', style: 'font-mono' },
                        ].map((item) => {
                          const isActive = appearance.fontFamily === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setAppearance({ fontFamily: item.id as FontFamily })}
                              className={`rounded-lg border p-3 text-center transition-all hover:scale-[1.02] ${item.style} ${
                                isActive
                                  ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                                  : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <p className="text-2xl font-medium">{item.sample}</p>
                              <p className="mt-1 text-xs">{item.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 字号调整 */}
                    <div>
                      <p className={sectionTitleClassName}>{t('settings.fontSize')}</p>
                      <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-4">
                        <button
                          type="button"
                          onClick={() => setAppearance({ fontSize: 'small' })}
                          className={`flex-1 text-center ${appearance.fontSize === 'small' ? 'text-accent-blue font-medium' : 'text-muted-foreground'}`}
                        >
                          <p className="text-sm">小</p>
                          <p className="text-xs">Small</p>
                        </button>
                        <div className={`mx-4 flex-1 text-center ${appearance.fontSize === 'medium' ? 'text-accent-blue font-medium' : 'text-muted-foreground'}`}>
                          <p className="text-base">中</p>
                          <p className="text-sm">Medium</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppearance({ fontSize: 'large' })}
                          className={`flex-1 text-center ${appearance.fontSize === 'large' ? 'text-accent-blue font-medium' : 'text-muted-foreground'}`}
                        >
                          <p className="text-lg">大</p>
                          <p className="text-sm">Large</p>
                        </button>
                      </div>
                    </div>

                    {/* 语言设置 */}
                    <div>
                      <p className={sectionTitleClassName}>{t("settings.language.title")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("settings.language.description")}
                      </p>
                      <div className="mt-2">
                        <LanguageSwitcher />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Git 设置 */}
            {activeMenu === 'git' && (
              <>
                {/* Git 工具状态卡片 */}
                <GitToolStatusCard />

                {/* Git 配置卡片 */}
                <Card
                  className="border-border shadow-none"
                  data-ai-component="settings.global-settings.git-card"
                >
                  <CardHeader>
                    <CardTitle>{t('settings.gitTitle')}</CardTitle>
                    <CardDescription>{t('settings.gitDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Form {...gitForm}>
                      <div className="contents">
                        <FormField
                          control={gitForm.control}
                          name="defaultProvider"
                          render={({ field }) => (
                            <Field>
                              <FieldLabel htmlFor="defaultProvider">{t('settings.gitProvider')}</FieldLabel>
                              <FieldContent>
                                <NativeSelect
                                  id="defaultProvider"
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
                                >
                                  <NativeSelectOption value="github">GitHub</NativeSelectOption>
                                  <NativeSelectOption value="gitlab">GitLab</NativeSelectOption>
                                  <NativeSelectOption value="gitea">Gitea</NativeSelectOption>
                                  <NativeSelectOption value="local">Local</NativeSelectOption>
                                </NativeSelect>
                                <FieldDescription>{t('settings.gitProviderDesc')}</FieldDescription>
                              </FieldContent>
                            </Field>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="defaultBranch"
                          render={({ field }) => (
                            <Field>
                              <FieldLabel htmlFor="defaultBranch">{t('settings.gitDefaultBranch')}</FieldLabel>
                              <FieldContent>
                                <Input
                                  id="defaultBranch"
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
                                />
                                <FieldDescription>{t('settings.gitDefaultBranchDesc')}</FieldDescription>
                              </FieldContent>
                            </Field>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="userName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="gitUserName">{t('settings.gitUserName')}</FormLabel>
                              <Input
                                id="gitUserName"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                className="mt-1"
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="userEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="gitUserEmail">{t('settings.gitUserEmail')}</FormLabel>
                              <Input
                                id="gitUserEmail"
                                type="email"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                className="mt-1"
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="sshKeyPath"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel htmlFor="sshKeyPath">{t('settings.gitSshKey')}</FormLabel>
                              <Input
                                id="sshKeyPath"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                className="mt-1"
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="autoSync"
                          render={({ field }) => (
                            <label className={checkboxLabelClassName}>
                              <Checkbox
                                checked={field.value}
                                onChange={(event) => field.onChange(event.target.checked)}
                              />
                              {t('settings.gitAutoSync')}
                            </label>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="diffShowWhitespace"
                          render={({ field }) => (
                            <label className={checkboxLabelClassName}>
                              <Checkbox
                                checked={field.value}
                                onChange={(event) => field.onChange(event.target.checked)}
                              />
                              {t('settings.gitShowWhitespace')}
                            </label>
                          )}
                        />
                      </div>
                    </Form>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Terminal 设置 */}
            {activeMenu === 'terminal' && (
              <>
                {/* 终端工具状态卡片 */}
                <TerminalToolStatusCard />

                {/* 终端配置卡片 */}
                <Card
                  className="border-border shadow-none"
                  data-ai-component="settings.global-settings.terminal-card"
                >
                  <CardHeader>
                    <CardTitle>{t('settings.terminalTitle')}</CardTitle>
                    <CardDescription>{t('settings.terminalDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Form {...terminalForm}>
                      <div className="contents">
                      <FormField
                        control={terminalForm.control}
                        name="defaultShell"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="terminalShell">{t('settings.terminalShell')}</FormLabel>
                            <NativeSelect
                              id="terminalShell"
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              className="mt-1"
                            >
                              <NativeSelectOption value="pwsh">PowerShell (pwsh)</NativeSelectOption>
                              <NativeSelectOption value="bash">Bash</NativeSelectOption>
                              <NativeSelectOption value="zsh">Zsh</NativeSelectOption>
                              <NativeSelectOption value="cmd">CMD (Windows)</NativeSelectOption>
                            </NativeSelect>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={terminalForm.control}
                        name="theme"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="terminalTheme">{t('settings.terminalTheme')}</FormLabel>
                            <NativeSelect
                              id="terminalTheme"
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              className="mt-1"
                            >
                              <NativeSelectOption value="default">Default</NativeSelectOption>
                              <NativeSelectOption value="dark">Dark</NativeSelectOption>
                              <NativeSelectOption value="light">Light</NativeSelectOption>
                              <NativeSelectOption value="monokai">Monokai</NativeSelectOption>
                            </NativeSelect>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={terminalForm.control}
                        name="defaultCwd"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel htmlFor="terminalCwd">{t('settings.terminalCwd')}</FormLabel>
                            <Input
                              id="terminalCwd"
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              placeholder={t('settings.terminalCwdPlaceholder')}
                              className="mt-1"
                            />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={terminalForm.control}
                        name="historySize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="terminalHistory">{t('settings.terminalHistory')}</FormLabel>
                            <Input
                              id="terminalHistory"
                              type="number"
                              min={100}
                              max={10000}
                              value={field.value}
                              onChange={(event) => field.onChange(Number(event.target.value) || 1000)}
                              className="mt-1"
                            />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-col justify-end gap-2">
                        <FormField
                          control={terminalForm.control}
                          name="autoSaveOutput"
                          render={({ field }) => (
                            <label className={checkboxLabelClassName}>
                              <Checkbox
                                checked={field.value}
                                onChange={(event) => field.onChange(event.target.checked)}
                              />
                              {t('settings.terminalAutoSave')}
                            </label>
                          )}
                        />
                        <FormField
                          control={terminalForm.control}
                          name="aiDiagnostics"
                          render={({ field }) => (
                            <label className={checkboxLabelClassName}>
                              <Checkbox
                                checked={field.value}
                                onChange={(event) => field.onChange(event.target.checked)}
                              />
                              {t('settings.terminalAiDiag')}
                            </label>
                          )}
                        />
                      </div>
                    </div>
                  </Form>
                </CardContent>
              </Card>
              </>
            )}

            {/* Labels 设置 */}
            {activeMenu === 'labels' && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">{t('settings.labels')}</h2>
                <TagManager />
              </div>
            )}

            {/* Statuses 设置 */}
            {activeMenu === 'statuses' && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">{t('settings.statuses')}</h2>
                <StatusManager />
              </div>
            )}

            {/* Roles 设置 */}
            {activeMenu === 'roles' && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">{t('settings.roles')}</h2>
                <RoleManager />
              </div>
            )}

            {/* Templates 设置 */}
            {activeMenu === 'templates' && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">{t('settings.templates')}</h2>
                <TemplateManager />
              </div>
            )}

            {/* Short ID 设置 */}
            {activeMenu === 'shortId' && (
              <ShortIdSettingsCard />
            )}

            {/* Storage 设置 */}
            {activeMenu === 'storage' && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">文档存储</h2>
                <StorageSettings />
              </div>
            )}
          </div>
        </main>
      </div>
    </PageShell>
  );
}

// Short ID 设置卡片
function ShortIdSettingsCard() {
  const { data: prefix, isLoading: prefixLoading } = useShortIdPrefix();
  const updatePrefix = useUpdateShortIdPrefix();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useShortIdStats();
  const backfillMutation = useBackfillShortIds();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefix) {
      setInputValue(prefix);
    }
  }, [prefix]);

  const validatePrefix = (value: string): boolean => {
    if (!/^[A-Z]{2,4}$/.test(value)) {
      setError('前缀必须是 2-4 个大写字母');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validatePrefix(inputValue)) return;

    try {
      await updatePrefix.mutateAsync(inputValue);
      toast.success('Short ID 前缀已更新');
    } catch {
      toast.error('更新失败');
    }
  };

  const handleBackfill = async () => {
    try {
      await backfillMutation.mutateAsync();
      refetchStats();
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <Card className="border-border shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-accent-blue" />
              <CardTitle>Short ID 统计</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchStats()}
              disabled={statsLoading}
            >
              <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
          <CardDescription>
            查看系统中任务的 Short ID 分配情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw size={14} className="animate-spin" />
              加载中...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">总任务数</p>
              </div>
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={16} className="text-accent-green" />
                  <p className="text-2xl font-bold text-accent-green">{stats.withShortId}</p>
                </div>
                <p className="text-xs text-muted-foreground">已有 Short ID</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <AlertCircle size={16} className="text-amber-500" />
                  <p className="text-2xl font-bold text-amber-500">{stats.withoutShortId}</p>
                </div>
                <p className="text-xs text-muted-foreground">缺少 Short ID</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">无法加载统计数据</div>
          )}

          {/* Backfill 按钮 */}
          {stats && stats.withoutShortId > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium">补充缺少的 Short ID</p>
                <p className="text-xs text-muted-foreground">
                  为 {stats.withoutShortId} 个任务自动分配 Short ID
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleBackfill}
                disabled={backfillMutation.isPending}
                className="gap-1.5"
              >
                {backfillMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    执行补充
                  </>
                )}
              </Button>
            </div>
          )}

          {stats && stats.withoutShortId === 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-4">
              <CheckCircle size={16} className="text-accent-green" />
              <p className="text-sm text-accent-green">所有任务都已分配 Short ID</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 前缀设置卡片 */}
      <Card className="border-border shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-accent-blue" />
            <CardTitle>Short ID 前缀设置</CardTitle>
          </div>
          <CardDescription>
            设置任务 Short ID 的前缀。Short ID 格式为: 前缀-模块代码-序号 (例如: APM-PF-001)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefixLoading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Short ID 前缀</label>
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder="例如: APM"
                    maxLength={4}
                    className={cn('w-32 font-mono', error && 'border-destructive')}
                  />
                  <Button
                    onClick={handleSave}
                    disabled={updatePrefix.isPending || !inputValue}
                  >
                    {updatePrefix.isPending ? '保存中...' : '保存'}
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground">
                  请输入 2-4 个大写字母，例如 APM、PROJ、DEV 等。
                </p>
              </div>

              {/* 预览 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">预览</p>
                <div className="font-mono text-sm">
                  <span className="text-muted-foreground">{inputValue || '???'}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground">XX</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-accent-blue">001</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
import { useGlobalConfig, useUpdateGlobalConfig } from '@/modules/config/hooks/use-global-config';
import { LanguageSwitcher } from '@/components/kibo-ui/language-switcher';
import { useGitToolStatus, useSetGitPath } from '@/modules/git/hooks/use-git-tool';
import {
  Settings,
  Palette,
  GitBranch,
  Terminal,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangleIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// 设置菜单类型
type SettingsMenuItem = 'appearance' | 'git' | 'terminal';

interface SettingsMenuProps {
  activeMenu: SettingsMenuItem;
  onMenuChange: (menu: SettingsMenuItem) => void;
}

function SettingsMenu({ activeMenu, onMenuChange }: SettingsMenuProps) {
  const { t } = useTranslation();
  const { data: gitStatus, isLoading: gitLoading } = useGitToolStatus();

  const menuItems: { id: SettingsMenuItem; label: string; icon: React.ElementType }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'git', label: 'Git', icon: GitBranch },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
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

// Git 工具状态卡片
function GitToolStatusCard() {
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
            <CardTitle>Git Tool Status</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestGit}
            disabled={testing || isLoading}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? 'Testing...' : 'Test'}
          </Button>
        </div>
        <CardDescription>Check Git availability and configure executable path</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" />
            <span>Checking Git status...</span>
          </div>
        ) : gitStatus?.available ? (
          <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-4">
            <div className="flex items-center gap-2 text-accent-green">
              <CheckCircle2 size={16} />
              <span className="font-medium">Git is available</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="font-mono text-sm">{gitStatus.version || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Executable Path</p>
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
              <span className="font-medium">Git is not available</span>
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
          <p className="text-sm font-medium text-foreground">Git Executable Path</p>
          <div className="flex gap-2">
            <Input
              value={gitPathInput}
              onChange={(e) => setGitPathInput(e.target.value)}
              placeholder="git or C:\Program Files\Git\bin\git.exe"
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
                'Save'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the path to the Git executable. Use "git" to search in PATH, or specify the full path.
          </p>

          {/* 常用路径快捷选择 */}
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Quick Select</p>
            <div className="mt-2 space-y-1">
              {[
                { label: 'git (system PATH)', value: 'git' },
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
  const { mode, setTheme, preset, setPreset } = useTheme();
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
        title="Settings"
        description="统一管理主题风格、Git 配置与终端行为。"
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
            {isSaving ? 'Saving...' : 'Save Changes'}
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
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>统一日夜主题体验并设置风格预设。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className={sectionTitleClassName}>Theme Mode</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant={mode === 'light' ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => setTheme('light')}
                        >
                          Light
                        </Button>
                        <Button
                          variant={mode === 'dark' ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => setTheme('dark')}
                        >
                          Dark
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className={sectionTitleClassName}>Theme Preset</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant={preset === 'figma' ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => setPreset('figma')}
                        >
                          Figma
                        </Button>
                        <Button
                          variant={preset === 'linear' ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => setPreset('linear')}
                        >
                          Linear
                        </Button>
                        <Button
                          variant={preset === 'notion' ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => setPreset('notion')}
                        >
                          Notion
                        </Button>
                      </div>
                    </div>

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
                    <CardTitle>Git Configuration</CardTitle>
                    <CardDescription>设置全局仓库提供商、用户信息与同步策略。</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Form {...gitForm}>
                      <div className="contents">
                        <FormField
                          control={gitForm.control}
                          name="defaultProvider"
                          render={({ field }) => (
                            <Field>
                              <FieldLabel htmlFor="defaultProvider">Default Provider</FieldLabel>
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
                                <FieldDescription>默认远端平台来源。</FieldDescription>
                              </FieldContent>
                            </Field>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="defaultBranch"
                          render={({ field }) => (
                            <Field>
                              <FieldLabel htmlFor="defaultBranch">Default Branch</FieldLabel>
                              <FieldContent>
                                <Input
                                  id="defaultBranch"
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
                                />
                                <FieldDescription>新仓库默认分支名称。</FieldDescription>
                              </FieldContent>
                            </Field>
                          )}
                        />
                        <FormField
                          control={gitForm.control}
                          name="userName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="gitUserName">User Name</FormLabel>
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
                              <FormLabel htmlFor="gitUserEmail">User Email</FormLabel>
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
                              <FormLabel htmlFor="sshKeyPath">SSH Key Path</FormLabel>
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
                              Enable automatic Git sync
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
                              Show whitespace changes in diff
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
              <Card
                className="border-border shadow-none"
                data-ai-component="settings.global-settings.terminal-card"
              >
                <CardHeader>
                  <CardTitle>Terminal Configuration</CardTitle>
                  <CardDescription>配置默认 shell、输出策略与 AI 诊断偏好。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Form {...terminalForm}>
                    <div className="contents">
                      <FormField
                        control={terminalForm.control}
                        name="defaultShell"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="terminalShell">Default Shell</FormLabel>
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
                            <FormLabel htmlFor="terminalTheme">Terminal Theme</FormLabel>
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
                            <FormLabel htmlFor="terminalCwd">Default Working Directory</FormLabel>
                            <Input
                              id="terminalCwd"
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              placeholder="Leave empty to use project directory"
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
                            <FormLabel htmlFor="terminalHistory">Command History Size</FormLabel>
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
                              Automatically save command output
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
                              Enable AI diagnostics for terminal errors
                            </label>
                          )}
                        />
                      </div>
                    </div>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </PageShell>
  );
}

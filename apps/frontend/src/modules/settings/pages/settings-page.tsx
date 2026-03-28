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
  const { data: config = {}, isLoading } = useGlobalConfig();
  const updateConfig = useUpdateGlobalConfig();
  const { mode, setTheme, preset, setPreset } = useTheme();
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
        description="统一管理主题风格、Git 默认策略与终端行为。"
        actions={(
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            data-ai-component="settings.global-settings.header.save"
            data-ai-action="settings.global-settings.header.save.click"
            data-ai-role="submit"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      />
      <section
        className="border-b border-border bg-background px-6 py-3 md:px-7"
        data-ai-component="settings.global-settings.context-bar"
        data-ai-role="filter"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted/50 px-2 py-1">Appearance</span>
          <span className="rounded-full bg-muted/50 px-2 py-1">Git</span>
          <span className="rounded-full bg-muted/50 px-2 py-1">Terminal</span>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1280px] gap-4 p-6 md:px-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <Card
            className="border-border shadow-none"
            data-ai-component="settings.global-settings.appearance-card"
            data-ai-role="content"
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
                    data-ai-component="settings.global-settings.appearance.mode-light"
                    data-ai-action="settings.global-settings.appearance.mode-light.click"
                    data-ai-role="select"
                  >
                    Light
                  </Button>
                  <Button
                    variant={mode === 'dark' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    data-ai-component="settings.global-settings.appearance.mode-dark"
                    data-ai-action="settings.global-settings.appearance.mode-dark.click"
                    data-ai-role="select"
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
                    data-ai-component="settings.global-settings.appearance.preset-figma"
                    data-ai-action="settings.global-settings.appearance.preset-figma.click"
                    data-ai-role="select"
                  >
                    Figma
                  </Button>
                  <Button
                    variant={preset === 'linear' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setPreset('linear')}
                    data-ai-component="settings.global-settings.appearance.preset-linear"
                    data-ai-action="settings.global-settings.appearance.preset-linear.click"
                    data-ai-role="select"
                  >
                    Linear
                  </Button>
                  <Button
                    variant={preset === 'notion' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setPreset('notion')}
                    data-ai-component="settings.global-settings.appearance.preset-notion"
                    data-ai-action="settings.global-settings.appearance.preset-notion.click"
                    data-ai-role="select"
                  >
                    Notion
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-none"
            data-ai-component="settings.global-settings.git-card"
            data-ai-role="content"
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
                            data-ai-component="settings.global-settings.git.default-provider"
                            data-ai-action="settings.global-settings.git.default-provider.change"
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
                            data-ai-component="settings.global-settings.git.default-branch"
                            data-ai-action="settings.global-settings.git.default-branch.change"
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
                          data-ai-component="settings.global-settings.git.user-name"
                          data-ai-action="settings.global-settings.git.user-name.change"
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
                          data-ai-component="settings.global-settings.git.user-email"
                          data-ai-action="settings.global-settings.git.user-email.change"
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
                          data-ai-component="settings.global-settings.git.ssh-key-path"
                          data-ai-action="settings.global-settings.git.ssh-key-path.change"
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
                          data-ai-component="settings.global-settings.git.auto-sync"
                          data-ai-action="settings.global-settings.git.auto-sync.toggle"
                          data-ai-role="select"
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
                          data-ai-component="settings.global-settings.git.diff-whitespace"
                          data-ai-action="settings.global-settings.git.diff-whitespace.toggle"
                          data-ai-role="select"
                        />
                        Show whitespace changes in diff
                      </label>
                    )}
                  />
                </div>
              </Form>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-none"
            data-ai-component="settings.global-settings.terminal-card"
            data-ai-role="content"
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
                          data-ai-component="settings.global-settings.terminal.default-shell"
                          data-ai-action="settings.global-settings.terminal.default-shell.change"
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
                          data-ai-component="settings.global-settings.terminal.theme"
                          data-ai-action="settings.global-settings.terminal.theme.change"
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
                          data-ai-component="settings.global-settings.terminal.default-cwd"
                          data-ai-action="settings.global-settings.terminal.default-cwd.change"
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
                          data-ai-component="settings.global-settings.terminal.history-size"
                          data-ai-action="settings.global-settings.terminal.history-size.change"
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
                            data-ai-component="settings.global-settings.terminal.auto-save-output"
                            data-ai-action="settings.global-settings.terminal.auto-save-output.toggle"
                            data-ai-role="select"
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
                            data-ai-component="settings.global-settings.terminal.ai-diagnostics"
                            data-ai-action="settings.global-settings.terminal.ai-diagnostics.toggle"
                            data-ai-role="select"
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
        </div>

      </div>
    </PageShell>
  );
}

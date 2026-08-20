import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { useGlobalConfig, useUpdateGlobalConfig } from '@/modules/config/hooks/use-global-config';
import { useTerminalStatus, useTestShell } from '@/modules/runtime/hooks/use-terminal-status';
import { eventClient } from '@/infrastructure/event-client';
import { Terminal, RefreshCw, CheckCircle2, XCircle, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// 表单类型定义
type TerminalConfigForm = {
  defaultShell: string;
  defaultCwd: string;
  theme: string;
  historySize: number;
  autoSaveOutput: boolean;
  aiDiagnostics: boolean;
};

const defaultTerminalConfig: TerminalConfigForm = {
  defaultShell: 'pwsh',
  defaultCwd: '',
  theme: 'default',
  historySize: 1000,
  autoSaveOutput: false,
  aiDiagnostics: true,
};

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

/** 终端设置子页：终端状态 + 终端配置表单（保存动作在本页 header） */
export function TerminalSettingsSection() {
  const { t } = useTranslation();
  const { data: config = {}, isLoading } = useGlobalConfig();
  const updateConfig = useUpdateGlobalConfig();
  const [isSaving, setIsSaving] = useState(false);

  const terminalForm = useForm<TerminalConfigForm>({
    defaultValues: defaultTerminalConfig,
  });

  useEffect(() => {
    if (!isLoading && Object.keys(config).length > 0) {
      terminalForm.reset({
        defaultShell: config['terminal.defaultShell'] || 'pwsh',
        defaultCwd: config['terminal.defaultCwd'] || '',
        theme: config['terminal.theme'] || 'default',
        historySize: config['terminal.historySize'] || 1000,
        autoSaveOutput: config['terminal.autoSaveOutput'] ?? false,
        aiDiagnostics: config['terminal.aiDiagnostics'] ?? true,
      });
    }
  }, [config, isLoading, terminalForm]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const terminalValues = terminalForm.getValues();
      await updateConfig.mutateAsync({
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

  const checkboxLabelClassName = 'flex items-center gap-2 text-sm text-muted-foreground';

  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader
        icon={Terminal}
        title={t('settings.terminal')}
        actions={
          <HeaderActionButton
            icon={Save}
            label={isSaving ? t('settings.saving') : t('settings.saveChanges')}
            pinned
            onClick={handleSave}
            disabled={isSaving || isLoading}
            data-ai-component="settings.global-settings.header.save"
            data-ai-action="settings.global-settings.header.save.click"
          />
        }
      />
      <div className="p-6">
        <div className="mx-auto max-w-3xl space-y-6">
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
        </div>
      </div>
    </PageShell>
  );
}

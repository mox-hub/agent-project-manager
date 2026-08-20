import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { useGlobalConfig, useUpdateGlobalConfig } from '@/modules/config/hooks/use-global-config';
import { useGitToolStatus, useSetGitPath } from '@/modules/git/hooks/use-git-tool';
import { GitBranch, RefreshCw, CheckCircle2, XCircle, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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

const defaultGitConfig: GitConfigForm = {
  defaultProvider: 'github',
  defaultBranch: 'main',
  userName: '',
  userEmail: '',
  sshKeyPath: '',
  autoSync: true,
  diffShowWhitespace: false,
};

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

/** Git 设置子页：工具状态 + git 配置表单（保存动作在本页 header） */
export function GitSettingsSection() {
  const { t } = useTranslation();
  const { data: config = {}, isLoading } = useGlobalConfig();
  const updateConfig = useUpdateGlobalConfig();
  const [isSaving, setIsSaving] = useState(false);

  const gitForm = useForm<GitConfigForm>({
    defaultValues: defaultGitConfig,
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
    }
  }, [config, gitForm, isLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const gitValues = gitForm.getValues();
      await updateConfig.mutateAsync({
        'git.defaultProvider': gitValues.defaultProvider,
        'git.defaultBranch': gitValues.defaultBranch,
        'git.user.name': gitValues.userName,
        'git.user.email': gitValues.userEmail,
        'git.sshKeyPath': gitValues.sshKeyPath,
        'git.autoSync': gitValues.autoSync,
        'git.diff.showWhitespace': gitValues.diffShowWhitespace,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const checkboxLabelClassName = 'flex items-center gap-2 text-sm text-muted-foreground';

  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader
        icon={GitBranch}
        title={t('settings.git')}
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
        </div>
      </div>
    </PageShell>
  );
}

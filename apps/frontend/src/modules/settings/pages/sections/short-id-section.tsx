import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { useUpdateShortIdPrefix, useShortIdPrefix } from '@/modules/config/hooks/use-global-config';
import { useBackfillShortIds, useShortIdStats } from '@/modules/task/hooks/use-project-tasks';
import { Hash, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/** Short ID 设置子页：ID 统计与回填 + 前缀配置 */
export function ShortIdSettingsSection() {
  const { t } = useTranslation();

  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={Hash} title={t('settings.shortId')} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <ShortIdSettingsCard />
        </div>
      </div>
    </PageShell>
  );
}

// Short ID 设置卡片
function ShortIdSettingsCard() {
  const { t } = useTranslation();
  const { data: prefix, isLoading: prefixLoading } = useShortIdPrefix();
  const updatePrefix = useUpdateShortIdPrefix();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useShortIdStats();
  const backfillMutation = useBackfillShortIds();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // prefix 就绪后填充输入框（渲染期间调整，避免 effect 内同步 setState）
  const [prevPrefix, setPrevPrefix] = useState(prefix);
  if (prevPrefix !== prefix && prefix) {
    setPrevPrefix(prefix);
    setInputValue(prefix);
  }

  const validatePrefix = (value: string): boolean => {
    if (!/^[A-Z]{2,4}$/.test(value)) {
      setError(t('settings.shortIdPrefixInvalid'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validatePrefix(inputValue)) return;

    try {
      await updatePrefix.mutateAsync(inputValue);
      toast.success(t('settings.shortIdPrefixUpdated'));
    } catch {
      toast.error(t('settings.updateFailed'));
    }
  };

  const handleBackfill = async () => {
    try {
      await backfillMutation.mutateAsync();
      refetchStats();
    } catch {
      // Error handled in hook
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
              <CardTitle>{t('settings.shortIdStatsTitle')}</CardTitle>
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
            {t('settings.shortIdStatsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw size={14} className="animate-spin" />
              {t('common.loading')}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t('settings.shortIdStatTotal')}</p>
              </div>
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={16} className="text-accent-green" />
                  <p className="text-2xl font-bold text-accent-green">{stats.withShortId}</p>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.shortIdStatWith')}</p>
              </div>
              <div className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/5 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <AlertCircle size={16} className="text-accent-yellow" />
                  <p className="text-2xl font-bold text-accent-yellow">{stats.withoutShortId}</p>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.shortIdStatWithout')}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('settings.shortIdStatsError')}</div>
          )}

          {/* Backfill 按钮 */}
          {stats && stats.withoutShortId > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium">{t('settings.shortIdBackfill')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.shortIdBackfillDesc', { count: stats.withoutShortId })}
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
                    {t('settings.backfillRunning')}
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    {t('settings.backfillNow')}
                  </>
                )}
              </Button>
            </div>
          )}

          {stats && stats.withoutShortId === 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-4">
              <CheckCircle size={16} className="text-accent-green" />
              <p className="text-sm text-accent-green">{t('settings.shortIdAllDone')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 前缀设置卡片 */}
      <Card className="border-border shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-accent-blue" />
            <CardTitle>{t('settings.shortIdPrefixTitle')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.shortIdPrefixDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefixLoading ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('settings.shortIdPrefixLabel')}</label>
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder={t('settings.shortIdPlaceholder')}
                    maxLength={4}
                    className={cn('w-32 font-mono', error && 'border-destructive')}
                  />
                  <Button
                    onClick={handleSave}
                    disabled={updatePrefix.isPending || !inputValue}
                  >
                    {updatePrefix.isPending ? t('settings.saving') : t('common.save')}
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground">
                  {t('settings.shortIdHint')}
                </p>
              </div>

              {/* 预览 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t('settings.preview')}</p>
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

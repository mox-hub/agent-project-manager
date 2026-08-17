import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, FolderOpen, Save, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  useStorageConfig,
  useUpdateStorageConfig,
  useStorageFiles,
  useDetectDefaultStoragePath,
} from '@/modules/document/hooks/use-document-storage';
import { cn } from '@/lib/utils';

export function StorageSettings() {
  const { t } = useTranslation();
  const { data: config, isLoading } = useStorageConfig();
  const updateConfig = useUpdateStorageConfig();
  const detectDefault = useDetectDefaultStoragePath();
  const { data: files, refetch: refetchFiles, isFetching: filesFetching } = useStorageFiles();

  const [basePath, setBasePath] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [syncOnUpdate, setSyncOnUpdate] = useState(true);
  const [defaultSubfolder, setDefaultSubfolder] = useState('');
  const [fileExtension, setFileExtension] = useState<'md' | 'mdx'>('md');

  useEffect(() => {
    if (config) {
      setBasePath(config.basePath);
      setAutoSync(config.autoSync);
      setSyncOnUpdate(config.syncOnUpdate);
      setDefaultSubfolder(config.defaultSubfolder);
      setFileExtension(config.fileExtension);
    }
  }, [config]);

  const handleSave = async () => {
    if (!basePath.trim()) {
      toast.error(t('settings.storagePathEmpty'));
      return;
    }
    try {
      await updateConfig.mutateAsync({
        basePath: basePath.trim(),
        autoSync,
        syncOnUpdate,
        defaultSubfolder: defaultSubfolder.trim(),
        fileExtension,
      });
    } catch {
      // toast handled in hook
    }
  };

  const handleDetectDefault = async () => {
    try {
      const result = await detectDefault.refetch();
      if (result.data?.path) {
        setBasePath(result.data.path);
        toast.success(t('settings.defaultPathDetected'));
      }
    } catch {
      toast.error(t('settings.defaultPathDetectFailed'));
    }
  };

  const handleListFiles = () => {
    refetchFiles();
  };

  if (isLoading) {
    return (
      <Card className="border-border shadow-none">
        <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t('settings.storageLoading')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-accent-blue" />
            <CardTitle>{t('settings.storageTitle')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.storageDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 存储路径 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('settings.storagePathLabel')}</label>
            <div className="flex gap-2">
              <Input
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                placeholder={t('settings.storagePathPlaceholder')}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={handleDetectDefault}
                className="shrink-0"
                disabled={detectDefault.isFetching}
              >
                {detectDefault.isFetching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  t('settings.detectDefault')
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <>{t('settings.storagePathFormatPrefix')}<code className="rounded bg-muted px-1.5 py-0.5">{`<id>_<slug>.{fileExtension}`}</code>{t('settings.storagePathFormatSuffix')}</>
            </p>
          </div>

          {/* 子目录 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('settings.storageSubfolderLabel')}</label>
            <Input
              value={defaultSubfolder}
              onChange={(e) => setDefaultSubfolder(e.target.value)}
              placeholder={t('settings.storageSubfolderPlaceholder')}
              className="font-mono text-sm"
            />
          </div>

          {/* 文件格式 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('settings.storageFileFormatLabel')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFileExtension('md')}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  fileExtension === 'md'
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}
              >
                <FileText className="h-4 w-4" />
                .md
              </button>
              <button
                type="button"
                onClick={() => setFileExtension('mdx')}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  fileExtension === 'mdx'
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}
              >
                <FileText className="h-4 w-4" />
                .mdx
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.storageMdxDesc')}
            </p>
          </div>

          {/* 自动同步 */}
          <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
              {t('settings.storageAutoSyncLabel')}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={syncOnUpdate}
                onChange={(e) => setSyncOnUpdate(e.target.checked)}
                disabled={!autoSync}
              />
              {t('settings.storageSyncOnUpdateLabel')}
            </label>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={updateConfig.isPending} className="gap-2">
              {updateConfig.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('settings.storageSaveConfig')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 已同步文件列表 */}
      <Card className="border-border shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('settings.storageSyncedFiles')}</CardTitle>
              <CardDescription>{t('settings.storageSyncedFilesDesc')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleListFiles}
              disabled={filesFetching}
              className="gap-1.5"
            >
              <RefreshCw className={cn('h-4 w-4', filesFetching && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {files === undefined ? (
            <p className="text-sm text-muted-foreground">{t('settings.storageRefreshHint')}</p>
          ) : files.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              {t('settings.storageNoFiles')}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => (
                <li
                  key={f.documentId + f.fileName}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-mono">{f.fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {(f.size / 1024).toFixed(1)} KB · {new Date(f.modifiedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 引导「工作目录」步骤（自 onboarding-wizard 内联组件提取，2026-10-11 七步统一批）。
 *
 * 双模式（步骤序列 web/桌面统一后，本步在两端都出现，内容按壳能力诚实分叉）：
 * - 桌面（壳可用）：原生目录选择器 + 壳侧守护进程配置读写（set_workspace_roots），
 *   行为与提取前一致；
 * - Web（无壳）：目录选择器不可用、守护进程配置也不归 web 前端管——只读展示
 *   在线运行时注册的工作目录（与「设置 → 运行时」同源），无注册时给诚实指引。
 *   不做手输假持久化：web 侧没有可落库的守护进程配置端点，存了就是假成功。
 * 两分支均可跳过、不设门禁；跳过/下一步由向导底部操作栏统一承载，本组件不带 footer。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Monitor, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invoke, isDesktopShellAvailable } from '@/shared/types/electron-api';
import {
  machineDisplayName,
  pickRepresentativeRegistrations,
  useRuntimeRegistrations,
} from '@/shared/runtime/runtime-api';

function DesktopWorkspaceRoot() {
  const { t } = useTranslation();
  const [roots, setRoots] = useState<string[]>([]);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<{ roots: string[] }>('get_workspace_roots')
      .then((r) => setRoots(r.roots))
      .catch(() => setRoots([]));
  }, []);

  const handleChoose = async () => {
    setError(null);
    setIsChoosing(true);
    try {
      const { path } = await invoke<{ path: string | null }>('choose_directory', {
        title: t('onboarding.workspaceRoot.chooseDialogTitle'),
      });
      if (path && !roots.includes(path)) {
        const next = [...roots, path];
        const { roots: saved } = await invoke<{ roots: string[] }>('set_workspace_roots', {
          roots: next,
        });
        setRoots(saved);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsChoosing(false);
    }
  };

  const handleRemove = async (root: string) => {
    const next = roots.filter((r) => r !== root);
    try {
      const { roots: saved } = await invoke<{ roots: string[] }>('set_workspace_roots', {
        roots: next,
      });
      setRoots(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('onboarding.workspaceRoot.hint')}</p>

      {roots.length > 0 && (
        <div className="space-y-1.5">
          {roots.map((root) => (
            <div
              key={root}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <span className="truncate font-mono text-xs text-foreground">{root}</span>
              <button
                type="button"
                onClick={() => void handleRemove(root)}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={t('onboarding.workspaceRoot.removeAria', { root })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" onClick={() => void handleChoose()} disabled={isChoosing} className="w-full">
        <Plus className="mr-1 h-4 w-4" />
        {isChoosing ? t('onboarding.workspaceRoot.choosing') : t('onboarding.workspaceRoot.choose')}
      </Button>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
    </div>
  );
}

function WebWorkspaceRoot() {
  const { t } = useTranslation();
  const registrationsQuery = useRuntimeRegistrations();
  const machines = pickRepresentativeRegistrations(registrationsQuery.data ?? []);
  const onlineMachines = machines.filter((m) => m.status === 'online');
  const hasRoots = onlineMachines.some((m) => m.workspaceRoots.length > 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('onboarding.workspaceRoot.webHint')}</p>

      {hasRoots ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">
            {t('onboarding.workspaceRoot.webRegistered')}
          </p>
          {onlineMachines.map((machine) =>
            machine.workspaceRoots.map((root) => (
              <div
                key={`${machine.deviceId}:${root}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="shrink-0 truncate text-xs text-muted-foreground">
                  {machineDisplayName(machine)}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={root}>
                  {root}
                </span>
              </div>
            )),
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
          {t('onboarding.workspaceRoot.webEmpty')}
        </div>
      )}
    </div>
  );
}

export function WorkspaceRootStep() {
  const { t } = useTranslation();
  const isDesktop = isDesktopShellAvailable();

  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <FolderOpen className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">{t('onboarding.workspaceRoot.heading')}</DialogTitle>
        <DialogDescription className="text-center">
          {t('onboarding.workspaceRoot.description')}
        </DialogDescription>
      </DialogHeader>

      {isDesktop ? <DesktopWorkspaceRoot /> : <WebWorkspaceRoot />}
    </div>
  );
}

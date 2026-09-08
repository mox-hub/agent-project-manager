import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderGit2, ScanSearch } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { gitApi } from '@/modules/git/api/git-api';
import { isTerminalRunStatus, useExecutionRunDetail, useExecutionRunEvents } from '@/modules/executions/api/execution-api';
import { useIngestArchaeology, useStartArchaeology } from '../../hooks/use-profile';
import { countArchaeologyProgress } from '../../hooks/archaeology-progress';

const WIZARD_STEPS = [
  { id: 'connect', label: 'wizard.connect' },
  { id: 'scan', label: 'wizard.scan' },
  { id: 'done', label: 'wizard.done' },
] as const;

/**
 * 项目接入向导（v2 纪要切片 1 · 老手导入路径）：
 * 连接仓库（复用 git workspace 绑定）→ 触发考古并轮询 → 自动入库后跳档案页校对草稿。
 * 通过 query 参数 ?wizard=1 或档案页按钮唤起。
 */
export function ProjectEntryWizard({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [localPath, setLocalPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [ingested, setIngested] = useState(false);

  const { data: runDetail } = useExecutionRunDetail(executionId, {
    // 未到终态时 4s 轮询跟随（考古执行在后台推进）
    refetchInterval: (query) =>
      isTerminalRunStatus(query.state.data?.status) ? false : 4000,
  });
  const startArchaeology = useStartArchaeology(projectId);
  const ingest = useIngestArchaeology(projectId);
  const runTerminal = isTerminalRunStatus(runDetail?.status);
  const runCompleted = runDetail?.status === 'completed';
  // 进度计数走事件流水（daemon 逐步上报）；steps 表仅进程内执行器写入，runtime 路径恒空
  const { data: runEvents } = useExecutionRunEvents(executionId, !runTerminal);

  // 考古完成自动入库；失败停步留痕（effect 内触发，避免渲染期副作用）
  useEffect(() => {
    if (!open || step !== 1 || !runCompleted || ingested || !executionId) return;
    setIngested(true);
    ingest.mutate(executionId, {
      onSettled: () => setStep(2),
    });
  }, [open, step, runCompleted, ingested, executionId, ingest]);

  // 打开时回填项目已持久化的 Git 工作区配置（与项目设置页同源）
  useEffect(() => {
    if (!open) return;
    gitApi
      .getWorkspace(projectId)
      .then((ws) => {
        setLocalPath(ws?.localPath ?? '');
        setRemoteUrl(ws?.remoteUrl ?? '');
      })
      .catch(() => {
        // 无工作区配置属正常（首次接入），保持空表单
      });
  }, [open, projectId]);

  const reset = () => {
    setStep(0);
    setLocalPath('');
    setRemoteUrl('');
    setConnectError(null);
    setExecutionId(null);
    setIngested(false);
  };

  const handleConnect = async () => {
    if (!localPath.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await gitApi.setWorkspace(projectId, {
        localPath: localPath.trim(),
        ...(remoteUrl.trim() ? { remoteUrl: remoteUrl.trim() } : {}),
      });
      const validation = await gitApi.validateWorkspace(projectId);
      if (validation && validation.valid === false) {
        setConnectError(validation.error ?? t('project.importWizard.invalidWorkspace'));
        return;
      }
      startArchaeology.mutate(undefined, {
        onSuccess: (res) => {
          setExecutionId(res.executionId);
          setStep(1);
        },
        onError: () => setConnectError(t('project.importWizard.dispatchFailed')),
      });
    } catch {
      setConnectError(t('project.importWizard.invalidWorkspace'));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg" data-ai-component="project-entry-wizard">
        <DialogHeader>
          <DialogTitle>{t('project.importWizard.title')}</DialogTitle>
        </DialogHeader>

        <Stepper
          steps={WIZARD_STEPS.map((s) => ({ id: s.id, label: t(`project.importWizard.${s.id}`) }))}
          current={step}
          className="mb-4"
        />

        {step === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <FolderGit2 size={14} className="mt-0.5 shrink-0" />
              <p>{t('project.importWizard.connectHint')}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="wizard-local-path">
                {t('project.importWizard.localPath')}
              </label>
              <Input
                id="wizard-local-path"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="D:\\code\\my-project"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="wizard-remote-url">
                {t('project.importWizard.remoteUrl')}
              </label>
              <Input
                id="wizard-remote-url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
              />
            </div>
            {connectError && (
              <p className="rounded-lg bg-accent-red-light/50 px-3 py-2 text-xs text-accent-red">
                {connectError}
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            {runTerminal ? (
              <p className="text-xs text-accent-red">
                {t('project.importWizard.scanFailed', { status: runDetail?.status })}
              </p>
            ) : (
              <>
                <Spinner className="text-accent-blue" />
                <p className="text-xs text-muted-foreground">
                  {t('project.importWizard.scanning', {
                    steps: countArchaeologyProgress(runEvents),
                  })}
                </p>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ScanSearch size={20} className="text-accent-green" />
            {ingest.isError ? (
              <p className="text-xs leading-relaxed text-accent-red">
                {t('project.importWizard.ingestFailed', {
                  reason: ingest.error instanceof Error ? ingest.error.message : '',
                })}
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('project.importWizard.doneHint', {
                  created: ingest.data?.created ?? 0,
                })}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 0 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!localPath.trim() || connecting || startArchaeology.isPending}
                onClick={handleConnect}
              >
                {connecting || startArchaeology.isPending
                  ? t('project.importWizard.connecting')
                  : t('project.importWizard.connectAndScan')}
              </Button>
            </>
          )}
          {step === 1 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('project.importWizard.runInBackground')}
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={() => {
                onOpenChange(false);
                reset();
                navigate(`/app/projects/${projectId}/profile`);
              }}
            >
              {t('project.importWizard.goReview')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileWarning, RefreshCw, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { BootProgressBar } from '../components/boot-progress-bar';
import { BootChecklist } from '../components/boot-checklist';
import { BootErrorDrawer } from '../components/boot-error-drawer';
import { BootToggle } from '../components/boot-toggle';
import { useBootRunner } from '../hooks/use-boot-runner';

export function BootPage() {
  const navigate = useNavigate();
  const runner = useBootRunner();
  const { state, environment, start, toggleSkipNextTime } = runner;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 入口处判断是否启用启动页
  useEffect(() => {
    if (!environment.showBoot) {
      navigate(state.authenticated ? '/app' : '/login', { replace: true });
      return;
    }
    if (!state.isRunning && !state.allDone) {
      void start();
    }
  }, [environment.showBoot, state.allDone, state.authenticated, state.isRunning, navigate, start]);

  // 手动确认后跳转到正式页面
  const handleProceed = () => {
    navigate(state.authenticated ? '/app' : '/login', { replace: true });
  };

  // 重新运行所有失败的步骤
  const handleRetryFailed = async () => {
    const failedStepIds = state.steps
      .filter((step) => step.status === 'error')
      .map((step) => step.id);
    for (const stepId of failedStepIds) {
      await runner.retry(stepId);
    }
  };

  const currentStep = state.steps.find((step) => step.status === 'running');
  const currentLabel = currentStep?.title ?? (state.allDone ? '启动完成' : '准备中');

  const title = environment.isFirstRun ? '正在初始化 APM' : '快速启动 APM';

  const failedCount = state.steps.filter((step) => step.status === 'error').length;
  const canProceed = state.allDone && !state.isRunning;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-border/60 bg-card/60 p-8 shadow-lg backdrop-blur-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="framed" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">
                {environment.isFirstRun
                  ? '首次启动会自动完成依赖检测、偏好加载与登录态校验'
                  : '检查后端连接、登录态与本地偏好后进入主界面'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.errors.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(true)}
                className="text-destructive"
              >
                <FileWarning className="mr-1 h-4 w-4" />
                查看日志（{state.errors.length}）
              </Button>
            )}
          </div>
        </div>

        <BootProgressBar
          progress={state.progress}
          currentLabel={currentLabel}
          isRunning={state.isRunning}
          allDone={state.allDone}
          errors={state.errors.length}
          className="mb-6"
        />

        <BootChecklist steps={state.steps} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ScrollText className="h-3.5 w-3.5" />
              {import.meta.env.DEV ? '开发模式' : '生产模式'} · API:{' '}
              <code className="font-mono">
                {import.meta.env.VITE_API_BASE_URL || '/_api'}
              </code>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <BootToggle checked={environment.skipStored} onChange={toggleSkipNextTime} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {canProceed && failedCount > 0 && (
            <Button
              variant="outline"
              onClick={handleRetryFailed}
              className="text-destructive"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重试失败项（{failedCount}）
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleProceed}
            disabled={!canProceed}
            variant={failedCount > 0 ? 'outline' : 'default'}
            className={failedCount > 0 ? 'border-destructive/50 text-destructive hover:text-destructive' : undefined}
          >
            {failedCount > 0
              ? '仍要继续'
              : state.authenticated
                ? '进入 APM'
                : '进入登录'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <BootErrorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        errors={state.errors}
        onCopy={runner.formatLogs}
      />
    </div>
  );
}

export default BootPage;
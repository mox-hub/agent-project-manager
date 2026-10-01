import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../hooks/use-onboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import { invoke } from '@/shared/types/electron-api';
import { IconStack } from '@/components/semantic/icon-stack';
import {
  Rocket,
  FolderPlus,
  GitBranch,
  Bot,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  SkipForward,
  Sparkles,
  Users,
  Zap,
  Shield,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';

interface StepContentProps {
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function WelcomeStep({ onNext, onSkip }: StepContentProps) {
  const { t } = useTranslation();
  const features = [
    { icon: FolderPlus, titleKey: 'onboarding.welcome.features.projects.title', descriptionKey: 'onboarding.welcome.features.projects.description' },
    { icon: GitBranch, titleKey: 'onboarding.welcome.features.git.title', descriptionKey: 'onboarding.welcome.features.git.description' },
    { icon: Bot, titleKey: 'onboarding.welcome.features.ai.title', descriptionKey: 'onboarding.welcome.features.ai.description' },
    // 治理闭环是主叙事（产品主轴：AI 同事是手段，工程治理是目的），保留首位权重
    { icon: Zap, titleKey: 'onboarding.welcome.features.governance.title', descriptionKey: 'onboarding.welcome.features.governance.description' },
    // 内测语境引导：数据安全（CAP-A-18 上手收口——新用户最先问的是"我的数据在哪"）
    { icon: Shield, titleKey: 'onboarding.welcome.features.dataSafety.title', descriptionKey: 'onboarding.welcome.features.dataSafety.description' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <IconStack aria-hidden="true" className="mx-auto mb-4 text-primary">
          <Rocket className="size-4 text-primary" />
        </IconStack>
        <h2 className="text-2xl font-semibold">{t('onboarding.welcome.title')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('onboarding.welcome.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <div
            key={feature.titleKey}
            className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <feature.icon className="mb-2 h-5 w-5 text-primary" />
            <h3 className="font-medium">{t(feature.titleKey)}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t(feature.descriptionKey)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">{t('onboarding.welcome.aiIntro.title')}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t('onboarding.welcome.aiIntro.body')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          {t('onboarding.welcome.durationHint')}
        </p>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onSkip}>
          {t('onboarding.welcome.later')}
        </Button>
        <Button onClick={onNext}>
          {t('onboarding.welcome.start')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );
}

function WorkspaceRootStep({ onNext, onSkip }: StepContentProps) {
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

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('onboarding.workspaceRoot.hint')}
        </p>

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

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          {t('onboarding.common.skip')}
        </Button>
        <Button onClick={onNext}>
          {t('onboarding.common.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );
}

function CreateProjectStep({
  onNext,
  onSkip,
  isPending,
}: StepContentProps & { isPending: boolean }) {
  const { t } = useTranslation();
  const { createProject } = useOnboarding();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'team' | 'personal' | 'enterprise'>('team');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate(
      { name: name.trim(), description: description.trim() || undefined, type },
      {
        onSuccess: () => onNext(),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <FolderPlus className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">{t('onboarding.createProject.heading')}</DialogTitle>
        <DialogDescription className="text-center">
          {t('onboarding.createProject.description')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="project-name">
            {t('onboarding.createProject.nameLabel')} <span className="text-destructive">*</span>
          </label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('onboarding.createProject.namePlaceholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="project-description">
            {t('onboarding.createProject.descriptionLabel')}
          </label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('onboarding.createProject.descriptionPlaceholder')}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('onboarding.createProject.typeLabel')}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'team', labelKey: 'onboarding.createProject.type.team', icon: Users },
              { value: 'personal', labelKey: 'onboarding.createProject.type.personal', icon: Sparkles },
              { value: 'enterprise', labelKey: 'onboarding.createProject.type.enterprise', icon: Shield },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value as typeof type)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                  type === option.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <option.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{t(option.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          {t('onboarding.common.skip')}
        </Button>
        <Button type="submit" disabled={!name.trim() || isPending}>
          {isPending ? t('onboarding.createProject.creating') : t('onboarding.createProject.submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * 仓库连接引导页（2026-09-12 诚实化改造）。
 * 历史版本是表单 + 假 mutation（POST /onboarding/repository 恒 404，静默失败）；
 * 仓库连接在契约面没有单一端点，真实入口在项目内，此处只做引导。
 */
function ConnectRepositoryStep({ onNext, onSkip }: StepContentProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <GitBranch className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">{t('onboarding.connectRepository.heading')}</DialogTitle>
        <DialogDescription className="text-center">
          {t('onboarding.connectRepository.description')}
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('onboarding.connectRepository.hint')}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          {t('onboarding.common.skip')}
        </Button>
        <Button onClick={onNext}>
          {t('onboarding.common.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );
}

/**
 * AI 配置引导页（2026-09-12 诚实化改造）。
 * 历史版本是表单 + 假 mutation（POST /onboarding/ai 恒 404）；真实的模型
 * 配置入口在「设置 → AI 管理」（作用于既有 provider 记录），此处只做引导。
 */
function ConfigureAiStep({ onNext, onSkip }: StepContentProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">{t('onboarding.configureAi.heading')}</DialogTitle>
        <DialogDescription className="text-center">
          {t('onboarding.configureAi.description')}
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('onboarding.configureAi.hint')}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          {t('onboarding.common.skip')}
        </Button>
        <Button onClick={onNext}>
          {t('onboarding.common.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );
}

function CompleteStep({
  onFinish,
  onWatchReplay,
}: {
  onFinish: () => void;
  /** 向导完成 → 先看回放（S6）。次序见 `use-onboarding.watchReplayThenStart` */
  onWatchReplay: () => void;
}) {
  const { t } = useTranslation();

  const handleFinish = () => {
    onFinish();
  };

  const handleGoToDocs = () => {
    window.open('/docs/getting-started', '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <IconStack aria-hidden="true" className="mx-auto mb-4 text-accent-green">
          <CheckCircle className="size-4 text-accent-green" />
        </IconStack>
        <h2 className="text-2xl font-semibold">{t('onboarding.complete.heading')}</h2>
        {/* 原来这里写的是「您已准备好开始使用 APM」——一句没有依据的断言：
            上一步「配置 AI」是**可跳过**的，跳过之后这条链路一步也跑不起来。
            改为说清"现在能做什么、还差什么"，而"还差什么"由下方那张卡自己去说 */}
        <p className="mt-2 text-muted-foreground">
          {t('onboarding.complete.subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <FolderPlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{t('onboarding.complete.projectReady.title')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.complete.projectReady.description')}</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 text-accent-green" />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{t('onboarding.complete.repoReady.title')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.complete.repoReady.description')}</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 text-accent-green" />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{t('onboarding.complete.aiReady.title')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.complete.aiReady.description')}</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 text-accent-green" />
        </div>

        {/* 完成后第一站指引（CAP-A-18 内容同步）：G5-b integration 卡是新手
            第一个 AI 确认时刻——AI 干完活发来合入提议，人确认才生效。
            形态与上面三张「已就绪」卡区分：行动引导（Inbox 图标），非完成态 */}
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{t('onboarding.complete.inboxHint.title')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('onboarding.complete.inboxHint.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* 主键给"看一遍"，不给"进入 APM"（S6，设计纪要 §3.4「先回放、后实况」）：
            刚装好的机器上模型多半还没配、runtime 还没起，此时进真实项目看到的是一片空，
            用户会合理地认为这东西坏了。回放不需要 runtime、不需要 API key，
            在任何机器上都放得完——它是唯一能在第一分钟就说清"这东西能干什么"的东西。
            按钮文案承担全部说明责任（含"不需要配置"），避免主键变成一个语焉不详的跳转 */}
        <Button onClick={onWatchReplay} size="lg" className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          {t('onboarding.complete.watchReplay')}
        </Button>
        <Button variant="outline" onClick={handleFinish} className="w-full">
          <Rocket className="mr-2 h-4 w-4" />
          {t('onboarding.complete.enterApp')}
        </Button>
        <Button variant="ghost" onClick={handleGoToDocs} className="w-full">
          {t('onboarding.complete.viewDocs')}
        </Button>
      </div>
    </div>
  );
}

interface OnboardingWizardProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OnboardingWizard({ open = true, onOpenChange }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const {
    state,
    currentStepData,
    isLastStep,
    nextStep,
    prevStep,
    skipStep,
    finishOnboarding,
    watchReplayThenStart,
    createProject,
    goToStep,
  } = useOnboarding();

  const renderStepContent = () => {
    const commonProps = {
      onNext: nextStep,
      onSkip: () => skipStep(currentStepData?.id || ''),
    };

    // 按步骤 id 分发（桌面模式会在 welcome 后插入 workspace-root 步骤，索引随模式漂移）
    switch (currentStepData?.id) {
      case 'welcome':
        return <WelcomeStep {...commonProps} isPending={false} />;
      case 'workspace-root':
        return <WorkspaceRootStep {...commonProps} isPending={false} />;
      case 'create-project':
        return (
          <CreateProjectStep
            {...commonProps}
            isPending={createProject.isPending}
          />
        );
      case 'connect-repository':
        return <ConnectRepositoryStep {...commonProps} isPending={false} />;
      case 'add-ai':
        return <ConfigureAiStep {...commonProps} isPending={false} />;
      case 'complete':
        return (
          <CompleteStep
            onFinish={() => finishOnboarding.mutate()}
            onWatchReplay={watchReplayThenStart}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* 步骤条（可点击回跳已走过的步骤；未来步骤禁用）——受控 value，导航走 goToStep */}
        <Stepper value={state.currentStep + 1} className="mb-6">
          <StepperNav>
            {state.steps.map((step, i) => (
              <StepperItem key={step.id} step={i + 1}>
                <StepperTrigger
                  onClick={() => goToStep(i)}
                  disabled={i > state.currentStep}
                  className="gap-1.5"
                >
                  <StepperIndicator className="size-5 text-3xs font-medium">
                    {step.status === 'completed' ? (
                      <Check className="size-3" />
                    ) : step.status === 'skipped' ? (
                      <SkipForward className="size-3" />
                    ) : (
                      i + 1
                    )}
                  </StepperIndicator>
                  <StepperTitle className="text-xs whitespace-nowrap">
                    {t(step.title)}
                  </StepperTitle>
                </StepperTrigger>
                {i < state.steps.length - 1 && <StepperSeparator />}
              </StepperItem>
            ))}
          </StepperNav>
        </Stepper>

        <div className="min-h-100">{renderStepContent()}</div>

        {!isLastStep && state.currentStep > 0 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={state.currentStep === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('onboarding.common.prev')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t('onboarding.common.escClose')}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

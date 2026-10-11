import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../hooks/use-onboarding';
import type { CreateProjectData } from '../api/onboarding-api';
import { EnvironmentStep } from '../components/environment-step';
import { WorkspaceRootStep } from '../components/workspace-root-step';
import { ConnectRepositoryStep } from '../components/connect-repository-step';
import { ConfigureAiStep } from '../components/configure-ai-step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/infrastructure/store/app-store';
import { persistOnboardingToShell } from '@/shared/lib/desktop-session';
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
} from 'lucide-react';

/** 创建项目表单 id：底部操作栏的「下一步」在该步以 form 关联远程提交（按钮在表单外） */
const CREATE_PROJECT_FORM_ID = 'onboarding-create-project-form';

function WelcomeStep() {
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
    <div className="space-y-5">
      <div className="text-center">
        <IconStack aria-hidden="true" className="mx-auto mb-3 text-primary">
          <Rocket className="size-4 text-primary" />
        </IconStack>
        <h2 className="text-xl font-semibold">{t('onboarding.welcome.title')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('onboarding.welcome.subtitle')}
        </p>
      </div>

      {/* 特性卡横排（图标左+文案右）：竖排三行在 85vh 视口必滚，横排省 ~110px 保一页 */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature) => (
          <div
            key={feature.titleKey}
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <feature.icon className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium">{t(feature.titleKey)}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t(feature.descriptionKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
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

      <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          {t('onboarding.welcome.durationHint')}
        </p>
      </div>
    </div>
  );
}

interface CreateProjectStepProps {
  isPending: boolean;
  /** 父级（wizard 挂钩实例）的建项 mutation：内建 onSuccess 落 data.projectId 并前进，
   *  保证 projectId 传导到「连接仓库」步——此前步骤内自建挂钩实例，projectId 落在了孤儿 state 上 */
  createProject: { mutate: (data: CreateProjectData) => void };
}

/** 提交动作由底部操作栏的「下一步」以 form 关联触发（按钮在表单外），本组件只铺表单体 */
function CreateProjectStep({ isPending, createProject }: CreateProjectStepProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'team' | 'personal' | 'enterprise'>('team');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    // 内建 onSuccess：updateData({projectId}) + nextStep()，此处不再挂 onSuccess 防双跳
    createProject.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
    });
  };

  return (
    <form id={CREATE_PROJECT_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
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
    </form>
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
    <div className="space-y-5">
      <div className="text-center">
        <IconStack aria-hidden="true" className="mx-auto mb-3 text-accent-green">
          <CheckCircle className="size-4 text-accent-green" />
        </IconStack>
        <h2 className="text-xl font-semibold">{t('onboarding.complete.heading')}</h2>
        {/* 原来这里写的是「您已准备好开始使用 APM」——一句没有依据的断言：
            上一步「配置 AI」是**可跳过**的，跳过之后这条链路一步也跑不起来。
            改为说清"现在能做什么、还差什么"，而"还差什么"由下方那张卡自己去说 */}
        <p className="mt-2 text-muted-foreground">
          {t('onboarding.complete.subtitle')}
        </p>
      </div>

      {/* 就绪卡 2×2 网格（竖排四行在小视口必滚）；行动引导卡跨双列收尾 */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <FolderPlus className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('onboarding.complete.projectReady.title')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('onboarding.complete.projectReady.description')}</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-accent-green" />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('onboarding.complete.repoReady.title')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('onboarding.complete.repoReady.description')}</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-accent-green" />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('onboarding.complete.aiReady.title')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('onboarding.complete.aiReady.description')}</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-accent-green" />
        </div>

        {/* 完成后第一站指引（CAP-A-18 内容同步）：G5-b integration 卡是新手
            第一个 AI 确认时刻——AI 干完活发来合入提议，人确认才生效。
            形态与「已就绪」卡区分：行动引导（primary 弱底），非完成态 */}
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('onboarding.complete.inboxHint.title')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
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
        <Button onClick={onWatchReplay} className="w-full">
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

export function OnboardingWizard() {
  const { t } = useTranslation();
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);
  const setOnboardingOpen = useAppStore((s) => s.setOnboardingOpen);
  const {
    state,
    currentStepData,
    isLastStep,
    isFirstStep,
    nextStep,
    prevStep,
    skipStep,
    finishOnboarding,
    watchReplayThenStart,
    createProject,
    goToStep,
  } = useOnboarding();

  /**
   * 主动触及一次性消费（2026-10-03 改版裁决）：向导被关闭（ESC/遮罩/关闭钮）即视为
   * 本机已触及——落完成标记不再自动弹，之后只能从侧边栏「引导」手动重开。
   * 走完流程的路径（finishOnboarding/watchReplayThenStart）在 completeOnboarding 已落
   * 同一标记，此处幂等；onboardingOpen 一并复位，侧边栏重开的会话随即收口。
   */
  const handleDismiss = () => {
    setOnboardingCompleted(true);
    persistOnboardingToShell(true);
    setOnboardingOpen(false);
  };

  const renderStepContent = () => {
    // 按步骤 id 分发；跳过/下一步由底部操作栏统一承载，步骤组件不再自带 footer
    switch (currentStepData?.id) {
      case 'welcome':
        return <WelcomeStep />;
      case 'workspace-root':
        return <WorkspaceRootStep />;
      case 'environment':
        return <EnvironmentStep />;
      case 'create-project':
        return (
          <CreateProjectStep isPending={createProject.isPending} createProject={createProject} />
        );
      case 'connect-repository':
        return <ConnectRepositoryStep projectId={state.data.projectId} />;
      case 'add-ai':
        return <ConfigureAiStep />;
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

  /** 底部操作栏按钮文案：欢迎步沿用「稍后设置/开始设置」，创建项目步主键走建项提交，其余统一跳过/下一步 */
  const skipLabel = isFirstStep
    ? t('onboarding.welcome.later')
    : t('onboarding.common.skip');
  const isCreateProjectStep = currentStepData?.id === 'create-project';
  const nextLabel = isCreateProjectStep
    ? createProject.isPending
      ? t('onboarding.createProject.creating')
      : t('onboarding.createProject.submit')
    : isFirstStep
      ? t('onboarding.welcome.start')
      : t('onboarding.common.next');

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) {
          handleDismiss();
        }
      }}
    >
      {/* 双栏规格（2026-10-11 七步统一批，896px=Dialog wide 档；高度升 760px 档，
          85vh 上限走既有 dialog-scroll 语义 token）：左竖步骤轨（可点回跳）
          + 右内容区内滚 + 固定底部操作栏（跳过/下一步收栏，不再随内容滚动） */}
      <DialogContent size="wide" className="gap-0 overflow-hidden p-0">
        <div className="flex h-190 max-h-dialog-scroll">
          <aside className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 px-1">
              <IconStack aria-hidden="true" className="text-primary">
                <Rocket className="size-3.5 text-primary" />
              </IconStack>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t('onboarding.rail.title')}</p>
                <p className="text-3xs text-muted-foreground">{t('onboarding.rail.subtitle')}</p>
              </div>
            </div>
            <nav
              aria-label={t('onboarding.rail.navAria')}
              className="flex-1 space-y-1 overflow-y-auto"
            >
              {state.steps.map((step, i) => {
                const isCurrent = i === state.currentStep;
                const isFuture = i > state.currentStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(i)}
                    disabled={isFuture}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                      isCurrent
                        ? 'border-border/60 bg-background shadow-xs'
                        : isFuture
                          ? 'border-transparent opacity-50'
                          : 'border-transparent hover:bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-3xs font-medium',
                        step.status === 'completed'
                          ? 'bg-accent-green/15 text-accent-green'
                          : step.status === 'skipped'
                            ? 'bg-muted text-muted-foreground'
                            : isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {step.status === 'completed' ? (
                        <Check className="size-3" />
                      ) : step.status === 'skipped' ? (
                        <SkipForward className="size-3" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block truncate text-xs font-medium',
                          isCurrent ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {t(step.title)}
                      </span>
                      <span className="block truncate text-3xs text-muted-foreground/70">
                        {t(step.description)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
            <p className="mt-3 px-1 text-3xs text-muted-foreground">
              {t('onboarding.common.escClose')}
            </p>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* min-h-0 必须在 flex 链上逐层声明：缺了会被内容撑破父高、被 DialogContent
                的 overflow-hidden 裁掉且不出现滚动条（实机验收暴露的「高度不正确」） */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-2xl">{renderStepContent()}</div>
            </div>
            {/* 底部操作栏（§20.8：justify-between 对齐，禁 ml-auto 手摊；按钮 gap-2 唯一档）：
                上一步常驻（首步禁用保布局稳定），跳过/下一步右侧成组。
                最后一步（完成）不出栏——三颗 CTA 由完成步内容自承载 */}
            {!isLastStep && (
              <footer className="flex items-center justify-between border-t px-6 py-3">
                <Button variant="ghost" onClick={prevStep} disabled={isFirstStep}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t('onboarding.common.prev')}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => skipStep(currentStepData?.id || '')}>
                    {skipLabel}
                  </Button>
                  {isCreateProjectStep ? (
                    <Button
                      type="submit"
                      form={CREATE_PROJECT_FORM_ID}
                      disabled={createProject.isPending}
                    >
                      {nextLabel}
                    </Button>
                  ) : (
                    <Button onClick={nextStep}>
                      {nextLabel}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </footer>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

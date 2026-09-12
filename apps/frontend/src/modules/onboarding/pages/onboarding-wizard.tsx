import { useEffect, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { invoke } from '@/shared/types/electron-api';
import {
  Rocket,
  FolderPlus,
  GitBranch,
  Bot,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
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
  const features = [
    { icon: FolderPlus, title: '项目管理', description: '创建和管理项目，跟踪进度' },
    { icon: GitBranch, title: 'Git 集成', description: '连接仓库，管理分支和提交' },
    { icon: Bot, title: 'AI 同事', description: '读写任务、执行代码、发起审批' },
    { icon: Zap, title: '治理闭环', description: 'AI 代写方案，您只需确认把关' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">欢迎使用 APM</h2>
        <p className="mt-2 text-muted-foreground">
          AI 驱动的项目管理平台，让团队协作更高效
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <feature.icon className="mb-2 h-5 w-5 text-primary" />
            <h3 className="font-medium">{feature.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">认识您的 AI 同事</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              APM 内置 AI 同事可以像团队成员一样接任务、写代码、提交验收证据；
              所有执行都在验收门禁与您的审批之下进行——AI 负责干活，您负责决策。
              后续步骤中配置好 AI 服务即可启用。
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          完成初始设置需要约 3 分钟，您随时可以跳过不感兴趣的部分
        </p>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onSkip}>
          稍后设置
        </Button>
        <Button onClick={onNext}>
          开始设置
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );
}

function WorkspaceRootStep({ onNext, onSkip }: StepContentProps) {
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
        title: '选择 AI 执行的工作目录',
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
        <DialogTitle className="text-center text-xl">配置工作目录</DialogTitle>
        <DialogDescription className="text-center">
          AI 同事将在这些目录内读写代码、执行命令
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          选择一个存放项目代码的文件夹。您可以稍后在「设置 → 运行时」中随时修改。
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
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`移除 ${root}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" onClick={() => void handleChoose()} disabled={isChoosing} className="w-full">
          <Plus className="mr-1 h-4 w-4" />
          {isChoosing ? '选择中...' : '选择目录'}
        </Button>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          跳过
        </Button>
        <Button onClick={onNext}>
          下一步
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
        <DialogTitle className="text-center text-xl">创建您的第一个项目</DialogTitle>
        <DialogDescription className="text-center">
          项目是您管理任务、成员和目标的容器
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="project-name">
            项目名称 <span className="text-destructive">*</span>
          </label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：我的项目"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="project-description">
            项目描述
          </label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简要描述项目目标和范围..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">项目类型</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'team', label: '团队', icon: Users },
              { value: 'personal', label: '个人', icon: Sparkles },
              { value: 'enterprise', label: '企业', icon: Shield },
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
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          跳过
        </Button>
        <Button type="submit" disabled={!name.trim() || isPending}>
          {isPending ? '创建中...' : '创建项目'}
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
  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <GitBranch className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">连接 Git 仓库</DialogTitle>
        <DialogDescription className="text-center">
          关联您的代码仓库，跟踪代码变更和分支
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
        仓库连接支持 GitHub、GitLab、Gitee 等平台，可在进入 APM
        后于项目内随时完成——此步可以先跳过，不影响使用。
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          跳过
        </Button>
        <Button onClick={onNext}>
          下一步
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
  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">配置 AI 模型</DialogTitle>
        <DialogDescription className="text-center">
          连接 AI 服务，启用智能辅助
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
        支持 OpenAI、Anthropic、智谱 GLM、DeepSeek
        等模型服务。进入 APM 后可在「设置 → AI 管理」中随时配置 API Key 与端点——此步可以先跳过。
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          跳过
        </Button>
        <Button onClick={onNext}>
          下一步
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {

  const handleFinish = () => {
    onFinish();
  };

  const handleGoToDocs = () => {
    window.open('/docs/getting-started', '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
          <CheckCircle className="h-8 w-8 text-accent-green" />
        </div>
        <h2 className="text-2xl font-bold">设置完成！</h2>
        <p className="mt-2 text-muted-foreground">
          您已准备好开始使用 APM，祝您使用愉快
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <FolderPlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">项目空间已就绪</p>
            <p className="text-xs text-muted-foreground">随时创建项目，管理任务、文档与成员</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 text-accent-green" />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">代码仓库可随时连接</p>
            <p className="text-xs text-muted-foreground">连接后开始跟踪代码变更和分支</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 text-accent-green" />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">AI 同事整装待发</p>
            <p className="text-xs text-muted-foreground">在「设置 → AI 管理」配置模型后即可执行任务</p>
          </div>
          <CheckCircle className="ml-auto h-5 w-5 text-accent-green" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={handleFinish} size="lg" className="w-full">
          <Rocket className="mr-2 h-4 w-4" />
          进入 APM
        </Button>
        <Button variant="outline" onClick={handleGoToDocs} className="w-full">
          查看文档
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
  const {
    state,
    progress,
    currentStepData,
    isLastStep,
    nextStep,
    prevStep,
    skipStep,
    finishOnboarding,
    createProject,
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-140">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              步骤 {state.currentStep + 1} / {state.steps.length}
            </span>
            <span>{currentStepData?.title}</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

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
              上一步
            </Button>
            <span className="text-xs text-muted-foreground">
              按 ESC 关闭
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

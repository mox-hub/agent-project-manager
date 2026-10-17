import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, type OnboardingData, type CreateProjectData } from '../api/onboarding-api';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/infrastructure/store/app-store';
import { persistOnboardingToShell } from '@/shared/lib/desktop-session';

export interface OnboardingStep {
  id: string;
  /** i18n 键（onboarding.steps.*，渲染时 t() 消费）——文案不落本文件（CAP-A-18 i18n 收口） */
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
}

export interface OnboardingState {
  currentStep: number;
  steps: OnboardingStep[];
  data: Partial<OnboardingData>;
  isCompleted: boolean;
}

/**
 * 七步序列 web/桌面统一（2026-10-11 对齐裁决：桌面七步为准，web 不再裁剪）：
 * 欢迎 → 工作目录 → 环境检查 → 创建项目 → 连接仓库 → 配置 AI → 完成。
 * 桌面专属步骤在 web 下由步骤组件自行诚实降级（工作目录=运行时注册只读展示，
 * 环境检查本就走 server 端点天然双端可用），步骤序列不再随模式漂移。
 */
const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'onboarding.steps.welcome.title',
    description: 'onboarding.steps.welcome.description',
    status: 'pending',
  },
  {
    id: 'workspace-root',
    title: 'onboarding.steps.workspaceRoot.title',
    description: 'onboarding.steps.workspaceRoot.description',
    status: 'pending',
  },
  {
    id: 'environment',
    title: 'onboarding.steps.environment.title',
    description: 'onboarding.steps.environment.description',
    status: 'pending',
  },
  {
    id: 'create-project',
    title: 'onboarding.steps.createProject.title',
    description: 'onboarding.steps.createProject.description',
    status: 'pending',
  },
  {
    id: 'connect-repository',
    title: 'onboarding.steps.connectRepository.title',
    description: 'onboarding.steps.connectRepository.description',
    status: 'pending',
  },
  {
    id: 'add-ai',
    title: 'onboarding.steps.configureAi.title',
    description: 'onboarding.steps.configureAi.description',
    status: 'pending',
  },
  {
    id: 'complete',
    title: 'onboarding.steps.complete.title',
    description: 'onboarding.steps.complete.description',
    status: 'pending',
  },
];

export function buildSteps(): OnboardingStep[] {
  return DEFAULT_STEPS.map((step, index) => ({
    ...step,
    status: index === 0 ? ('current' as const) : ('pending' as const),
  }));
}

export function useOnboarding() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setOnboardingCompleted, setOnboardingOpen } = useAppStore();

  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    steps: buildSteps(),
    data: {},
    isCompleted: false,
  });

  const updateStepStatus = useCallback((stepId: string, status: OnboardingStep['status']) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === stepId ? { ...step, status } : step,
      ),
    }));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setState((prev) => {
      const newSteps = prev.steps.map((step, index) => {
        if (index < stepIndex) {
          return { ...step, status: 'completed' as const };
        } else if (index === stepIndex) {
          return { ...step, status: 'current' as const };
        } else {
          return { ...step, status: 'pending' as const };
        }
      });
      return { ...prev, currentStep: stepIndex, steps: newSteps };
    });
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= prev.steps.length - 1) {
        return prev;
      }
      const nextIndex = prev.currentStep + 1;
      const newSteps = prev.steps.map((step, index) => {
        if (index < nextIndex) {
          return { ...step, status: 'completed' as const };
        } else if (index === nextIndex) {
          return { ...step, status: 'current' as const };
        } else {
          return { ...step, status: 'pending' as const };
        }
      });
      return { ...prev, currentStep: nextIndex, steps: newSteps };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep <= 0) {
        return prev;
      }
      const prevIndex = prev.currentStep - 1;
      const newSteps = prev.steps.map((step, index) => {
        if (index < prevIndex) {
          return { ...step, status: 'completed' as const };
        } else if (index === prevIndex) {
          return { ...step, status: 'current' as const };
        } else {
          return { ...step, status: 'pending' as const };
        }
      });
      return { ...prev, currentStep: prevIndex, steps: newSteps };
    });
  }, []);

  const skipStep = useCallback((stepId: string) => {
    updateStepStatus(stepId, 'skipped');
    nextStep();
  }, [nextStep, updateStepStatus]);

  const updateData = useCallback((data: Partial<OnboardingData>) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, ...data },
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCompleted: true,
      steps: prev.steps.map((step) => ({
        ...step,
        status: 'completed' as const,
      })),
    }));
    setOnboardingCompleted(true);
    // 复位侧边栏重开开关：gate 条件是 completed && !open，只落标记不复位的话，
    // 从侧边栏进入的会话点「进入 Ordo」后向导关不掉（2026-10-04 实机暴露）
    setOnboardingOpen(false);
    // 桌面模式镜像到壳侧：动态端口漂移换 origin 后向导不重弹
    persistOnboardingToShell(true);
    queryClient.invalidateQueries({ queryKey: ['user-settings'] });
  }, [queryClient, setOnboardingCompleted, setOnboardingOpen]);

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectData) => onboardingApi.createProject(data),
    onSuccess: (response) => {
      const project = response;
      updateData({ projectId: project.id });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      nextStep();
      return project;
    },
  });

  const finishOnboarding = useCallback(() => {
    // 完成标记是前端/壳侧状态（zustand persist + desktop-state.json 镜像），
    // 不走服务端——曾指向从未实现的 POST /onboarding/finish，404 静默失败
    // 导致「进入 Ordo」点了没反应（2026-09-12 实机暴露，回归见 use-onboarding.test）
    completeOnboarding();
    navigate('/app');
  }, [completeOnboarding, navigate]);

  /**
   * 向导完成 → 先看回放（S6，设计纪要 §3.4）。
   *
   * **先回放、后实况的次序不可颠倒**：刚装好的机器上，用户可能一步都没配
   * （模型没配、runtime 没起），此时带他去看实况，看到的会是"什么都没发生"——
   * 第一印象就此毁掉，而且他会合理地认为这东西坏了。回放不需要 runtime、不需要
   * API key，**在任何机器上都放得完**，是唯一能在第一分钟就说清"这东西能干什么"
   * 的东西。看完再落回真实项目，那时该配的也都配了。
   *
   * 与 `finishOnboarding` 一样先落完成标记：不落的话引导门控会在回放页上
   * 再弹一次向导，用户刚点的按钮看起来就没生效。
   */
  const watchReplayThenStart = useCallback(() => {
    completeOnboarding();
    navigate('/app/ai-surface/replay');
  }, [completeOnboarding, navigate]);

  /**
   * 跳过了「配置 AI」的用户在完成步的出口（CAP-A-18 AI 员工引导闭环切片）：
   * 落完成标记关向导 → 直达成员页并自动弹「新建成员」对话框（AI 页签预填，
   * members-page 消费 ?create=ai）。没有 AI 员工，「指派 AI」必撞空态——
   * 与配置成功路径的自动建员工（configure-ai-step.createDefaultAgent）互为两翼。
   */
  const finishToCreateAgent = useCallback(() => {
    completeOnboarding();
    navigate('/app/members?create=ai');
  }, [completeOnboarding, navigate]);

  const resetOnboarding = useCallback(() => {
    setState({
      currentStep: 0,
      steps: buildSteps(),
      data: {},
      isCompleted: false,
    });
  }, []);

  const progress = useMemo(() => {
    const completedSteps = state.steps.filter(
      (step) => step.status === 'completed' || step.status === 'skipped',
    ).length;
    return (completedSteps / state.steps.length) * 100;
  }, [state.steps]);

  const currentStepData = useMemo(
    () => state.steps[state.currentStep],
    [state.currentStep, state.steps],
  );

  const isLastStep = state.currentStep === state.steps.length - 1;
  const isFirstStep = state.currentStep === 0;
  const canProceed = state.currentStep < state.steps.length - 1;

  return {
    state,
    currentStepData,
    progress,
    isLastStep,
    isFirstStep,
    canProceed,
    goToStep,
    nextStep,
    prevStep,
    skipStep,
    updateData,
    updateStepStatus,
    completeOnboarding,
    resetOnboarding,
    createProject: {
      mutate: createProjectMutation.mutate,
      mutateAsync: createProjectMutation.mutateAsync,
      isPending: createProjectMutation.isPending,
      error: createProjectMutation.error,
    },
    finishOnboarding: {
      mutate: finishOnboarding,
      isPending: false,
      error: null,
    },
    watchReplayThenStart,
    finishToCreateAgent,
  };
}

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, type OnboardingData, type CreateProjectData } from '../api/onboarding-api';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/infrastructure/store/app-store';

export interface OnboardingStep {
  id: string;
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

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎',
    description: '了解 APM 的核心功能',
    status: 'pending',
  },
  {
    id: 'create-project',
    title: '创建项目',
    description: '建立您的第一个项目',
    status: 'pending',
  },
  {
    id: 'connect-repository',
    title: '连接仓库',
    description: '关联 Git 仓库',
    status: 'pending',
  },
  {
    id: 'add-ai',
    title: '配置 AI',
    description: '连接 AI 模型服务',
    status: 'pending',
  },
  {
    id: 'complete',
    title: '完成设置',
    description: '开始使用 APM',
    status: 'pending',
  },
];

export function useOnboarding() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setOnboardingCompleted } = useAppStore();

  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    steps: DEFAULT_STEPS.map((step, index) => ({
      ...step,
      status: index === 0 ? 'current' : 'pending',
    })),
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
    queryClient.invalidateQueries({ queryKey: ['user-settings'] });
  }, [queryClient, setOnboardingCompleted]);

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

  const connectRepositoryMutation = useMutation({
    mutationFn: (data: { repositoryUrl: string; projectId?: string }) =>
      onboardingApi.connectRepository(data),
    onSuccess: () => {
      nextStep();
    },
  });

  const configureAiMutation = useMutation({
    mutationFn: (data: { provider: string; apiKey?: string; endpoint?: string }) =>
      onboardingApi.configureAi(data),
    onSuccess: () => {
      nextStep();
    },
  });

  const finishOnboarding = useMutation({
    mutationFn: () => onboardingApi.finishOnboarding(),
    onSuccess: () => {
      completeOnboarding();
      navigate('/app');
    },
  });

  const resetOnboarding = useCallback(() => {
    setState({
      currentStep: 0,
      steps: DEFAULT_STEPS.map((step, index) => ({
        ...step,
        status: index === 0 ? 'current' : 'pending',
      })),
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
    connectRepository: {
      mutate: connectRepositoryMutation.mutate,
      mutateAsync: connectRepositoryMutation.mutateAsync,
      isPending: connectRepositoryMutation.isPending,
      error: connectRepositoryMutation.error,
    },
    configureAi: {
      mutate: configureAiMutation.mutate,
      mutateAsync: configureAiMutation.mutateAsync,
      isPending: configureAiMutation.isPending,
      error: configureAiMutation.error,
    },
    finishOnboarding: {
      mutate: finishOnboarding.mutate,
      mutateAsync: finishOnboarding.mutateAsync,
      isPending: finishOnboarding.isPending,
      error: finishOnboarding.error,
    },
  };
}

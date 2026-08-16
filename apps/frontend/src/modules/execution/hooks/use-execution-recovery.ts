import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  executionApi,
  type ExecutionRun,
  type ExecutionStep,
  type RecoveryOptions,
  type RecoveryAction,
} from '../api/execution-api';

export function useExecutionRun(taskId: string | undefined) {
  return useQuery({
    queryKey: ['executionRun', taskId],
    enabled: !!taskId,
    queryFn: () => executionApi.getRun(taskId!),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'running') {
        return 2000;
      }
      return false;
    },
  });
}

export function useExecutionSteps(taskId: string | undefined) {
  return useQuery({
    queryKey: ['executionSteps', taskId],
    enabled: !!taskId,
    queryFn: () => executionApi.getAvailableSteps(taskId!),
  });
}

export function useRetryExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => executionApi.retry(taskId),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', taskId] });
    },
  });
}

export function useRetryStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, stepId }: { taskId: string; stepId: string }) =>
      executionApi.retryStep(taskId, stepId),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', taskId] });
      queryClient.invalidateQueries({ queryKey: ['executionSteps', taskId] });
    },
  });
}

export function useAdjustParams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      params,
    }: {
      taskId: string;
      params: Record<string, unknown>;
    }) => executionApi.adjustParams(taskId, params),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', taskId] });
    },
  });
}

export function useEscalateExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      escalateTo,
      reason,
    }: {
      taskId: string;
      escalateTo: string;
      reason?: string;
    }) => executionApi.escalate(taskId, escalateTo, reason),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', taskId] });
    },
  });
}

export function useAbortExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason?: string }) =>
      executionApi.abort(taskId, reason),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', taskId] });
    },
  });
}

export function useExecutionRecovery(taskId: string | undefined) {
  const [selectedAction, setSelectedAction] = useState<RecoveryAction | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [adjustedParams, setAdjustedParams] = useState<Record<string, unknown>>({});
  const [escalateTo, setEscalateTo] = useState('');
  const [escalateReason, setEscalateReason] = useState('');

  const retryExecution = useRetryExecution();
  const retryStep = useRetryStep();
  const adjustParams = useAdjustParams();
  const escalate = useEscalateExecution();
  const abort = useAbortExecution();

  const { data: run } = useExecutionRun(taskId);
  const { data: steps } = useExecutionSteps(taskId);

  const failedSteps = steps?.filter((s) => s.status === 'failed') ?? [];

  const executeRecovery = async () => {
    if (!taskId || !selectedAction) return;

    switch (selectedAction) {
      case 'retry':
        await retryExecution.mutateAsync(taskId);
        break;
      case 'retry_step':
        if (selectedStepId) {
          await retryStep.mutateAsync({ taskId, stepId: selectedStepId });
        }
        break;
      case 'adjust_params':
        await adjustParams.mutateAsync({ taskId, params: adjustedParams });
        break;
      case 'escalate':
        await escalate.mutateAsync({
          taskId,
          escalateTo,
          reason: escalateReason || undefined,
        });
        break;
      case 'abort':
        await abort.mutateAsync({ taskId, reason: escalateReason || undefined });
        break;
    }

    resetRecovery();
  };

  const resetRecovery = () => {
    setSelectedAction(null);
    setSelectedStepId(null);
    setAdjustedParams({});
    setEscalateTo('');
    setEscalateReason('');
  };

  return {
    selectedAction,
    setSelectedAction,
    selectedStepId,
    setSelectedStepId,
    adjustedParams,
    setAdjustedParams,
    escalateTo,
    setEscalateTo,
    escalateReason,
    setEscalateReason,
    executeRecovery,
    resetRecovery,
    run,
    steps,
    failedSteps,
    isRecovering:
      retryExecution.isPending ||
      retryStep.isPending ||
      adjustParams.isPending ||
      escalate.isPending ||
      abort.isPending,
    error:
      retryExecution.error ||
      retryStep.error ||
      adjustParams.error ||
      escalate.error ||
      abort.error,
  };
}

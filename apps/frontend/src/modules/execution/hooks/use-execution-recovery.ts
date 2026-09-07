import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  executionApi,
  type ExecutionRun,
  type ExecutionStep,
  type RecoveryOptions,
  type RecoveryAction,
} from '../api/execution-api';

export function useExecutionRun(issueId: string | undefined) {
  return useQuery({
    queryKey: ['executionRun', issueId],
    enabled: !!issueId,
    queryFn: () => executionApi.getRun(issueId!),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'running') {
        return 2000;
      }
      return false;
    },
  });
}

export function useExecutionSteps(issueId: string | undefined) {
  return useQuery({
    queryKey: ['executionSteps', issueId],
    enabled: !!issueId,
    queryFn: () => executionApi.getAvailableSteps(issueId!),
  });
}

export function useRetryExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => executionApi.retry(issueId),
    onSuccess: (_, issueId) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', issueId] });
    },
  });
}

export function useRetryStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, stepId }: { issueId: string; stepId: string }) =>
      executionApi.retryStep(issueId, stepId),
    onSuccess: (_, { issueId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', issueId] });
      queryClient.invalidateQueries({ queryKey: ['executionSteps', issueId] });
    },
  });
}

export function useAdjustParams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      params,
    }: {
      issueId: string;
      params: Record<string, unknown>;
    }) => executionApi.adjustParams(issueId, params),
    onSuccess: (_, { issueId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', issueId] });
    },
  });
}

export function useEscalateExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      escalateTo,
      reason,
    }: {
      issueId: string;
      escalateTo: string;
      reason?: string;
    }) => executionApi.escalate(issueId, escalateTo, reason),
    onSuccess: (_, { issueId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', issueId] });
    },
  });
}

export function useAbortExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, reason }: { issueId: string; reason?: string }) =>
      executionApi.abort(issueId, reason),
    onSuccess: (_, { issueId }) => {
      queryClient.invalidateQueries({ queryKey: ['executionRun', issueId] });
    },
  });
}

export function useExecutionRecovery(issueId: string | undefined) {
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

  const { data: run } = useExecutionRun(issueId);
  const { data: steps } = useExecutionSteps(issueId);

  const failedSteps = steps?.filter((s) => s.status === 'failed') ?? [];

  const executeRecovery = async () => {
    if (!issueId || !selectedAction) return;

    switch (selectedAction) {
      case 'retry':
        await retryExecution.mutateAsync(issueId);
        break;
      case 'retry_step':
        if (selectedStepId) {
          await retryStep.mutateAsync({ issueId, stepId: selectedStepId });
        }
        break;
      case 'adjust_params':
        await adjustParams.mutateAsync({ issueId, params: adjustedParams });
        break;
      case 'escalate':
        await escalate.mutateAsync({
          issueId,
          escalateTo,
          reason: escalateReason || undefined,
        });
        break;
      case 'abort':
        await abort.mutateAsync({ issueId, reason: escalateReason || undefined });
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

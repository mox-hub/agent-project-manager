import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';
import { ApiClientError } from '@/shared/types/api';

/** 错误文案兜底翻译签名（测试传 stub 即可，不依赖 i18next 实例） */
export type TranslateFn = (key: string) => string;

/**
 * 「测试连接」错误 → toast 文案解析（纯函数，供 handleTestConnection 与单测共用）：
 * - 前端超时（TIMEOUT）：不透传英文 axios 默认文案，用 i18n 超时提示（后端 60s 内仍在验证）；
 * - 网络断开（NETWORK_ERROR）：axios message 为英文默认文案，禁用，回落 i18n 连接失败；
 * - 其余 ApiClientError（后端错误信封）：透传 error.message——保留后端验证链路拼好的结构化诊断；
 * - 非 Error / 空 message：回落 i18n 连接失败。
 */
export function resolveTestConnectionErrorMessage(
  error: unknown,
  t: TranslateFn,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'TIMEOUT') return t('aiHub.testConnectionTimeout');
    if (error.code === 'NETWORK_ERROR') return t('aiHub.connectionFailed');
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return t('aiHub.connectionFailed');
}

export const providerKeys = {
  all: ['providers'] as const,
  detail: (id: string) => ['providers', id] as const,
};

export const defaultModelKeys = {
  all: ['ai-default-model'] as const,
};

/**
 * 获取所有 AI Provider 配置
 */
export function useAiProviders() {
  return useQuery({
    queryKey: providerKeys.all,
    queryFn: () => aiHubApi.getProviders(),
  });
}

/**
 * 获取单个 Provider 配置
 */
export function useAiProvider(id: string) {
  return useQuery({
    queryKey: providerKeys.detail(id),
    queryFn: () => aiHubApi.getProvider(id),
    enabled: !!id,
  });
}

/**
 * 创建 Provider
 */
export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof aiHubApi.createProvider>[0]) =>
      aiHubApi.createProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

/**
 * 更新 Provider
 * Supports optimistic update via `optimisticUpdate` field in variables.
 */
export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof aiHubApi.updateProvider>[1];
    }) => aiHubApi.updateProvider(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
      queryClient.invalidateQueries({ queryKey: providerKeys.detail(id) });
    },
  });
}

/**
 * 测试已保存的 Provider 连接
 */
export function useTestProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiHubApi.testProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

/**
 * 删除 Provider
 */
export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiHubApi.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

/**
 * 获取 Provider 的可用模型
 */
export function useProviderModels(providerId: string) {
  return useQuery({
    queryKey: ['provider-models', providerId],
    queryFn: () => aiHubApi.detectModels(providerId),
    enabled: !!providerId,
  });
}

/**
 * 真实查询供应商模型清单（/models 端点，覆盖式落 AIModelConfig 并回流 availableModels）
 */
export function useDetectModels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiHubApi.detectModels(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

/**
 * 查询厂家余额（归一化：充值型单余额 / 套餐型限额窗口；已配置 API key 才启用）
 */
export function useProviderBalance(id: string, hasApiKey: boolean) {
  return useQuery({
    queryKey: ['provider-balance', id],
    queryFn: () => aiHubApi.getProviderBalance(id),
    enabled: !!id && hasApiKey,
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * 读取工作区内置模型（未设置时 provider/model 为 null）
 */
export function useDefaultModel() {
  return useQuery({
    queryKey: defaultModelKeys.all,
    queryFn: () => aiHubApi.getDefaultModel(),
  });
}

/**
 * 设置工作区内置模型
 */
export function useSetDefaultModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { provider: string; model: string }) =>
      aiHubApi.setDefaultModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defaultModelKeys.all });
    },
  });
}

/**
 * Hook to get all available AI models
 */
export function useAiModels(provider?: string) {
  return useQuery({
    queryKey: ['ai-models', provider],
    queryFn: () => aiHubApi.getModels(provider),
  });
}

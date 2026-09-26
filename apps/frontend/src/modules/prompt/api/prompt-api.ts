/**
 * 提示词治理 API（CAP-A-24）
 *
 * 系统提示词只读查看、注入开关、项目级提示词、派发完整 prompt 干跑预览。
 * 类型单源于 openapi 契约（ResponseOf/RequestBodyOf）。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import type {
  RequestBodyOf,
  ResponseOf,
} from '@/infrastructure/api-client/contract';

export type SystemPromptMeta = ResponseOf<
  'PromptController_listSystemPrompts'
>['items'][number];
export type SystemPromptDetail = ResponseOf<'PromptController_getSystemPrompt'>;
export type PromptInjectionToggles =
  ResponseOf<'PromptController_getConfig'>['toggles'];
export type PromptConfig = ResponseOf<'PromptController_getConfig'>;
export type PromptPreviewSection =
  ResponseOf<'CliDispatchController_previewPrompt'>['sections'][number];
export type PromptPreview = ResponseOf<'CliDispatchController_previewPrompt'>;

export const promptApi = {
  listSystem: () =>
    api.get<ResponseOf<'PromptController_listSystemPrompts'>>('/prompts/system'),
  getSystem: (key: string) =>
    api.get<ResponseOf<'PromptController_getSystemPrompt'>>(
      `/prompts/system/${key}`,
    ),
  getConfig: (projectId?: string) =>
    api.get<ResponseOf<'PromptController_getConfig'>>(
      '/prompts/config',
      projectId ? { projectId } : undefined,
    ),
  updateConfig: (data: RequestBodyOf<'PromptController_updateConfig'>) =>
    api.put<ResponseOf<'PromptController_updateConfig'>>(
      '/prompts/config',
      data,
    ),
  preview: (issueId: string, memberId?: string) =>
    api.get<ResponseOf<'CliDispatchController_previewPrompt'>>(
      `/ai/issues/${issueId}/prompt-preview`,
      memberId ? { memberId } : undefined,
    ),
};

export const promptKeys = {
  all: ['prompt'] as const,
  system: () => [...promptKeys.all, 'system'] as const,
  systemDetail: (key: string) => [...promptKeys.all, 'system', key] as const,
  config: (projectId?: string) =>
    [...promptKeys.all, 'config', projectId ?? 'workspace'] as const,
  preview: (issueId: string, memberId?: string) =>
    [...promptKeys.all, 'preview', issueId, memberId ?? 'none'] as const,
};

/** 系统提示词列表（只读元数据） */
export function useSystemPrompts() {
  return useQuery({
    queryKey: promptKeys.system(),
    queryFn: promptApi.listSystem,
  });
}

/** 系统提示词详情（只读全文） */
export function useSystemPromptDetail(key: string | null) {
  return useQuery({
    queryKey: promptKeys.systemDetail(key ?? ''),
    queryFn: () => promptApi.getSystem(key as string),
    enabled: !!key,
  });
}

/** 注入配置（开关 + 项目级提示词；传 projectId 时附带项目提示词全文） */
export function usePromptConfig(projectId?: string) {
  return useQuery({
    queryKey: promptKeys.config(projectId),
    queryFn: () => promptApi.getConfig(projectId),
  });
}

export function useUpdatePromptConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestBodyOf<'PromptController_updateConfig'>) =>
      promptApi.updateConfig(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promptKeys.all });
    },
  });
}

/** 派发完整 prompt 干跑预览（enabled 由调用方通过 issueId 是否传入控制） */
export function usePromptPreview(issueId: string | null, memberId?: string) {
  return useQuery({
    queryKey: promptKeys.preview(issueId ?? '', memberId),
    queryFn: () => promptApi.preview(issueId as string, memberId),
    enabled: !!issueId,
  });
}

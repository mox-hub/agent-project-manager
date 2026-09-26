/**
 * 提示词治理 API（CAP-A-24 + 增强 A/C/D）
 *
 * 系统提示词只读查看、注入开关、项目级提示词（含 AGENTS.md 物化状态）、
 * 提示词模板库（内置 + 自定义）、注入率统计、派发完整 prompt 干跑预览。
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
export type PromptUsageStats = ResponseOf<'PromptController_getUsageStats'>;
export type PromptUsageSection = PromptUsageStats['sections'][number];
export type PromptTemplateItem =
  ResponseOf<'PromptController_listTemplates'>['items'][number];
export type PromptTemplateDraft = ResponseOf<'PromptController_createTemplate'>;
export type PromptTemplatePreview =
  ResponseOf<'PromptController_previewTemplate'>;

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
  usageStats: (sampleSize?: number) =>
    api.get<ResponseOf<'PromptController_getUsageStats'>>(
      '/prompts/usage-stats',
      sampleSize ? { sampleSize } : undefined,
    ),
  listTemplates: (params?: { target?: string; scope?: string; projectId?: string }) =>
    api.get<ResponseOf<'PromptController_listTemplates'>>(
      '/prompts/templates',
      params,
    ),
  createTemplate: (data: RequestBodyOf<'PromptController_createTemplate'>) =>
    api.post<ResponseOf<'PromptController_createTemplate'>>(
      '/prompts/templates',
      data,
    ),
  updateTemplate: (
    id: string,
    data: RequestBodyOf<'PromptController_updateTemplate'>,
  ) =>
    api.put<ResponseOf<'PromptController_updateTemplate'>>(
      `/prompts/templates/${id}`,
      data,
    ),
  deleteTemplate: (id: string) =>
    api.delete<ResponseOf<'PromptController_deleteTemplate'>>(
      `/prompts/templates/${id}`,
    ),
  previewTemplate: (
    data: RequestBodyOf<'PromptController_previewTemplate'>,
  ) =>
    api.post<ResponseOf<'PromptController_previewTemplate'>>(
      '/prompts/templates/preview',
      data,
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
  usageStats: () => [...promptKeys.all, 'usage-stats'] as const,
  templates: (target?: string, projectId?: string) =>
    [...promptKeys.all, 'templates', target ?? 'all', projectId ?? 'all'] as const,
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

/** 注入配置（开关 + 项目级提示词 + AGENTS.md 文件侧状态） */
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

/** 注入率统计（最近执行载荷段头解析） */
export function usePromptUsageStats() {
  return useQuery({
    queryKey: promptKeys.usageStats(),
    queryFn: () => promptApi.usageStats(),
  });
}

/** 提示词模板库（内置 + 自定义；target 过滤） */
export function usePromptTemplates(target?: string, projectId?: string) {
  return useQuery({
    queryKey: promptKeys.templates(target, projectId),
    queryFn: () =>
      promptApi.listTemplates({
        ...(target ? { target } : {}),
        ...(projectId ? { projectId, scope: 'project' } : {}),
      }),
  });
}

export function useCreatePromptTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestBodyOf<'PromptController_createTemplate'>) =>
      promptApi.createTemplate(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: promptKeys.templates(),
      });
    },
  });
}

export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: RequestBodyOf<'PromptController_updateTemplate'>;
    }) => promptApi.updateTemplate(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: promptKeys.templates(),
      });
    },
  });
}

export function useDeletePromptTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promptApi.deleteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: promptKeys.templates(),
      });
    },
  });
}

/** 模板插值干跑（按任务事实）——命令式调用为主，不挂 query 缓存 */
export async function previewPromptTemplate(body: string, issueId: string) {
  return promptApi.previewTemplate({ body, issueId });
}

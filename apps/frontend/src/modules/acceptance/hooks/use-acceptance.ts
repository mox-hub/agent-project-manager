/**
 * Acceptance Hooks — 查询与闭环操作（接收/驳回/豁免/标准判定/审计）
 * mutations 统一 invalidate：detail + list + 所属 task 的验收列表
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  acceptanceApi,
  type Acceptance,
} from '@/modules/acceptance/api/acceptance-api';

export const acceptanceKeys = {
  all: ['acceptance'] as const,
  byTask: (taskId: string) => [...acceptanceKeys.all, 'task', taskId] as const,
  detail: (id: string) => [...acceptanceKeys.all, 'detail', id] as const,
  audit: (id: string) => [...acceptanceKeys.all, 'audit', id] as const,
  systemChecklists: () => [...acceptanceKeys.all, 'systemChecklists'] as const,
};

export function useAcceptancesByTask(taskId: string | undefined) {
  return useQuery<Acceptance[]>({
    queryKey: acceptanceKeys.byTask(taskId ?? ''),
    queryFn: () => acceptanceApi.listByTask(taskId!),
    enabled: !!taskId,
  });
}

/** 全局 acceptance 列表查询（分页） */
export function useAcceptanceList(
  params: {
    status?: string;
    taskId?: string;
    projectId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  return useQuery({
    queryKey: [...acceptanceKeys.all, 'list', params],
    queryFn: () => acceptanceApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAcceptanceDetail(id: string | undefined) {
  return useQuery<Acceptance>({
    queryKey: acceptanceKeys.detail(id ?? ''),
    queryFn: () => acceptanceApi.findOne(id!),
    enabled: !!id,
  });
}

/** 创建验收契约（列表页 / 任务页"生成验收契约"共用） */
export function useCreateAcceptance() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  return useMutation({
    mutationFn: (payload: Parameters<typeof acceptanceApi.create>[0]) =>
      acceptanceApi.create(payload, currentUser?.id),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.byTask(created.taskId) });
      qc.invalidateQueries({ queryKey: [...acceptanceKeys.all, 'list'] });
    },
  });
}

/** 更新验收契约元数据（title/description/priority/非终态 status） */
export function useUpdateAcceptance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof acceptanceApi.update>[1];
    }) => acceptanceApi.update(id, patch),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: acceptanceKeys.byTask(updated.taskId) });
    },
  });
}

/** 接收完成（聚合校验失败时抛出带 failures 的错误，由调用方逐条展示） */
export function useAcceptCompletion() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      evidence?: Record<string, unknown>;
      taskId: string;
    }) => acceptanceApi.acceptCompletion(vars.id, vars.evidence, currentUser?.id),
    onSuccess: (_updated, { taskId }) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.all });
      if (taskId) qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

/** 驳回完成 */
export function useRejectCompletion() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string; taskId: string }) =>
      acceptanceApi.rejectCompletion(vars.id, vars.reason, currentUser?.id),
    onSuccess: (_updated, { taskId }) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.all });
      if (taskId) qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

/** 豁免验收 */
export function useWaiveCompletion() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string; taskId: string }) =>
      acceptanceApi.waiveCompletion(vars.id, vars.reason, currentUser?.id),
    onSuccess: (_updated, { taskId }) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.all });
      if (taskId) qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

/** 更新验收标准（状态判定） */
export function useUpdateCriterion() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  return useMutation({
    mutationFn: (vars: {
      criteriaId: string;
      acceptanceId: string;
      data: Parameters<typeof acceptanceApi.updateCriterion>[1];
    }) => acceptanceApi.updateCriterion(vars.criteriaId, vars.data, currentUser?.id),
    onSuccess: (_updated, { acceptanceId }) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.detail(acceptanceId) });
    },
  });
}

/** 添加验收标准 */
export function useAddCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      acceptanceId,
      dto,
    }: {
      acceptanceId: string;
      dto: Parameters<typeof acceptanceApi.addCriterion>[1];
    }) => acceptanceApi.addCriterion(acceptanceId, dto),
    onSuccess: (_created, { acceptanceId }) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.detail(acceptanceId) });
    },
  });
}

/** 删除验收标准 */
export function useDeleteCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { criteriaId: string; acceptanceId: string }) =>
      acceptanceApi.deleteCriterion(vars.criteriaId),
    onSuccess: (_res, { acceptanceId }) => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.detail(acceptanceId) });
    },
  });
}

/** 触发完整性审计 */
export function useAudit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checklistId?: string) =>
      api.post(`/acceptance/${id}/audit`, { checklistId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.detail(id) });
    },
  });
}

/** 采纳审计提议（采纳后服务端自动重审计） */
export function useApplySuggestions(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      api.post(`/acceptance/${id}/apply-suggestions`, { itemIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: acceptanceKeys.detail(id) });
    },
  });
}

export function useSystemChecklists() {
  return useQuery({
    queryKey: acceptanceKeys.systemChecklists(),
    queryFn: () => api.get('/acceptance/checklists/system'),
  });
}

import { AsyncLocalStorage } from 'async_hooks';

export interface WorkspaceRequestContext {
  /** 请求头 x-workspace-id 解析出的目标工作区；null = 默认工作区（DATABASE_URL） */
  workspaceId: string | null;
}

/** 请求级工作区上下文：middleware 进入时 run，数据层经其取当前工作区 */
export const workspaceALS = new AsyncLocalStorage<WorkspaceRequestContext>();

export function getCurrentWorkspaceId(): string | null {
  return workspaceALS.getStore()?.workspaceId ?? null;
}

/**
 * 跨工作区执行原语（CAP-A-25）。
 *
 * 为什么需要：数据层（`prisma.service.ts` 的代理）按**请求上下文**（`x-workspace-id`
 * → `workspaceALS`）路由到对应 SQLite 库。绝大多数场景这正是要的；但「记录只存在于
 * 某个工作区的库内、且调用方并不知道是哪一个」时必须能主动**切库**——典型例子是
 * `TeamInvite`：它没有 workspaceId 字段，令牌只存在于签发它的那个库中。
 *
 * 本文件只提供两种能力，刻意做成**纯函数**（无 DI、无状态），与
 * `workspace-registry.util.ts` 同形，避免 Nest 循环依赖：
 *  1. `runInWorkspace` —— 显式在指定工作区的库上下文内执行（`workspaceALS.run`，
 *     与 workflow 引擎续跑同机制）；退出后恢复调用方原有上下文。
 *  2. `findFirstAcrossWorkspaces` —— 逐库执行同一查询，取首个命中，用于定位「记录在哪个库」。
 *
 * 边界（不得静默扩大）：
 * - 这是**显式切库**，不是路由回落：调用方必须明确知道自己在访问别的工作区，且切换依据
 *   是「记录自身所在库」这类同库可证的事实。**P0-7「已带 x-workspace-id 绝不静默回落
 *   默认库」不因本工具松动**——数据层代理的语义未改。
 * - 扫描面 = 注册表中**库文件确实存在**的工作区（`resolveWorkspaceDbUrl` 非空）；
 *   未初始化/已删除的工作区被跳过，而不是让代理抛 404 中断整轮扫描。
 * - 扫描成本 = 每库一次查询；调用点均为低频路径（接受邀请、登录失败探测），
 *   不得用于高频读路径。
 */
import {
  DEFAULT_WORKSPACE_ID,
  listWorkspaces,
  resolveWorkspaceDbUrl,
} from './workspace-registry.util';
import { workspaceALS } from './workspace-context';

/** 在指定工作区的库上下文内执行 `fn`；`fn` 内的数据层访问落在该库。 */
export function runInWorkspace<T>(
  workspaceId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  return workspaceALS.run({ workspaceId }, fn);
}

/**
 * 参与跨库扫描的工作区 id，default 恒在首位（绝大多数主体住在默认库，先命中即少查）。
 *
 * default **恒可扫描**：它的目标就是 `DATABASE_URL`，真正缺配置时数据层会在访问时
 * 显式报错，不需要本函数预先代为判断（且单测里 `DATABASE_URL` 常未设——若在此过滤掉
 * default，扫描面会静默变成空集，行为与运行时不一致）。
 * 其余工作区仅在库文件确实存在时参与，避免未初始化/已删除的工作区让整轮扫描中断。
 */
export function scannableWorkspaceIds(): string[] {
  const ids: string[] = [DEFAULT_WORKSPACE_ID];
  for (const w of listWorkspaces()) {
    if (w.id === DEFAULT_WORKSPACE_ID) continue;
    if (resolveWorkspaceDbUrl(w.id) !== null) ids.push(w.id);
  }
  return ids;
}

export interface WorkspaceHit<T> {
  workspaceId: string;
  value: T;
}

/**
 * 逐个工作区执行 `lookup`（在各自的库上下文内），返回首个非空命中。
 * 全部未命中返回 null。
 */
export async function findFirstAcrossWorkspaces<T>(
  lookup: () => Promise<T | null>,
): Promise<WorkspaceHit<T> | null> {
  for (const workspaceId of scannableWorkspaceIds()) {
    const value = await runInWorkspace(workspaceId, lookup);
    if (value) {
      return { workspaceId, value };
    }
  }
  return null;
}

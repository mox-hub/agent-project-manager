/**
 * 桌面端会话跨 origin 持久化桥。
 *
 * 背景：生产模式前端由 server 托管，API 端口在 4300–4399 间动态探测——重启后 origin
 * 可能漂移，localStorage 按 origin 隔离，登录态/工作区选择/引导完成标记会全部丢失。
 * 壳侧以 desktop-state.json 承载镜像：启动时恢复进 localStorage（restoreDesktopSession），
 * 关键变更点（登录/登出/401 清除/工作区切换/向导完成）镜像回壳。
 * Web 模式下全部为 no-op。
 */
import { invoke, isTauriAvailable, type DesktopPersistentState } from '@/shared/types/electron-api';

const ZUSTAND_STORAGE_KEY = 'app-storage';

async function readShellState(): Promise<DesktopPersistentState> {
  try {
    return await invoke<DesktopPersistentState>('get_desktop_state');
  } catch {
    return {};
  }
}

async function writeShellState(patch: DesktopPersistentState): Promise<void> {
  try {
    await invoke('set_desktop_state', patch as unknown as Record<string, unknown>);
  } catch {
    // 壳桥不可用时静默——localStorage 本身仍是最快恢复源（origin 未漂移场景）
  }
}

/**
 * 应用入口早期调用：把壳侧镜像恢复进 localStorage。
 * - access_token / apm-workspace-id：直接按同名键写入（localStorage 无值或与壳侧不一致时以壳为准）
 * - onboarding_completed：merge 进 zustand persist JSON（app-storage）
 */
export async function restoreDesktopSession(): Promise<void> {
  if (!isTauriAvailable()) {
    return;
  }
  const state = await readShellState();

  if (state.access_token) {
    localStorage.setItem('access_token', state.access_token);
  }
  if (state['apm-workspace-id']) {
    localStorage.setItem('apm-workspace-id', state['apm-workspace-id']);
  }
  if (state.onboarding_completed) {
    try {
      const raw = localStorage.getItem(ZUSTAND_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }) : null;
      if (parsed && parsed.state && !parsed.state.onboardingCompleted) {
        parsed.state.onboardingCompleted = true;
        localStorage.setItem(ZUSTAND_STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {
      // persist JSON 损坏时交由 zustand 自身迁移逻辑兜底
    }
  }
}

export function persistTokenToShell(token: string | null): void {
  if (!isTauriAvailable()) {
    return;
  }
  void writeShellState({ access_token: token ?? undefined });
}

export function persistWorkspaceToShell(workspaceId: string | null): void {
  if (!isTauriAvailable()) {
    return;
  }
  void writeShellState({ 'apm-workspace-id': workspaceId ?? undefined });
}

export function persistOnboardingToShell(completed: boolean): void {
  if (!isTauriAvailable()) {
    return;
  }
  void writeShellState({ onboarding_completed: completed ? true : undefined });
}

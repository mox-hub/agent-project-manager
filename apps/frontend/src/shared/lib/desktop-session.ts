/**
 * 桌面端会话跨 origin 持久化桥。
 *
 * 背景：生产模式前端由 server 托管，API 端口在 4300–4399 间动态探测——重启后 origin
 * 可能漂移，localStorage 按 origin 隔离，登录态/工作区选择/引导完成标记会全部丢失。
 * 壳侧以 desktop-state.json 承载镜像：启动时恢复进 localStorage（restoreDesktopSession），
 * 关键变更点（登录/登出/401 清除/工作区切换/向导完成）镜像回壳。
 * Web 模式下全部为 no-op。
 */
import {
  getApiBaseUrl,
  invoke,
  isDesktopShellAvailable,
  setApiBaseUrl,
  type DesktopAppInfo,
  type DesktopPersistentState,
} from '@/shared/types/electron-api';

const ZUSTAND_STORAGE_KEY = 'app-storage';

/**
 * API base 钉底重试预算。壳在（重）启后端期间 `state.backend` 为空，get_app_info
 * 会返回空 apiBaseUrl——这是**瞬时**状态（后端健康后壳即回填），必须退避重试。
 * 20 × 300ms ≈ 6s 覆盖实机观测到的后端自愈重启窗口（进程退出 → 健康约 5–6s）。
 */
const BASE_PIN_ATTEMPTS = 20;
const BASE_PIN_RETRY_MS = 300;

export interface DesktopSessionRestore {
  /** 会话是否可用于继续渲染：Web 模式恒 true；桌面模式要求 API base 已钉底 */
  ready: boolean;
  /** 未就绪原因（供启动失败屏展示与诊断） */
  reason?: string;
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 钉底壳侧真实后端地址（动态端口 4300–4399）。
 *
 * 这是「登录后弹回登录页」的关键防线：一旦钉底失败，前端会回落 `/_api` 走 Vite
 * 代理默认端口 4300，而该端口常被上一代遗留的僵尸后端占用——有效 token 会被陈旧
 * 实例判 401，401 拦截器清登录态并踢回 /login，认证面挂紧凑窗钩子随即弹出认证窗。
 * 故此处只对「瞬时未就绪」（拿到响应但 apiBaseUrl 为空）重试；命令面不可用属永久
 * 状态，立即放弃交由调用方显式报错。
 */
async function pinDesktopApiBase(): Promise<string | null> {
  if (!isDesktopShellAvailable()) {
    return null;
  }
  for (let attempt = 1; attempt <= BASE_PIN_ATTEMPTS; attempt += 1) {
    try {
      const info = await invoke<DesktopAppInfo>('get_app_info');
      if (info?.apiBaseUrl) {
        setApiBaseUrl(info.apiBaseUrl);
        return info.apiBaseUrl;
      }
    } catch {
      // 桥梁/命令面不可用（旧壳版本无 get_app_info）：重试无意义，直接放弃
      return null;
    }
    if (attempt < BASE_PIN_ATTEMPTS) {
      await sleep(BASE_PIN_RETRY_MS);
    }
  }
  return null;
}

/**
 * 应用入口早期调用：钉底后端地址 + 把壳侧镜像恢复进 localStorage。
 * - API base：壳侧真实后端地址（**必须先于一切请求**，见 pinDesktopApiBase）
 * - access_token / apm-workspace-id：直接按同名键写入（localStorage 无值或与壳侧不一致时以壳为准）
 * - onboarding_completed：merge 进 zustand persist JSON（app-storage）
 *
 * 返回 `ready=false` 时调用方**不得**照常渲染：那会让请求打到未知后端并被误判未登录。
 */
export async function restoreDesktopSession(): Promise<DesktopSessionRestore> {
  if (!isDesktopShellAvailable()) {
    return { ready: true };
  }
  const base = getApiBaseUrl() ?? (await pinDesktopApiBase());
  const state = await readShellState();

  if (state.access_token) {
    localStorage.setItem('access_token', state.access_token);
  } else {
    // 壳侧镜像缺失（壳重启后镜像被清、新窗口、早期版本未镜像）但本 origin 仍有会话：
    // 回写镜像，避免后续窗口/重启恢复不到登录态而被判未登录
    const localToken = localStorage.getItem('access_token');
    if (localToken) {
      persistTokenToShell(localToken);
    }
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

  if (!base) {
    return { ready: false, reason: '壳侧后端地址未知（本地服务未就绪或正在重启）' };
  }
  return { ready: true };
}

export function persistTokenToShell(token: string | null): void {
  if (!isDesktopShellAvailable()) {
    return;
  }
  void writeShellState({ access_token: token ?? undefined });
}

export function persistWorkspaceToShell(workspaceId: string | null): void {
  if (!isDesktopShellAvailable()) {
    return;
  }
  void writeShellState({ 'apm-workspace-id': workspaceId ?? undefined });
}

export function persistOnboardingToShell(completed: boolean): void {
  if (!isDesktopShellAvailable()) {
    return;
  }
  void writeShellState({ onboarding_completed: completed ? true : undefined });
}

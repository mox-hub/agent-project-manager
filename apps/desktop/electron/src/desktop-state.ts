/**
 * 壳侧会话状态持久化（userData/desktop-state.json）。
 *
 * 为什么不能只靠 localStorage：生产模式前端由 server 托管，API 端口在 4300–4399
 * 间动态探测——重启后 origin 可能漂移，localStorage 按 origin 隔离，登录态/工作区
 * 选择/引导完成标记全部丢失（每次启动都要重登）。token 有效期 7 天由服务端 JWT
 * 兜底（过期 401 回登录页），壳侧只负责跨 origin 搬运。
 */
import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger';

export interface DesktopPersistentState {
  /** 登录成功后的 JWT（前端 localStorage['access_token'] 的镜像） */
  access_token?: string;
  /** 当前工作区（前端 localStorage['apm-workspace-id'] 的镜像） */
  'apm-workspace-id'?: string;
  /** 初始化向导是否已完成 */
  onboarding_completed?: boolean;
}

const STATE_FILE = 'desktop-state.json';

function statePath(userDataDir: string): string {
  return path.join(userDataDir, STATE_FILE);
}

export function loadDesktopState(userDataDir: string): DesktopPersistentState {
  try {
    const raw = fs.readFileSync(statePath(userDataDir), 'utf-8');
    const parsed = JSON.parse(raw) as DesktopPersistentState;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function saveDesktopState(
  userDataDir: string,
  patch: DesktopPersistentState,
): DesktopPersistentState {
  const next = { ...loadDesktopState(userDataDir), ...patch };
  for (const key of Object.keys(next) as Array<keyof DesktopPersistentState>) {
    if (next[key] === undefined || next[key] === null) {
      delete next[key];
    }
  }
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(statePath(userDataDir), JSON.stringify(next, null, 2));
  logger.info(`桌面状态已保存: ${Object.keys(patch).join(', ') || '(空)'}`);
  return next;
}

export function clearDesktopStateKeys(userDataDir: string, keys: string[]): DesktopPersistentState {
  const current = loadDesktopState(userDataDir);
  for (const key of keys) {
    delete current[key as keyof DesktopPersistentState];
  }
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(statePath(userDataDir), JSON.stringify(current, null, 2));
  logger.info(`桌面状态键已清除: ${keys.join(', ')}`);
  return current;
}

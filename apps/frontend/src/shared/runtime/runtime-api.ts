/**
 * @file Runtime 控制面共享 API 与 hook
 * @description 守护进程注册列表（脱敏、2×心跳判活）供设置·运行时页与成员工具授权下拉共用。
 */
import { useQuery } from '@tanstack/react-query';

import { api } from '@/infrastructure/api-client';

export interface RuntimeRegistration {
  runtimeId: string;
  deviceId: string;
  hostPlatform: string;
  runtimeVersion: string;
  protocolVersion: string;
  workspaceRoots: string[];
  availableProviders: string[];
  cliProviders: string[];
  status: 'online' | 'offline';
  lastHeartbeatAt: string;
  lastSeenAt: string;
}

export function getRuntimeRegistrations(): Promise<RuntimeRegistration[]> {
  return api.get('/runtime/registrations');
}

/** 心跳间隔 30s，30s 轮询保持在线态与列表新鲜 */
export function useRuntimeRegistrations() {
  return useQuery({
    queryKey: ['runtime-admin', 'registrations'],
    queryFn: getRuntimeRegistrations,
    refetchInterval: 30_000,
  });
}

/** deviceId `device-<hostname>` → 机器展示名 */
export function machineDisplayName(
  reg: Pick<RuntimeRegistration, 'deviceId' | 'runtimeId'>,
): string {
  if (reg.deviceId.startsWith('device-')) {
    return reg.deviceId.slice('device-'.length) || reg.runtimeId;
  }
  return reg.deviceId || reg.runtimeId;
}

/**
 * 同 deviceId 多条注册时取代表注册：在线优先，其次心跳最新。
 * 后端单实例保证会把同设备旧注册压成 offline，展示层按设备去重即可。
 */
export function pickRepresentativeRegistrations(
  regs: RuntimeRegistration[],
): RuntimeRegistration[] {
  const byDevice = new Map<string, RuntimeRegistration>();
  for (const reg of regs) {
    const prev = byDevice.get(reg.deviceId);
    if (
      !prev ||
      (reg.status === 'online' && prev.status !== 'online') ||
      (reg.status === prev.status &&
        (reg.lastHeartbeatAt ?? '') > (prev.lastHeartbeatAt ?? ''))
    ) {
      byDevice.set(reg.deviceId, reg);
    }
  }
  return [...byDevice.values()];
}

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** 相对时间：刚刚 / N 分钟前 / N 小时前，超过一天回落本地时间 */
export function formatRelativeTime(value: string | undefined, t: Translate): string {
  if (!value) return '—';
  const time = Date.parse(value);
  if (Number.isNaN(time)) return '—';
  const diffMin = Math.floor((Date.now() - time) / 60_000);
  if (diffMin < 1) return t('settings.runtimeJustNow');
  if (diffMin < 60) return t('settings.runtimeMinutesAgo', { n: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('settings.runtimeHoursAgo', { n: diffHour });
  return new Date(time).toLocaleString();
}

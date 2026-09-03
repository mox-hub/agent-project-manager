/**
 * ~/.apm/config.json 读写
 *
 * 结构：
 * {
 *   currentProfile: 'default',
 *   profiles: {
 *     default: {
 *       backend: 'http://localhost:4300',
 *       workspaceId?: 'ws-...',
 *       accessToken?: '<jwt>',
 *       session?: { id, expiresAt },
 *       user?: {...}
 *     }
 *   },
 *   runtime: { deviceId, runtimeId, deviceSecret, workspaceRoots },
 *   daemon: { pid?, runtimeSessionId?, runtimeSessionToken?, startedAt? }
 * }
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ProfileConfig {
  backend?: string;
  workspaceId?: string;
  accessToken?: string;
  session?: { id: string; expiresAt: string } | null;
  user?: Record<string, unknown> | null;
}

export interface RuntimeConfig {
  deviceId?: string;
  runtimeId?: string;
  deviceSecret?: string;
  workspaceRoots?: string[];
}

export interface DaemonConfig {
  pid?: number;
  runtimeSessionId?: string;
  runtimeSessionToken?: string;
  startedAt?: string;
}

export interface ApmConfig {
  currentProfile?: string;
  profiles: Record<string, ProfileConfig>;
  runtime?: RuntimeConfig;
  daemon?: DaemonConfig;
}

const DEFAULT_PROFILE = 'default';

export function getConfigPath(): string {
  return (
    process.env.APM_CONFIG_PATH ||
    path.join(os.homedir(), '.apm', 'config.json')
  );
}

export function readConfig(): ApmConfig {
  const file = getConfigPath();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ApmConfig>;
    return {
      currentProfile: DEFAULT_PROFILE,
      ...parsed,
      profiles: parsed.profiles ?? {},
    };
  } catch {
    return { currentProfile: DEFAULT_PROFILE, profiles: {} };
  }
}

export function writeConfig(config: ApmConfig): void {
  const file = getConfigPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getActiveProfileName(config: ApmConfig): string {
  return config.currentProfile || DEFAULT_PROFILE;
}

/** 取（必要时创建）指定 profile 的配置片段 */
export function getProfile(
  config: ApmConfig,
  profileName?: string,
): ProfileConfig {
  const name = profileName || getActiveProfileName(config);
  if (!config.profiles[name]) {
    config.profiles[name] = {};
  }
  return config.profiles[name];
}

/** 在 active profile 上设置单个键并落盘 */
export function setProfileValue(
  key: keyof ProfileConfig,
  value: unknown,
  profileName?: string,
): ApmConfig {
  const config = readConfig();
  const profile = getProfile(config, profileName);
  (profile as Record<string, unknown>)[key] = value;
  writeConfig(config);
  return config;
}

export function getBackend(config: ApmConfig, override?: string): string | undefined {
  return override || getProfile(config).backend;
}

export function clearToken(config: ApmConfig, profileName?: string): ApmConfig {
  const profile = getProfile(config, profileName);
  delete profile.accessToken;
  delete profile.session;
  delete profile.user;
  writeConfig(config);
  return config;
}

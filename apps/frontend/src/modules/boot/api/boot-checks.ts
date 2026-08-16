import { api, getApiBaseUrl } from '@/infrastructure/api-client';
import { authApi } from '@/modules/auth/api/auth-api';
import { configApi } from '@/modules/config/api/config-api';
import { eventClient } from '@/infrastructure/event-client';
import {
  invoke,
  isTauriAvailable,
  setApiBaseUrl,
} from '@/shared/types/electron-api';
import type { DesktopAppInfo } from '@/shared/types/electron-api';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { BootCheck, BootContext } from '../types';

const TOKEN_STORAGE_KEY = 'access_token';

function getWsBaseUrl(): string {
  return getApiBaseUrl().replace(/^http/, 'ws');
}

export function buildBootContext(signal: AbortSignal): BootContext {
  return {
    isTauri: isTauriAvailable(),
    hasToken: typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_STORAGE_KEY),
    apiBaseUrl: getApiBaseUrl(),
    signal,
  };
}

async function measure<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

export const bootChecks: BootCheck[] = [
  {
    id: 'detect-runtime',
    title: '检测运行环境',
    description: '读取 navigator / Tauri 标志判断当前运行环境',
    run: async () => {
      const isTauri = isTauriAvailable();
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      const ua = nav?.userAgent ?? 'unknown';
      const platform = nav?.platform ?? 'unknown';
      const screen = typeof window !== 'undefined'
        ? `${window.innerWidth}x${window.innerHeight}`
        : 'n/a';

      let engine = 'unknown';
      if (/Edg\//.test(ua)) engine = 'Edge';
      else if (/Chrome\//.test(ua)) engine = 'Chrome';
      else if (/Firefox\//.test(ua)) engine = 'Firefox';
      else if (/Safari\//.test(ua)) engine = 'Safari';

      const mode = isTauri ? 'Tauri 桌面' : `Web · ${engine}`;
      const detail = `${mode} · ${platform} · ${screen}`;
      return { status: 'success', detail };
    },
  },
  {
    id: 'fetch-app-info',
    title: '读取应用信息',
    description: '从 Tauri 主机加载应用版本与数据路径（仅桌面）',
    skipIf: (ctx) => !ctx.isTauri,
    run: async () => {
      const { result: info, ms } = await measure(() =>
        invoke<DesktopAppInfo>('get_app_info'),
      );
      if (info.apiBaseUrl) {
        setApiBaseUrl(info.apiBaseUrl);
      }
      return {
        status: 'success',
        detail: `v${info.version} · ${info.os} · ${ms}ms`,
      };
    },
  },
  {
    id: 'load-backend',
    title: '连接后端服务',
    description: '桌面端拉起本地后端，浏览器端探测 /health 端点',
    async run(ctx) {
      if (ctx.isTauri) {
        const status = await invoke<{
          running: boolean;
          info?: { port: number; apiBaseUrl: string };
        }>('get_backend_status');
        if (!status.running) {
          const info = await invoke<{ port: number; apiBaseUrl: string }>('start_backend');
          setApiBaseUrl(info.apiBaseUrl);
          return {
            status: 'success',
            detail: `本地端口 ${info.port} · ${info.apiBaseUrl}`,
          };
        }
        if (status.info?.apiBaseUrl) {
          setApiBaseUrl(status.info.apiBaseUrl);
        }
        return {
          status: 'success',
          detail: `端口 ${status.info?.port ?? '未知'}`,
        };
      }

      // Browser mode: ping the dedicated health endpoint
      const { ms } = await measure(async () => {
        await api.get('/health', undefined, { signal: ctx.signal });
      });
      return { status: 'success', detail: `${ctx.apiBaseUrl}/health · ${ms}ms` };
    },
  },
  {
    id: 'load-preferences',
    title: '加载本地偏好',
    description: '从持久化存储恢复界面偏好与上次会话状态',
    run: async () => {
      const { result: rehydrated, ms } = await measure(async () => {
        // Force a real rehydrate so we observe the timing
        const persistApi = useAppStore.persist;
        if (typeof persistApi?.rehydrate === 'function') {
          await persistApi.rehydrate();
        }
        const state = useAppStore.getState();
        const persisted = persistApi.getOptions();
        const partialKeys = persisted.partialize
          ? Object.keys((persisted.partialize as (s: typeof state) => Record<string, unknown>)(state))
          : [];
        const present = partialKeys.filter((k) => {
          const v = (state as unknown as Record<string, unknown>)[k];
          return v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0);
        });
        return present;
      });
      return {
        status: 'success',
        detail: `${rehydrated.length} 项已恢复 · ${ms}ms`,
      };
    },
  },
  {
    id: 'probe-auth',
    title: '校验登录缓存',
    description: '若本地存在 access_token 则调用 /auth/me 验证',
    skipIf: (ctx) => !ctx.hasToken,
    run: async () => {
      const { result, ms } = await measure(() => authApi.getCurrentUser());
      const user = result?.user;
      if (user) {
        useAppStore.getState().setCurrentUser(user);
      }
      return {
        status: 'success',
        detail: user
          ? `${user.displayName} · ${user.username} · ${ms}ms`
          : `已登录 · ${ms}ms`,
      };
    },
  },
  {
    id: 'connect-ws',
    title: '建立实时通道',
    description: '打开 WebSocket 与后端 /events 网关握手',
    skipIf: (ctx) => !ctx.hasToken,
    async run(ctx) {
      const wsUrl = getWsBaseUrl();
      const alreadyConnected = eventClient.isConnected();
      // 把 ctx 中的 isTauri 信息嵌入 detail，方便桌面模式用户看到
      void ctx.isTauri;
      if (!alreadyConnected) {
        const { result, ms } = await measure(
          () =>
            new Promise<{ connected: true }>((resolve, reject) => {
              let settled = false;
              const onConnect = () => {
                if (settled) return;
                settled = true;
                eventClient.off('error', onError);
                resolve({ connected: true });
              };
              const onError = (err: unknown) => {
                if (settled) return;
                settled = true;
                eventClient.off('connected', onConnect);
                reject(err instanceof Error ? err : new Error(String(err)));
              };
              eventClient.on('connected', onConnect);
              eventClient.on('error', onError);
              eventClient.connect(wsUrl);

              // 兜底超时：8s 内未连接视为失败
              setTimeout(() => {
                if (settled) return;
                settled = true;
                eventClient.off('connected', onConnect);
                eventClient.off('error', onError);
                reject(new Error('WebSocket 在 8s 内未连接'));
              }, 8000);
            }),
        );
        return {
          status: 'success',
          detail: result.connected ? `${wsUrl}/events · ${ms}ms` : 'connected',
        };
      }
      return { status: 'success', detail: `复用已有连接 · ${wsUrl}/events` };
    },
  },
  {
    id: 'prime-cache',
    title: '预热全局配置',
    description: '调用 GET /config?scope=global 填充配置缓存',
    skipIf: (ctx) => !ctx.hasToken,
    run: async (ctx) => {
      const { result, ms } = await measure(() =>
        configApi.getConfig({ scope: 'global' }),
      );
      const keyCount = result ? Object.keys(result).length : 0;
      const tauriFlag = ctx.isTauri ? 'tauri' : 'web';
      return { status: 'success', detail: `${keyCount} 项 · ${ms}ms · ${tauriFlag}` };
    },
  },
];
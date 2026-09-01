/**
 * 守护进程生命周期：register → capabilities → WS → 心跳 → 轮询兜底 → 派发执行
 */
import * as os from 'os';
import { io } from 'socket.io-client';
import {
  ApmClient,
  getBackend,
  HEARTBEAT_INTERVAL_SECONDS,
  POLL_INTERVAL_MS,
  readConfig,
  RuntimeCapabilitiesPayload,
  RuntimeDispatch,
  RuntimeHeartbeatPayload,
  RuntimeRegisterPayload,
  RuntimeRegistrationResult,
  RUNTIME_ENDPOINTS,
  WS_EVENTS,
  WS_NAMESPACE,
  writeConfig,
} from '@apm/shared';
import { startWorker } from './worker';

const RUNTIME_VERSION = '0.1.0';
const PROTOCOL_VERSION = '1.0.0';

function randomSuffix(len = 6): string {
  // eslint-disable-next-line no-magic-numbers
  return Math.random().toString(36).slice(2, 2 + len);
}

export async function runRuntimeDaemon(): Promise<void> {
  const config = readConfig();
  const backend = getBackend(config) || process.env.APM_BACKEND;
  if (!backend) {
    throw new Error('未配置后端地址：请先执行 apm config set backend <url>');
  }

  const hostname = os.hostname();
  if (!config.runtime) config.runtime = {};
  const runtimeId =
    config.runtime.runtimeId ?? `runtime-local-${hostname}-${randomSuffix()}`;
  const deviceId = config.runtime.deviceId ?? `device-${hostname}`;
  const workspaceRoots = config.runtime.workspaceRoots ?? [];
  // 设备密钥：标识本守护进程实例，随 register metadata 上报（Phase D 加固预留）
  const deviceSecret =
    config.runtime.deviceSecret ?? `ds_${randomSuffix(16)}`;
  config.runtime.runtimeId = runtimeId;
  config.runtime.deviceId = deviceId;
  config.runtime.deviceSecret = deviceSecret;
  writeConfig(config);

  // 1. register（Public，无需 session 头）
  const regClient = new ApmClient({ backend });
  const reg = await regClient.post<RuntimeRegistrationResult>(
    RUNTIME_ENDPOINTS.REGISTER,
    {
      runtimeId,
      deviceId,
      hostPlatform: process.platform,
      runtimeVersion: RUNTIME_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      workspaceRoots,
      availableProviders: ['file', 'git', 'terminal'],
      cliProviders: ['claude-code', 'codex', 'zcode'],
      metadata: { deviceSecret },
    } as RuntimeRegisterPayload,
  );

  const sessionId = reg.runtimeSessionId;
  const sessionToken = reg.runtimeSessionToken;
  const heartbeatMs =
    (reg.heartbeatIntervalSeconds ?? HEARTBEAT_INTERVAL_SECONDS) * 1000;

  // 持久化 session 供 apm daemon status 查看
  if (!config.daemon) config.daemon = {};
  config.daemon.runtimeSessionId = sessionId;
  config.daemon.runtimeSessionToken = sessionToken;
  config.daemon.startedAt = new Date().toISOString();
  writeConfig(config);

  // 带 runtime session 头的 API 客户端
  const api = new ApmClient({
    backend,
    extraHeaders: () => ({
      'x-runtime-session-id': sessionId,
      'x-runtime-session-token': sessionToken,
    }),
  });

  // 2. 上报 capabilities
  await api
    .put(RUNTIME_ENDPOINTS.capabilities(runtimeId), {
      workspaceRoots,
      providers: {
        file: true,
        git: true,
        terminal: true,
        process: true,
        credentials: false,
      },
      cliProviders: ['claude-code', 'codex', 'zcode'],
    } as RuntimeCapabilitiesPayload)
    .catch((e) => console.error('[capabilities]', e.message));

  const worker = startWorker(api, runtimeId);

  // 3. WS 连接（握手指纹：auth 带 session id/token）
  const socket = io(`${backend}${WS_NAMESPACE}`, {
    auth: { runtimeSessionId: sessionId, runtimeSessionToken: sessionToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 60000,
  });

  socket.on(WS_EVENTS.serverToRuntime.DISPATCH_CREATED, (payload: RuntimeDispatch) => {
    void worker.handleDispatch(payload);
  });
  socket.on(
    WS_EVENTS.serverToRuntime.EXECUTION_CANCELLED,
    (payload: { executionRunId?: string }) => {
      if (payload?.executionRunId) worker.cancel(payload.executionRunId);
    },
  );
  socket.on(WS_EVENTS.serverToRuntime.APPROVAL_RESOLVED, () => {
    // 后续：审批决议恢复挂起执行
  });

  // 4. 心跳（REST 为可信路径；WS 心跳作伴）
  const heartbeat = () => {
    api
      .post(RUNTIME_ENDPOINTS.heartbeat(runtimeId), {
        runtimeSessionId: sessionId,
        status: 'online',
      } as RuntimeHeartbeatPayload)
      .catch(() => {});
    socket.emit(WS_EVENTS.runtimeToServer.HEARTBEAT, {
      runtimeSessionId: sessionId,
      status: 'online',
    });
  };
  setInterval(heartbeat, heartbeatMs);

  // 5. 轮询兜底（防 WS 断线丢派发；按 executionRunId 在 worker 内去重）
  setInterval(() => {
    api
      .get<RuntimeDispatch[]>(RUNTIME_ENDPOINTS.dispatches(runtimeId), {
        status: 'pending',
        limit: 20,
      })
      .then((dispatches) => {
        for (const d of dispatches) void worker.handleDispatch(d);
      })
      .catch(() => {});
  }, POLL_INTERVAL_MS);

  console.log(
    `[apm-runtime] 已启动：runtime=${runtimeId} session=${sessionId} ws=${WS_NAMESPACE} backend=${backend}`,
  );

  const shutdown = () => {
    console.log('[apm-runtime] 正在关闭...');
    socket.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

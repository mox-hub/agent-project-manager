/**
 * 工作区作用域自愈回归测试（实机 bug：「登录之后会自动弹出到登录页面」）。
 *
 * 事实链（对真实后端实测）：服务端按 `x-workspace-id` 把数据访问路由到对应工作区
 * SQLite 库，而身份/会话（User/Session）在各库中独立：
 *   无头 → 200 ；default → 200 ；有效但非本会话的工作区 → 401 ；未注册工作区 → 404。
 * 于是「带 id 被拒、不带 id 正常」这一形态会形成死循环——401 → 清登录态 → /login →
 * 登录请求仍带该 id → 401（正确密码也报 Invalid credentials）→ 重登无效。
 * 拦截器的职责：识别该形态，丢弃失效选择并按原请求重放，不把用户推去登录页。
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError as AxiosErrorCtor, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, consumeWorkspaceReset } from './index';

interface AdapterCall {
  method: string;
  url: string;
  workspaceId: string | null;
}

const calls: AdapterCall[] = [];

function headerOf(config: InternalAxiosRequestConfig, name: string): string | null {
  const headers = config.headers as AxiosHeaders;
  const value = headers?.get?.(name) ?? (config.headers as Record<string, unknown>)[name];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** 应答工厂：2xx 直接返回，非 2xx 抛 AxiosError（等价 axios settle 行为） */
function reply(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): AxiosResponse {
  const response = {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  } as AxiosResponse;
  if (status >= 200 && status < 300) {
    return response;
  }
  throw new AxiosErrorCtor(
    `Request failed with status code ${status}`,
    String(status),
    config,
    null,
    response,
  );
}

function envelope(status: number, description: string, code?: string) {
  return {
    status,
    success: status < 400,
    description,
    data: status < 400 ? { ok: true } : null,
    error: code ? { code, message: description } : undefined,
  };
}

/** 装一套「按 x-workspace-id 判定」的假后端：无头放行，带头一律按 failWith 拒绝 */
function installAdapter(failWith: { status: number; code?: string; description?: string }) {
  const adapter: AxiosAdapter = async (config) => {
    const workspaceId = headerOf(config, 'x-workspace-id');
    calls.push({
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url ?? '',
      workspaceId,
    });
    if (workspaceId) {
      return reply(
        config,
        failWith.status,
        envelope(
          failWith.status,
          failWith.description ?? '工作区不存在或未注册',
          failWith.code,
        ),
      );
    }
    return reply(config, 200, envelope(200, '操作成功'));
  };
  apiClient.defaults.adapter = adapter;
}

function installMemoryStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

describe('api-client 工作区作用域自愈', () => {
  let store: Map<string, string>;
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    calls.length = 0;
    store = installMemoryStorage();
    store.set('access_token', 'jwt-valid');
    store.set('apm-workspace-id', 'ws-foreign');
    consumeWorkspaceReset();
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
  });

  it('会话校验遇「本库无此主体」的 401：丢弃失效选择并重放，登录态保留', async () => {
    installAdapter({ status: 401, code: 'UNAUTHORIZED', description: 'User not found or inactive' });

    const me = await apiClient.get('/auth/me');

    expect(me.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ url: '/auth/me', workspaceId: 'ws-foreign' });
    expect(calls[1]).toMatchObject({ url: '/auth/me', workspaceId: null });
    // 选择被丢弃（含 localStorage），且登录态**未**被清
    expect(store.has('apm-workspace-id')).toBe(false);
    expect(store.get('access_token')).toBe('jwt-valid');
    expect(consumeWorkspaceReset()).toEqual({ workspaceId: 'ws-foreign' });
    expect(consumeWorkspaceReset()).toBeNull();
  });

  it('登录接口受阻（正确密码被判 Invalid credentials）也能自愈——死循环的破点', async () => {
    installAdapter({ status: 401, code: 'INVALID_CREDENTIALS', description: 'Invalid credentials' });

    const login = await apiClient.post('/auth/login', { username: 'u', password: 'p' });

    expect(login.status).toBe(200);
    expect(calls.map((c) => c.workspaceId)).toEqual(['ws-foreign', null]);
    expect(store.has('apm-workspace-id')).toBe(false);
    expect(consumeWorkspaceReset()).toEqual({ workspaceId: 'ws-foreign' });
  });

  it('未注册工作区的 404：确定失效，丢弃选择并重放（业务请求同样受益）', async () => {
    installAdapter({ status: 404, code: 'WORKSPACE_NOT_FOUND' });

    const issues = await apiClient.get('/issues');

    expect(issues.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(store.has('apm-workspace-id')).toBe(false);
  });

  it('会话真失效（去掉作用域仍 401）：保留选择、清登录态、不误报工作区重置', async () => {
    // 无头也拒绝 = token 本身失效，与工作区选择无关
    apiClient.defaults.adapter = async (config) => {
      calls.push({
        method: (config.method ?? 'get').toUpperCase(),
        url: config.url ?? '',
        workspaceId: headerOf(config, 'x-workspace-id'),
      });
      return reply(config, 401, envelope(401, '未登录', 'UNAUTHORIZED'));
    };

    await expect(apiClient.get('/issues')).rejects.toMatchObject({ status: 401 });

    expect(calls).toHaveLength(2); // 重放一次即止，无递归
    expect(store.get('apm-workspace-id')).toBe('ws-foreign'); // 选择不被误丢
    expect(store.has('access_token')).toBe(false); // 真失效才清
    expect(consumeWorkspaceReset()).toBeNull(); // 不发「已重置」提示
  });

  it('未注册工作区重放仍失败：选择照样丢弃（确定事实），错误码原样上抛', async () => {
    apiClient.defaults.adapter = async (config) => {
      calls.push({
        method: (config.method ?? 'get').toUpperCase(),
        url: config.url ?? '',
        workspaceId: headerOf(config, 'x-workspace-id'),
      });
      return reply(config, 404, envelope(404, '工作区不存在或未注册', 'WORKSPACE_NOT_FOUND'));
    };

    await expect(apiClient.get('/issues')).rejects.toMatchObject({
      code: 'WORKSPACE_NOT_FOUND',
      status: 404,
    });

    expect(store.has('apm-workspace-id')).toBe(false);
    expect(store.get('access_token')).toBe('jwt-valid'); // 404 与登录态无关，不清
  });

  it('无工作区选择时不重放（不产生多余往返）', async () => {
    store.delete('apm-workspace-id');
    apiClient.defaults.adapter = async (config) => {
      calls.push({
        method: (config.method ?? 'get').toUpperCase(),
        url: config.url ?? '',
        workspaceId: headerOf(config, 'x-workspace-id'),
      });
      return reply(config, 401, envelope(401, '未登录', 'UNAUTHORIZED'));
    };

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({ status: 401 });

    expect(calls).toHaveLength(1);
  });

  it('邀请端点默认不带工作区头（令牌自身即指向目标工作区），普通业务请求仍带', async () => {
    installAdapter({
      status: 401,
      code: 'UNAUTHORIZED',
      description: 'User not found or inactive',
    });

    await apiClient.get('/invites/tok');

    // 不带 id ⇒ 假后端放行；接受邀请正是要在「用户自己账号所在的库」校验登录态，
    // 带上选中的工作区头会在守卫处先被 401 拦掉（CAP-A-25 ④ 的落地前提）。
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ url: '/invites/tok', workspaceId: null });
    // 未触发自愈：工作区选择与登录态都不该被动
    expect(store.get('apm-workspace-id')).toBe('ws-foreign');
    expect(consumeWorkspaceReset()).toBeNull();

    // 对照：普通业务请求照旧带 id（证明上例是前缀特例，不是全局失效）
    calls.length = 0;
    await apiClient.get('/issues');
    expect(calls[0]).toMatchObject({ url: '/issues', workspaceId: 'ws-foreign' });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/shared/types/api';

/**
 * P1-6「测试连接」修复的单测：
 * 1. testProvider 请求必须放宽到 60s（全局默认 30s 会先于后端 ~38s 验证链路超时，
 *    吞掉后端拼好的结构化诊断）；
 * 2. 错误文案解析：前端超时/断网用 i18n 键（禁英文 axios 默认文案），
 *    后端结构化错误透传完整 message。
 */

// mock 掉 axios 封装层：既能拦截 testProvider 的请求参数，
// 又避免测试环境构造真实 axios 实例
const postMock = vi.fn();
vi.mock('@/infrastructure/api-client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

// vi.mock 会被 vitest 提升到 import 之前执行，import 顺序无需人工干预
import { aiHubApi } from '../api/ai-hub-api';
import { resolveTestConnectionErrorMessage } from './use-ai-providers';

/** stub 翻译函数：直接返回 key，断言「用了哪个 i18n 键」 */
const t = (key: string) => key;

const backendDiagnostics =
  '供应商验证失败：chat completions 探测 401（无效 API Key），models 查询超时（8s）';

describe('aiHubApi.testProvider 超时窗口', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ valid: true });
  });

  it('请求 /ai/providers/:id/test 时携带 timeoutMs=60000（仅该请求放宽，非全局默认）', async () => {
    await aiHubApi.testProvider('prov-1');

    expect(postMock).toHaveBeenCalledTimes(1);
    const [url, data, options] = postMock.mock.calls[0] as [
      string,
      unknown,
      { timeoutMs?: number },
    ];
    expect(url).toBe('/ai/providers/prov-1/test');
    expect(data).toBeUndefined();
    expect(options?.timeoutMs).toBe(60_000);
  });
});

describe('resolveTestConnectionErrorMessage 错误分支', () => {
  it('前端超时（TIMEOUT）：用 i18n 超时文案键，不透传英文 axios 默认文案', () => {
    // 模拟拦截器对 axios 超时（ECONNABORTED）分类后的错误
    const err = new ApiClientError({
      code: 'TIMEOUT',
      message: 'timeout of 60000ms exceeded',
      status: 0,
    });

    expect(resolveTestConnectionErrorMessage(err, t)).toBe(
      'aiHub.testConnectionTimeout',
    );
  });

  it('网络断开（NETWORK_ERROR）：不用英文 "Network Error"，回落 i18n 连接失败键', () => {
    const err = new ApiClientError({
      code: 'NETWORK_ERROR',
      message: 'Network Error',
      status: 0,
    });

    expect(resolveTestConnectionErrorMessage(err, t)).toBe(
      'aiHub.connectionFailed',
    );
  });

  it('后端结构化错误（错误信封抛出的 ApiClientError）：完整透传 message，保留后端诊断', () => {
    const err = new ApiClientError({
      code: 'HTTP_502',
      message: backendDiagnostics,
      status: 502,
    });

    expect(resolveTestConnectionErrorMessage(err, t)).toBe(backendDiagnostics);
  });

  it('普通 Error 有 message：同样透传（兼容非信封错误路径）', () => {
    const err = new Error('请求失败：上游 429 限流');

    expect(resolveTestConnectionErrorMessage(err, t)).toBe(
      '请求失败：上游 429 限流',
    );
  });

  it('Error 但 message 为空：回落 i18n 连接失败键', () => {
    const err = new Error('');

    expect(resolveTestConnectionErrorMessage(err, t)).toBe(
      'aiHub.connectionFailed',
    );
  });

  it('非 Error 值（null / 字符串）：回落 i18n 连接失败键，不抛错', () => {
    expect(resolveTestConnectionErrorMessage(null, t)).toBe(
      'aiHub.connectionFailed',
    );
    expect(resolveTestConnectionErrorMessage('boom', t)).toBe(
      'aiHub.connectionFailed',
    );
  });
});

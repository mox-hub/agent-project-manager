/**
 * boot 检查 · WS 基址构造测试（GAP-T-20 附属回归）。
 * 回归背景：getApiBaseUrl 恒带 REST 全局前缀 /_api，直接换协议会把 socket.io
 * 命名空间拼成 /_api/events（服务端只注册 /events）→ connect_error "Invalid
 * namespace"，桌面模式 /boot 的「建立实时通道」检查项始终失败（实机冒烟抓漏）。
 */
import { describe, expect, it, vi } from 'vitest';

const electronApiBaseUrl = vi.hoisted(() => ({ value: null as string | null }));

vi.mock('@/infrastructure/api-client', () => ({
  getApiBaseUrl: () => electronApiBaseUrl.value ?? '/_api',
}));

const { getWsBaseUrl } = await import('./boot-checks');

describe('getWsBaseUrl（实时通道基址）', () => {
  it('桌面模式：剥掉 /_api 后缀再换 ws 协议（命名空间必须是 /events）', () => {
    electronApiBaseUrl.value = 'http://127.0.0.1:4302/_api';
    expect(getWsBaseUrl()).toBe('ws://127.0.0.1:4302');
  });

  it('web 模式：相对基线 /_api 剥为空串，connect 退化为同源 /events', () => {
    electronApiBaseUrl.value = null;
    expect(getWsBaseUrl()).toBe('');
  });
});

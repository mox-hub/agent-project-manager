import { describe, expect, it, vi, beforeEach } from 'vitest';

import { persistWorkspaceToShell } from '@/shared/lib/desktop-session';
import {
  WORKSPACE_STORAGE_KEY,
  RECENT_WORKSPACES_KEY,
  getCurrentWorkspaceId,
  getRecentWorkspaces,
  recordRecentWorkspace,
  setWorkspaceSelection,
} from './workspace-api';

// api 客户端仅为模块内其它导出服务；选择原语用不到，桩掉避免拉入拦截器链
vi.mock('@/infrastructure/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('@/shared/lib/desktop-session', () => ({
  persistWorkspaceToShell: vi.fn(),
}));

/** localStorage 在 setup.ts 里是空 vi.fn() 桩，按 key 给出返回值 */
function primeStorage(map: Record<string, string | null>) {
  vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
    key in map ? map[key] : null,
  );
}

const setItemCalls = () => vi.mocked(localStorage.setItem).mock.calls;
const lastWrittenJson = (key: string) => {
  const call = setItemCalls().find((c) => c[0] === key);
  return call ? JSON.parse(call[1]) : undefined;
};

beforeEach(() => {
  vi.mocked(localStorage.getItem).mockReset();
  vi.mocked(localStorage.setItem).mockReset();
  vi.mocked(localStorage.removeItem).mockReset();
  vi.mocked(persistWorkspaceToShell).mockReset();
  primeStorage({});
});

describe('工作区选择原语（CAP-A-26 ③：登录请求据本地选择注入 x-workspace-id）', () => {
  it('getCurrentWorkspaceId：未设置时回落 default', () => {
    expect(getCurrentWorkspaceId()).toBe('default');
  });

  it('getCurrentWorkspaceId：已设置时回显本机选择', () => {
    primeStorage({ [WORKSPACE_STORAGE_KEY]: 'ws-a' });
    expect(getCurrentWorkspaceId()).toBe('ws-a');
  });

  it('setWorkspaceSelection 选定非默认工作区：写本地存储并镜像到壳（带 id）', () => {
    setWorkspaceSelection('ws-a');

    expect(localStorage.setItem).toHaveBeenCalledWith(WORKSPACE_STORAGE_KEY, 'ws-a');
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(persistWorkspaceToShell).toHaveBeenCalledWith('ws-a');
  });

  it('setWorkspaceSelection 选回默认工作区：清除本地键并镜像 null', () => {
    setWorkspaceSelection('default');

    expect(localStorage.removeItem).toHaveBeenCalledWith(WORKSPACE_STORAGE_KEY);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(persistWorkspaceToShell).toHaveBeenCalledWith(null);
  });

  it('setWorkspaceSelection 带 name 时记入本机最近列表', () => {
    setWorkspaceSelection('ws-a', 'A 空间');
    expect(lastWrittenJson(RECENT_WORKSPACES_KEY)).toEqual([
      { id: 'ws-a', name: 'A 空间' },
    ]);
  });
});

describe('本机最近工作区（CAP-A-26 ④：公开名单关闭时的回落项）', () => {
  it('recordRecentWorkspace：最近在前、同 id 去重', () => {
    primeStorage({
      [RECENT_WORKSPACES_KEY]: JSON.stringify([
        { id: 'ws-b', name: 'B' },
        { id: 'ws-a', name: 'A' },
      ]),
    });

    recordRecentWorkspace({ id: 'ws-a', name: 'A 改名' });

    expect(lastWrittenJson(RECENT_WORKSPACES_KEY)).toEqual([
      { id: 'ws-a', name: 'A 改名' },
      { id: 'ws-b', name: 'B' },
    ]);
  });

  it('recordRecentWorkspace：封顶 6 条（超出时丢弃最旧）', () => {
    primeStorage({
      [RECENT_WORKSPACES_KEY]: JSON.stringify(
        Array.from({ length: 6 }, (_, i) => ({ id: `ws-${i}`, name: `W${i}` })),
      ),
    });

    recordRecentWorkspace({ id: 'ws-new', name: 'New' });

    const written = lastWrittenJson(RECENT_WORKSPACES_KEY);
    expect(written).toHaveLength(6);
    expect(written[0].id).toBe('ws-new');
    expect(written.map((w: { id: string }) => w.id)).not.toContain('ws-5');
  });

  it('getRecentWorkspaces：损坏 JSON 静默回落空数组', () => {
    primeStorage({ [RECENT_WORKSPACES_KEY]: '{not json' });
    expect(getRecentWorkspaces()).toEqual([]);
  });

  it('getRecentWorkspaces：过滤掉形状不合法的条目', () => {
    primeStorage({
      [RECENT_WORKSPACES_KEY]: JSON.stringify([
        { id: 'ok', name: 'OK' },
        { id: 1, name: 'bad id' },
        { name: 'missing id' },
      ]),
    });
    expect(getRecentWorkspaces()).toEqual([{ id: 'ok', name: 'OK' }]);
  });
});

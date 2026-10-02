/**
 * 公开工作区名单端点单测（CAP-A-26 / GAP-T-58 ①②）。
 *
 * 直接实例化控制器（不装配 Nest），只桩掉备份服务与开关服务；工作区名单来自
 * 一次性临时注册表文件（绝不触碰仓库根 workspaces.json）。
 *
 * 断言两条硬边界：
 *  - **脱敏红线**：响应体（含默认工作区与自定义工作区）绝不含 `path`，序列化后不得出现注册表里的库路径；
 *  - **开关语义**：关（默认）→ `enabled:false` + 空名单；开 → 返回名单；写入按 admin 语义留痕。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { WorkspaceController } from './workspace.controller';
import type { WorkspaceBackupService } from './backup.service';
import type { WorkspacePublicSettingsService } from './public-settings.service';
import { DEFAULT_WORKSPACE_ID } from '@/core/database/workspace-registry.util';

const CUSTOM_PATH = 'C:/tmp/apm-public-alpha';

interface SettingsStub {
  isPublicListEnabled: ReturnType<typeof vi.fn>;
  setPublicListEnabled: ReturnType<typeof vi.fn>;
}

function makeController(settings: SettingsStub): WorkspaceController {
  return new WorkspaceController(
    {} as unknown as WorkspaceBackupService,
    settings as unknown as WorkspacePublicSettingsService,
  );
}

function makeSettingsStub(): SettingsStub {
  return {
    isPublicListEnabled: vi.fn().mockResolvedValue(false),
    setPublicListEnabled: vi.fn(async (enabled: boolean) => enabled),
  };
}

describe('WorkspaceController 公开名单端点（CAP-A-26）', () => {
  let tmpRoot: string;
  const prevRegistry = process.env.WORKSPACE_REGISTRY_PATH;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-public-ws-'));
    const registry = path.join(tmpRoot, 'workspaces.json');
    fs.writeFileSync(
      registry,
      JSON.stringify([
        {
          id: 'ws-alpha',
          name: 'Alpha',
          path: CUSTOM_PATH,
          createdAt: new Date().toISOString(),
        },
      ]),
      'utf-8',
    );
    process.env.WORKSPACE_REGISTRY_PATH = registry;
  });

  afterAll(() => {
    if (prevRegistry === undefined) {
      delete process.env.WORKSPACE_REGISTRY_PATH;
    } else {
      process.env.WORKSPACE_REGISTRY_PATH = prevRegistry;
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('开关关闭（默认）：返回 enabled:false 与空名单，不泄露任何工作区信息', async () => {
    const settings = makeSettingsStub();
    settings.isPublicListEnabled.mockResolvedValue(false);

    const result = await makeController(settings).publicList();

    expect(result).toEqual({ enabled: false, workspaces: [] });
    expect(JSON.stringify(result)).not.toContain('Alpha');
    expect(JSON.stringify(result)).not.toContain(CUSTOM_PATH);
  });

  it('开关开启：返回脱敏名单（含默认工作区），绝不带 path（脱敏红线）', async () => {
    const settings = makeSettingsStub();
    settings.isPublicListEnabled.mockResolvedValue(true);

    const result = await makeController(settings).publicList();

    expect(result.enabled).toBe(true);

    // 默认工作区在列（listWorkspaces 始终补默认）
    const defaultEntry = result.workspaces.find(
      (w) => w.id === DEFAULT_WORKSPACE_ID,
    );
    expect(defaultEntry).toMatchObject({ isDefault: true });

    // 自定义工作区在列，但只透 id/name/isDefault
    const custom = result.workspaces.find((w) => w.id === 'ws-alpha');
    expect(custom).toBeDefined();
    expect(custom).toMatchObject({ id: 'ws-alpha', name: 'Alpha' });

    // 脱敏红线：任何条目都不含 path 字段，序列化后不出现库路径
    expect(result.workspaces.every((w) => !('path' in w))).toBe(true);
    expect(JSON.stringify(result)).not.toContain(CUSTOM_PATH);
  });

  it('写入端点：转发开关值与 admin actorId，并回显开启后的名单', async () => {
    const settings = makeSettingsStub();

    const result = await makeController(settings).setPublicList(
      { enabled: true },
      { user: { userId: 'admin-1' } },
    );

    expect(settings.setPublicListEnabled).toHaveBeenCalledWith(true, 'admin-1');
    expect(result.enabled).toBe(true);
    expect(JSON.stringify(result)).not.toContain(CUSTOM_PATH);

    // 关闭时回显空名单
    const off = await makeController(settings).setPublicList(
      { enabled: false },
      { user: { id: 'admin-2' } },
    );
    expect(settings.setPublicListEnabled).toHaveBeenCalledWith(
      false,
      'admin-2',
    );
    expect(off).toEqual({ enabled: false, workspaces: [] });
  });
});

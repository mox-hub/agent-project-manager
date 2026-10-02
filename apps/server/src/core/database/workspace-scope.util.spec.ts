import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  DEFAULT_WORKSPACE_ID,
  createWorkspace,
} from './workspace-registry.util';
import { getCurrentWorkspaceId } from './workspace-context';
import {
  findFirstAcrossWorkspaces,
  runInWorkspace,
  scannableWorkspaceIds,
} from './workspace-scope.util';

/**
 * 跨工作区执行原语回归（CAP-A-25 的基建）。
 * 重点是**上下文确实切换了、退出后确实恢复了**——这是「邀请即建」能写进目标库的前提。
 */
describe('workspace-scope.util', () => {
  let tmpRoot: string;
  let wsId: string;
  let previousRegistry: string | undefined;
  let previousTemplate: string | undefined;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-scope-test-'));
    previousRegistry = process.env.WORKSPACE_REGISTRY_PATH;
    previousTemplate = process.env.WORKSPACE_TEMPLATE_PATH;
    process.env.WORKSPACE_REGISTRY_PATH = path.join(tmpRoot, 'workspaces.json');
    process.env.WORKSPACE_TEMPLATE_PATH = path.resolve(
      process.cwd(),
      'prisma/template.db',
    );
    wsId = createWorkspace({
      name: 'scope-ws',
      path: path.join(tmpRoot, 'ws-a'),
    }).id;
  });

  afterAll(() => {
    if (previousRegistry === undefined)
      delete process.env.WORKSPACE_REGISTRY_PATH;
    else process.env.WORKSPACE_REGISTRY_PATH = previousRegistry;
    if (previousTemplate === undefined)
      delete process.env.WORKSPACE_TEMPLATE_PATH;
    else process.env.WORKSPACE_TEMPLATE_PATH = previousTemplate;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('runInWorkspace 期间当前工作区=目标库，退出后恢复调用方上下文并透传返回值', async () => {
    expect(getCurrentWorkspaceId()).toBeNull();

    const seen: Array<string | null> = [];
    const result = await runInWorkspace(wsId, async () => {
      seen.push(getCurrentWorkspaceId());
      return 42;
    });

    expect(result).toBe(42);
    expect(seen).toEqual([wsId]);
    expect(getCurrentWorkspaceId()).toBeNull();
  });

  it('runInWorkspace 可嵌套，内层不改动外层上下文', async () => {
    await runInWorkspace(wsId, async () => {
      await runInWorkspace(null, async () => {
        expect(getCurrentWorkspaceId()).toBeNull();
      });
      expect(getCurrentWorkspaceId()).toBe(wsId);
    });
  });

  it('scannableWorkspaceIds 恒含 default 且列在首位，只纳入库文件存在的工作区', () => {
    const ids = scannableWorkspaceIds();
    expect(ids[0]).toBe(DEFAULT_WORKSPACE_ID);
    expect(ids).toContain(wsId);
  });

  it('库文件缺失（未初始化/已删除）的工作区不参与扫描', () => {
    const dir = path.join(tmpRoot, 'ws-broken');
    const broken = createWorkspace({ name: 'broken', path: dir });
    fs.rmSync(path.join(dir, 'data', 'apm.db'), { force: true });

    expect(scannableWorkspaceIds()).not.toContain(broken.id);
  });

  it('findFirstAcrossWorkspaces 逐库查找并带回命中库 id；全未命中返回 null', async () => {
    const visited: Array<string | null> = [];
    const hit = await findFirstAcrossWorkspaces(async () => {
      visited.push(getCurrentWorkspaceId());
      return getCurrentWorkspaceId() === wsId ? { token: 'tok' } : null;
    });

    // default 在前、目标库在后；顺序即「先查最可能的家」
    expect(visited).toEqual([DEFAULT_WORKSPACE_ID, wsId]);
    expect(hit).toEqual({ workspaceId: wsId, value: { token: 'tok' } });

    const miss = await findFirstAcrossWorkspaces(async () => null);
    expect(miss).toBeNull();
  });
});

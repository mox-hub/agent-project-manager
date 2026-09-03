import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  DEFAULT_WORKSPACE_ID,
  WorkspaceCreateError,
  activateWorkspace,
  createWorkspace,
  findWorkspace,
  listWorkspaces,
  resolveWorkspaceDbUrl,
} from './workspace-registry.util';

describe('workspace-registry.util', () => {
  let tmpRoot: string;
  let previousRegistry: string | undefined;
  let previousTemplate: string | undefined;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-ws-test-'));
    previousRegistry = process.env.WORKSPACE_REGISTRY_PATH;
    previousTemplate = process.env.WORKSPACE_TEMPLATE_PATH;
    process.env.WORKSPACE_REGISTRY_PATH = path.join(tmpRoot, 'workspaces.json');
    // 复用仓库模板库（build:template-db 产物）
    process.env.WORKSPACE_TEMPLATE_PATH = path.resolve(
      process.cwd(),
      'prisma/template.db',
    );
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

  it('listWorkspaces 自动补默认工作区并持久化', () => {
    const list = listWorkspaces();
    expect(list.some((w) => w.id === DEFAULT_WORKSPACE_ID)).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'workspaces.json'))).toBe(true);
  });

  it('createWorkspace 初始化目录结构与独立数据库', () => {
    const dir = path.join(tmpRoot, 'ws-a');
    const record = createWorkspace({ name: '测试工作区', path: dir });
    expect(record.id).not.toBe(DEFAULT_WORKSPACE_ID);
    expect(fs.existsSync(path.join(dir, 'data', 'apm.db'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'uploads'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'logs'))).toBe(true);
    expect(findWorkspace(record.id)?.name).toBe('测试工作区');

    const url = resolveWorkspaceDbUrl(record.id);
    expect(url).toMatch(/ws-a\/data\/apm\.db$|ws-a\\data\\apm\.db$/);
  });

  it('相对路径与非空目录拒绝创建', () => {
    expect(() => createWorkspace({ name: 'X', path: 'relative/path' })).toThrow(
      WorkspaceCreateError,
    );

    const dirty = path.join(tmpRoot, 'dirty');
    fs.mkdirSync(dirty, { recursive: true });
    fs.writeFileSync(path.join(dirty, 'README.md'), 'x');
    expect(() => createWorkspace({ name: 'X', path: dirty })).toThrow(
      WorkspaceCreateError,
    );
  });

  it('default 工作区解析到 DATABASE_URL；未注册 id 返回 null', () => {
    expect(resolveWorkspaceDbUrl(DEFAULT_WORKSPACE_ID)).toBe(
      process.env.DATABASE_URL ?? null,
    );
    expect(resolveWorkspaceDbUrl('ghost-ws')).toBeNull();
  });

  it('activateWorkspace 更新 lastOpenedAt', () => {
    const dir = path.join(tmpRoot, 'ws-b');
    const record = createWorkspace({ name: 'B', path: dir });
    const activated = activateWorkspace(record.id);
    expect(activated?.lastOpenedAt).toBeTruthy();
    expect(activateWorkspace('ghost-ws')).toBeNull();
  });
});

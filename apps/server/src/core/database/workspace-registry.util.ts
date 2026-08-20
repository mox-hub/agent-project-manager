/**
 * 工作区注册表（纯 fs 工具，供数据层与 workspace 模块共用，避免 Nest 循环依赖）。
 *
 * 工作区 = 用户指定目录（内含 data/apm.db、uploads、logs 与 workspace.json），
 * 注册表文件记录全部工作区。id 为 'default' 的条目指向 DATABASE_URL 本身。
 */
import * as fs from 'fs';
import * as path from 'path';

export interface WorkspaceRecord {
  id: string;
  name: string;
  /** 工作区根目录；default 工作区为 null（直接使用 DATABASE_URL） */
  path: string | null;
  isDefault?: boolean;
  createdAt: string;
  lastOpenedAt?: string;
}

export const DEFAULT_WORKSPACE_ID = 'default';

function registryPath(): string {
  return path.resolve(process.env.WORKSPACE_REGISTRY_PATH ?? 'workspaces.json');
}

function templateDbPath(): string {
  return path.resolve(
    process.env.WORKSPACE_TEMPLATE_PATH ?? 'prisma/template.db',
  );
}

function toFileUrl(p: string): string {
  return 'file:' + p.replace(/\\/g, '/');
}

export function listWorkspaces(): WorkspaceRecord[] {
  const file = registryPath();
  let records: WorkspaceRecord[] = [];
  try {
    records = JSON.parse(fs.readFileSync(file, 'utf-8')) as WorkspaceRecord[];
    if (!Array.isArray(records)) records = [];
  } catch {
    records = [];
  }

  // 始终保证 default 工作区存在
  if (!records.some((r) => r.id === DEFAULT_WORKSPACE_ID)) {
    records.unshift({
      id: DEFAULT_WORKSPACE_ID,
      name: '默认工作区',
      path: null,
      isDefault: true,
      createdAt: new Date().toISOString(),
    });
    persist(records);
  }
  return records;
}

export function findWorkspace(id: string): WorkspaceRecord | null {
  return listWorkspaces().find((r) => r.id === id) ?? null;
}

/** 解析工作区对应的 SQLite URL；default 返回 DATABASE_URL，未初始化的工作区返回 null */
export function resolveWorkspaceDbUrl(id: string): string | null {
  if (!id || id === DEFAULT_WORKSPACE_ID) {
    return process.env.DATABASE_URL ?? null;
  }
  const ws = findWorkspace(id);
  if (!ws?.path) return null;
  const db = path.join(ws.path, 'data', 'apm.db');
  return fs.existsSync(db) ? toFileUrl(db) : null;
}

export class WorkspaceCreateError extends Error {}

/** 创建并初始化新工作区：校验路径 → 建目录 → 复制模板库 → 写注册表 */
export function createWorkspace(input: {
  name: string;
  path: string;
}): WorkspaceRecord {
  const name = input.name.trim();
  const rawPath = input.path.trim();
  const dir = path.resolve(rawPath);

  if (!name) throw new WorkspaceCreateError('工作区名称不能为空');
  if (!path.isAbsolute(rawPath)) {
    throw new WorkspaceCreateError('必须使用绝对路径指定工作区位置');
  }
  const template = templateDbPath();
  if (!fs.existsSync(template)) {
    throw new WorkspaceCreateError(
      `模板库缺失（${template}），请先运行 pnpm build:template-db`,
    );
  }

  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir);
    const stray = entries.filter(
      (e) => !['data', 'uploads', 'logs', 'workspace.json'].includes(e),
    );
    if (stray.length > 0) {
      throw new WorkspaceCreateError(
        `目标目录非空（含 ${stray.slice(0, 3).join(', ')} 等），请选择空目录`,
      );
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });

  const targetDb = path.join(dir, 'data', 'apm.db');
  if (!fs.existsSync(targetDb)) {
    fs.copyFileSync(template, targetDb);
  }
  fs.writeFileSync(
    path.join(dir, 'workspace.json'),
    JSON.stringify({ name, createdAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );

  const records = listWorkspaces();
  const id = `ws-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const record: WorkspaceRecord = {
    id,
    name,
    path: dir,
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  persist(records);
  return record;
}

export function activateWorkspace(id: string): WorkspaceRecord | null {
  const records = listWorkspaces();
  const hit = records.find((r) => r.id === id);
  if (!hit) return null;
  hit.lastOpenedAt = new Date().toISOString();
  persist(records);
  return hit;
}

function persist(records: WorkspaceRecord[]) {
  fs.writeFileSync(registryPath(), JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * E2E 工作区隔离工具。
 *
 * 每个测试套件用 template.db 副本创建一次性工作区（注册表与库文件都落在
 * jest 运行级临时目录），所有请求经 wsRequest 注入 x-workspace-id 头，
 * 数据访问被路由到该工作区的独立 SQLite 库——幂等可重复，不污染 dev 库。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import {
  createWorkspace,
  DEFAULT_WORKSPACE_ID,
} from '../../src/core/database/workspace-registry.util';
import { workspaceALS } from '../../src/core/database/workspace-context';

// jest 运行级临时目录：注册表文件避免写真实 workspaces.json
const runTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-e2e-'));
process.env.WORKSPACE_REGISTRY_PATH =
  process.env.WORKSPACE_REGISTRY_PATH ?? path.join(runTmp, 'workspaces.json');
process.env.WORKSPACE_TEMPLATE_PATH =
  process.env.WORKSPACE_TEMPLATE_PATH ??
  path.resolve(__dirname, '..', '..', 'prisma', 'template.db');

export const DEFAULT_WORKSPACE = DEFAULT_WORKSPACE_ID;

export interface IsolatedWorkspace {
  id: string;
  /** 工作区根目录（含 data/apm.db），cleanup 时整目录删除 */
  root: string;
  /** 直连该工作区库的独立客户端：测试进程内做种子数据/断言用，
   *  不依赖应用内的多库代理（jest 下代理的 ALS 实例与测试进程不完全一致） */
  db: PrismaClient;
  cleanup: () => Promise<void>;
}

/** 创建一次性工作区：模板库副本 + 注册表登记 + 独立直连客户端 */
export function createIsolatedWorkspace(suiteName: string): IsolatedWorkspace {
  const safe = suiteName.replace(/[^\w-]+/g, '-').toLowerCase();
  const root = path.join(runTmp, `${safe}-${Date.now().toString(36)}`);
  fs.mkdirSync(root, { recursive: true });
  const record = createWorkspace({ name: suiteName, path: root });
  const db = new PrismaClient({
    datasources: {
      db: {
        url: 'file:' + path.join(root, 'data', 'apm.db').replace(/\\/g, '/'),
      },
    },
  });
  return {
    id: record.id,
    root,
    db,
    cleanup: async () => {
      await db.$disconnect().catch(() => undefined);
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

/**
 * supertest 包装：自动注入 x-workspace-id。
 * 用法：ws.post('/_api/tasks').set('Authorization', ...).send({...})
 */
export function wsRequest(app: INestApplication, workspaceId: string) {
  const server = app.getHttpServer();
  const call =
    (method: 'get' | 'post' | 'put' | 'patch' | 'delete') => (url: string) =>
      request(server)[method](url).set('x-workspace-id', workspaceId);
  return {
    get: call('get'),
    post: call('post'),
    put: call('put'),
    patch: call('patch'),
    delete: call('delete'),
  };
}

export type WsRequest = ReturnType<typeof wsRequest>;

/**
 * 标准化装配测试 app：全局前缀、校验管道（与 main.ts 对齐，含隐式转换）、
 * 以及 x-workspace-id → ALS 中间件——没有它，请求的工作区头会被忽略，
 * 全部数据访问回落默认 dev 库。
 */
export async function initTestApp(
  moduleFixture: TestingModule,
): Promise<INestApplication> {
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('_api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.use(
    (
      req: { headers: Record<string, unknown> },
      _res: unknown,
      next: () => void,
    ) => {
      const raw = req.headers['x-workspace-id'];
      const workspaceId =
        typeof raw === 'string' && raw.trim() ? raw.trim() : null;
      workspaceALS.run({ workspaceId }, next);
    },
  );
  await app.init();
  return app;
}

/**
 * 在指定工作区上下文里执行回调：测试进程内直接的 prisma.* 调用
 * （无 HTTP 请求头）默认路由到 dev 库，必须用它显式指定目标工作区。
 */
export async function withWs<T>(
  workspaceId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return workspaceALS.run({ workspaceId }, fn);
}

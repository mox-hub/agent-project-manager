/**
 * 桌面端初始化共享逻辑（翻译自 Tauri src-tauri/src/setup.rs）：
 * 目录创建、密钥持久化、Prisma 建库、Node 运行时解析。
 * Electron 侧差异：Prisma CLI 一律用 Electron 内置 Node（process.execPath +
 * ELECTRON_RUN_AS_NODE=1）执行，不再依赖随包 node.exe——仅路径 A（spawn node.exe
 * 跑 server）才需要 resolveNode。
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from './config';
import { getDatabaseUrl } from './config';
import { logger } from './logger';

export function initializeDirs(config: AppConfig): void {
  for (const dir of [config.userDataDir, config.logsDir, config.uploadDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 首启生成随机密钥并落盘 secrets.json，后续启动复用（32 字节 = 64 hex，与 Tauri 版一致）。 */
export function ensureSecrets(config: AppConfig): void {
  const secretsPath = path.join(config.userDataDir, 'secrets.json');
  const load = (): { jwt_secret: string; integration_key: string } => {
    const raw = fs.readFileSync(secretsPath, 'utf-8');
    const parsed = JSON.parse(raw) as { jwt_secret?: string; integration_key?: string };
    if (!parsed.jwt_secret || !parsed.integration_key) {
      throw new Error('secrets.json 缺少密钥字段');
    }
    return { jwt_secret: parsed.jwt_secret, integration_key: parsed.integration_key };
  };

  try {
    const secrets = load();
    config.jwtSecret = secrets.jwt_secret;
    config.integrationKey = secrets.integration_key;
    logger.info(`已加载既有密钥: ${secretsPath}`);
  } catch {
    config.jwtSecret = randomBytes(32).toString('hex');
    config.integrationKey = randomBytes(32).toString('hex');
    fs.writeFileSync(
      secretsPath,
      JSON.stringify(
        { jwt_secret: config.jwtSecret, integration_key: config.integrationKey },
        null,
        2,
      ),
    );
    logger.info(`已生成新密钥: ${secretsPath}`);
  }
}

/**
 * 仅在库文件不存在（全新安装）时执行 prisma db push——已存在的库绝不带
 * `--accept-data-loss` 重建；升级场景的 schema 演进另行走 migrate deploy（v0.6.1 后再议）。
 * 返回值表示是否实际执行了建库。
 */
export function runDbPushIfNeeded(config: AppConfig): boolean {
  if (fs.existsSync(config.databasePath)) {
    logger.info(`数据库已存在，跳过 db push: ${config.databasePath}`);
    return false;
  }

  const prismaSchema = path.join(config.serverCwd, 'prisma', 'schema.prisma');
  if (!fs.existsSync(prismaSchema)) {
    throw new Error(`未找到 Prisma schema: ${prismaSchema}`);
  }
  const prismaEntry = path.join(config.serverCwd, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(prismaEntry)) {
    throw new Error(`未找到 Prisma CLI: ${prismaEntry}`);
  }

  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

  logger.info('首次启动，运行 Prisma db push...');
  // ELECTRON_RUN_AS_NODE=1 让 electron.exe 以纯 Node 模式执行 CLI（Prisma CLI 用
  // schema engine 独立二进制，不涉查询引擎 ABI）——开发/打包两模式都不依赖 PATH node。
  const result = spawnSync(
    process.execPath,
    [prismaEntry, 'db', 'push', '--schema', prismaSchema, '--skip-generate'],
    {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        DATABASE_URL: getDatabaseUrl(config),
        PRISMA_CLIENT_ENGINE_TYPE: 'library',
      },
      cwd: config.serverCwd,
      encoding: 'utf-8',
    },
  );

  if (result.status !== 0) {
    throw new Error(`数据库初始化失败（Prisma db push）: ${result.stderr ?? result.error?.message}`);
  }
  logger.info('Prisma db push 完成');
  return true;
}

/** 路径 A（spawn 随包 node.exe）专用：解析 Node 运行时，打包模式必须存在。 */
export function resolveNodeExe(config: AppConfig): string {
  if (config.nodeExe) {
    if (fs.existsSync(config.nodeExe)) {
      return config.nodeExe;
    }
    throw new Error(
      `未找到 Node.js 运行时（${config.nodeExe}）。安装包可能不完整，请重新安装。`,
    );
  }
  return process.execPath;
}

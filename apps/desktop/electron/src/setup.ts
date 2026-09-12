/**
 * 桌面端初始化共享逻辑（翻译自 Tauri src-tauri/src/setup.rs）：
 * 目录创建、密钥持久化、Prisma 建库、Node 运行时解析。
 * Electron 侧差异：Prisma CLI 一律用 Electron 内置 Node（process.execPath +
 * ELECTRON_RUN_AS_NODE=1）执行，不再依赖随包 node.exe——仅路径 A（spawn node.exe
 * 跑 server）才需要 resolveNode。
 */
import { safeStorage } from 'electron';
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

/**
 * 首装校验：~/.apm 已有密钥或数据库 = 非首次安装（升级/重装，数据全保留）。
 * 必须在 ensureSecrets（会生成 secrets.json）之前调用，否则永远是 false。
 */
export function detectFirstInstall(config: AppConfig): boolean {
  const hasExisting =
    fs.existsSync(path.join(config.userDataDir, 'secrets.json')) ||
    fs.existsSync(config.databasePath);
  return !hasExisting;
}

/**
 * v0.6.1 旧版数据迁移：旧壳数据根在 %APPDATA%/agent-project-manager（Electron 默认
 * userData，Chromium 缓存混在其中）。按白名单搬迁项目数据到 ~/.apm（apm-config.json
 * 特判挪到 desktop/ 子目录，即新版守护进程配置与锁位置），旧目录改名 .migrated.bak
 * 留档防重复迁移。目标已有密钥（已初始化/已迁移过）则不动；失败仅告警不阻断启动。
 */
export function migrateLegacyUserData(config: AppConfig, legacyDir: string): void {
  if (!fs.existsSync(legacyDir) || fs.existsSync(path.join(config.userDataDir, 'secrets.json'))) {
    return;
  }
  const entries = [
    'data',
    'logs',
    'uploads',
    'secrets.json',
    'desktop-state.json',
    'workspaces.json',
    'apm-config.json',
  ];
  try {
    fs.mkdirSync(config.userDataDir, { recursive: true });
    for (const entry of entries) {
      const from = path.join(legacyDir, entry);
      if (!fs.existsSync(from)) {
        continue;
      }
      fs.rmSync(path.join(config.userDataDir, entry), { force: true, recursive: true });
      fs.renameSync(from, path.join(config.userDataDir, entry));
    }
    if (fs.existsSync(path.join(config.userDataDir, 'apm-config.json'))) {
      fs.mkdirSync(path.dirname(config.apmConfigPath), { recursive: true });
      fs.renameSync(
        path.join(config.userDataDir, 'apm-config.json'),
        config.apmConfigPath,
      );
    }
    fs.renameSync(legacyDir, `${legacyDir}.migrated.bak`);
    logger.info(`旧版数据已迁移: ${legacyDir} → ${config.userDataDir}`);
  } catch (err) {
    logger.warn(
      `旧版数据迁移失败（按全新安装继续）: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * 首启生成随机密钥并落盘 secrets.json，后续启动复用（32 字节 = 64 hex，与 Tauri 版一致）。
 * 落盘格式（ADR-015 安全加固）：经 Electron safeStorage 加密（Windows = DPAPI，机器级绑
 * 定）；加密服务不可用时明文回退并标记 is_plaintext。旧版明文格式读入时原样生效（不强制
 * 重加密）。加密格式但解密失败（如整目录被拷到别的机器）时直接报错——绝不静默重新生成：
 * JWT_SECRET 变更会踢掉全部登录态，INTEGRATION_ENCRYPTION_KEY 变更会使集成密文永久失效。
 */
export function ensureSecrets(config: AppConfig): void {
  const secretsPath = path.join(config.userDataDir, 'secrets.json');
  interface SecretFileShape {
    jwt_secret: string;
    integration_key: string;
    encrypted?: boolean;
    is_plaintext?: boolean;
  }
  const decrypt = (value: string, encrypted: boolean): string => {
    if (!encrypted) {
      return value;
    }
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'secrets.json 为加密格式，但本机系统加密服务不可用（Windows DPAPI）。若为跨机器迁移，请删除该文件重新初始化（登录态与集成密文将失效）。',
      );
    }
    return safeStorage.decryptString(Buffer.from(value, 'base64'));
  };
  const load = (): { jwt_secret: string; integration_key: string; encrypted: boolean } => {
    const parsed = JSON.parse(fs.readFileSync(secretsPath, 'utf-8')) as SecretFileShape;
    if (!parsed.jwt_secret || !parsed.integration_key) {
      throw new Error('secrets.json 缺少密钥字段');
    }
    return {
      jwt_secret: decrypt(parsed.jwt_secret, parsed.encrypted === true),
      integration_key: decrypt(parsed.integration_key, parsed.encrypted === true),
      encrypted: parsed.encrypted === true,
    };
  };

  try {
    const secrets = load();
    config.jwtSecret = secrets.jwt_secret;
    config.integrationKey = secrets.integration_key;
    logger.info(
      `已加载既有密钥: ${secretsPath}${secrets.encrypted ? '' : '（旧版明文格式，保留不强制重加密）'}`,
    );
  } catch (err) {
    const existing = fs.existsSync(secretsPath);
    let encryptedUnreadable = false;
    if (existing) {
      try {
        const parsed = JSON.parse(fs.readFileSync(secretsPath, 'utf-8')) as SecretFileShape;
        encryptedUnreadable = parsed.encrypted === true;
      } catch {
        encryptedUnreadable = false; // JSON 损坏按可重生成处理
      }
    }
    if (encryptedUnreadable) {
      // 密钥在但解不开（DPAPI 机器绑定）——覆盖它会连锁踢登录态/毁集成密文，升级人审
      throw err instanceof Error ? err : new Error(String(err));
    }
    config.jwtSecret = randomBytes(32).toString('hex');
    config.integrationKey = randomBytes(32).toString('hex');
    const encryptionAvailable = safeStorage.isEncryptionAvailable();
    const store = (plain: string): string =>
      encryptionAvailable ? safeStorage.encryptString(plain).toString('base64') : plain;
    fs.writeFileSync(
      secretsPath,
      JSON.stringify(
        encryptionAvailable
          ? {
              jwt_secret: store(config.jwtSecret),
              integration_key: store(config.integrationKey),
              encrypted: true,
            }
          : {
              jwt_secret: config.jwtSecret,
              integration_key: config.integrationKey,
              is_plaintext: true,
            },
        null,
        2,
      ),
    );
    logger.info(
      `已生成新密钥: ${secretsPath}（${encryptionAvailable ? 'safeStorage 加密' : '明文回退，系统加密服务不可用'}）`,
    );
  }
}

/**
 * 首启建库（Prisma 瘦身配套，ADR-015）：打包模式恢复随包 default-template.db
 * （打包时由 db push 生成干净库，见 pack.mjs 4b）——用户机免 prisma CLI（剪除
 * ~135MB）也免 ~40s 现场建库；已有库跳过，绝不覆盖。dev 模式无模板时回退
 * prisma db push（开发环境有完整 CLI）。
 */
export function restoreDefaultDbIfNeeded(config: AppConfig): boolean {
  if (fs.existsSync(config.databasePath)) {
    logger.info(`数据库已存在，跳过建库: ${config.databasePath}`);
    return false;
  }

  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

  const templatePath = path.join(config.serverCwd, 'prisma', 'default-template.db');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, config.databasePath);
    logger.info(`已恢复默认库模板: ${templatePath} → ${config.databasePath}`);
    return false;
  }

  // 打包模式模板缺失 = 包不完整（随包已无 prisma CLI，无法现场建库）
  if (config.nodeExe) {
    throw new Error(`未找到默认库模板（${templatePath}）。安装包可能不完整，请重新安装。`);
  }

  // dev 回退：现场 db push（原路径，开发环境有完整 prisma CLI）
  const prismaSchema = path.join(config.serverCwd, 'prisma', 'schema.prisma');
  if (!fs.existsSync(prismaSchema)) {
    throw new Error(`未找到 Prisma schema: ${prismaSchema}`);
  }
  const prismaEntry = path.join(config.serverCwd, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(prismaEntry)) {
    throw new Error(`未找到 Prisma CLI: ${prismaEntry}`);
  }

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

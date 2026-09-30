/**
 * 工作区备份与恢复服务（CAP-A-03「工作区备份与恢复」/ G7-a 缺口兑现）。
 *
 * 范围口径：备份 = workspaces.json 注册表 + 各工作区 SQLite 库文件；
 * 工作区目录内的 uploads/logs/workspace.json 不在备份范围（与注册表口径一致）。
 *
 * 关键设计：
 * 1. 在线快照用 SQLite `VACUUM INTO`（WAL 一致性快照，读到的是已提交数据）。
 *    default 库是服务端基座实例的常连库，恒走 VACUUM INTO；非 default 库按
 *    `-wal`/`-shm` 存在性判断运行态——运行库走 VACUUM INTO，静态库直接
 *    copyFileSync 优化（VACUUM INTO 不支持参数绑定，路径为服务端拼接字符串，
 *    单引号必须转义，见 escapeSqliteTextLiteral，防路径注入）。
 * 2. 恢复是高危操作：覆盖任何库文件前先经数据层失效接口
 *    （WorkspaceConnectionAdmin）断开对应工作区的活跃 PrismaClient
 *    （Windows 上 SQLite 文件被 WAL 句柄锁定，直接覆盖会失败或损坏），
 *    default 库同理断开基座实例；覆盖用「临时文件 + rename」，
 *    并清掉陈旧 `-wal`/`-shm`（旧 WAL 套新库文件必然损坏）。
 * 3. 恢复前强制自动备份当前状态，恒为全量 scope=all（单区恢复也可能因
 *    注册表/路径漂移需要完整现场），meta 标记 reason='pre-restore'。
 *    自动份参与 10 份滚动计数：不参与则高频恢复会无上限堆积备份目录；
 *    刚创建的自动份总是最新的，不会被本轮清理删除。
 * 4. 整个恢复流程包 try/catch：失败返回结构化错误并在消息中给出
 *    恢复前备份 ID（回滚保险），绝不半途静默。
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 先于 @prisma/client 求值：prisma.service 模块体强制 PRISMA_CLIENT_ENGINE_TYPE=library
import { LoggerService } from '@/core/logger/logger.service';
import {
  PrismaService,
  WorkspaceConnectionAdmin,
} from '@/core/database/prisma.service';
import {
  DEFAULT_WORKSPACE_ID,
  WorkspaceRecord,
  dbFileUrl,
  findWorkspace,
  listWorkspaces,
  registryFilePath,
} from '@/core/database/workspace-registry.util';
import { CreateBackupDto, RestoreBackupDto } from './dto/backup.dto';
import {
  RestoreBackupResponseDto,
  WorkspaceBackupDto,
} from './dto/backup-response.dto';

/** 滚动保留份数（超出按时间删最旧，只动备份根目录内部） */
export const BACKUP_RETENTION_LIMIT = 10;

/** VACUUM INTO / SQL 文本字面量的单引号转义（SQL 标准里 '' 表示一个单引号） */
export function escapeSqliteTextLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

interface BackupMetaFile {
  name: string;
  sizeBytes: number;
  kind: 'registry' | 'database';
  workspaceId?: string;
}

/** 备份元数据（落盘 meta.json 的结构，与对外 DTO 同形） */
type BackupMeta = WorkspaceBackupDto;

/** 恢复计划：先全部解析、全部校验通过后才执行任何破坏性动作 */
interface RestoreTarget {
  workspaceId: string;
  /** 备份目录内的快照文件名 */
  snapshotName: string;
  /** 覆盖目标（绝对路径） */
  targetPath: string;
  /** 传入失效接口的库 URL（default 额外含原始 DATABASE_URL 以命中基座实例） */
  dbUrls: string[];
}

@Injectable()
export class WorkspaceBackupService {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext('WorkspaceBackup');
  }

  // ---------------------------------------------------------------- 创建备份

  async createBackup(
    input: CreateBackupDto,
    opts?: { reason?: string },
  ): Promise<WorkspaceBackupDto> {
    if (input.scope === 'workspace' && !input.workspaceId?.trim()) {
      throw new BadRequestException('scope=workspace 时必须提供 workspaceId');
    }

    const records = listWorkspaces();
    const workspaceId = input.workspaceId?.trim();
    if (input.scope === 'workspace') {
      if (!findWorkspace(workspaceId as string)) {
        throw new NotFoundException('工作区不存在（未注册）');
      }
    }

    const now = new Date();
    const dir = this.allocateBackupDir(now, input.scope, workspaceId);

    const meta: BackupMeta = {
      id: path.basename(dir),
      scope: input.scope,
      createdAt: now.toISOString(),
      files: [],
      totalBytes: 0,
    };
    if (opts?.reason) meta.reason = opts.reason;
    if (input.scope === 'workspace') {
      meta.workspaceId = workspaceId;
      meta.workspaceName = findWorkspace(workspaceId as string)?.name;
    }

    fs.mkdirSync(dir, { recursive: true });

    // scope=all：先快照注册表（restore-all 以备份时点注册表为准做点时还原）
    if (input.scope === 'all') {
      const registryFile = registryFilePath();
      if (!fs.existsSync(registryFile)) {
        // listWorkspaces 刚刚保证过注册表存在（缺省时自动补写），此处为纵深防御
        throw new Error(`注册表文件缺失：${registryFile}`);
      }
      meta.files.push(
        this.buildFileEntry(dir, 'workspaces.json', 'registry', () => {
          fs.copyFileSync(registryFile, path.join(dir, 'workspaces.json'));
        }),
      );
    }

    // 逐工作区快照库文件
    const targets =
      input.scope === 'workspace'
        ? records.filter((r) => r.id === workspaceId)
        : records;
    for (const record of targets) {
      const dbPath = this.resolveDbPath(record);
      if (!dbPath) {
        // scope=all 下跳过库缺失的工作区（注册表登记了但没建库），不让单个
        // 坏工作区拖垮全库备份；scope=workspace 已在上方校验注册表，此处同样跳过并告警。
        this.logger.warn(`备份跳过库缺失的工作区 ${record.id}`);
        continue;
      }
      const snapshotName = `${record.id}.db`;
      await this.snapshotDatabase(
        dbPath,
        path.join(dir, snapshotName),
        record.id === DEFAULT_WORKSPACE_ID,
      );
      meta.files.push(
        this.buildFileEntry(
          dir,
          snapshotName,
          'database',
          () => undefined,
          record.id,
        ),
      );
    }

    meta.totalBytes = meta.files.reduce((sum, f) => sum + f.sizeBytes, 0);
    fs.writeFileSync(
      path.join(dir, 'meta.json'),
      JSON.stringify(meta, null, 2),
      'utf-8',
    );

    this.pruneOldBackups();
    return meta;
  }

  // ---------------------------------------------------------------- 备份列表

  listBackups(): WorkspaceBackupDto[] {
    const root = this.backupRoot();
    if (!fs.existsSync(root)) return [];
    const backups: WorkspaceBackupDto[] = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('backup-')) continue;
      const metaPath = path.join(root, entry.name, 'meta.json');
      try {
        backups.push(
          JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as BackupMeta,
        );
      } catch {
        // 无 meta / meta 损坏的目录不算有效备份（可能是中断的残次目录），诚实跳过
        this.logger.warn(`备份目录缺少有效 meta.json，已跳过：${entry.name}`);
      }
    }
    backups.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return backups;
  }

  // ---------------------------------------------------------------- 恢复

  async restoreBackup(
    backupId: string,
    dto: RestoreBackupDto,
  ): Promise<RestoreBackupResponseDto> {
    const backupDir = this.resolveExistingBackupDir(backupId);
    const meta = this.readMetaOrThrow(backupDir);

    // 1. 强确认校验（发生在任何破坏性动作之前）
    let requiredText: string;
    if (meta.scope === 'workspace') {
      const ws = meta.workspaceId ? findWorkspace(meta.workspaceId) : null;
      requiredText = ws?.name ?? meta.workspaceName ?? '';
      if (!requiredText) {
        throw new BadRequestException(
          '该备份对应的工作区已不在注册表且未记录名称，无法确定确认文案，拒绝恢复',
        );
      }
    } else {
      requiredText = 'RESTORE ALL';
    }
    if (dto.confirm !== requiredText) {
      throw new BadRequestException(
        `confirm 不匹配，恢复被拒绝：scope=${meta.scope} 要求精确输入「${requiredText}」` +
          `（scope=workspace 输工作区名称；scope=all 输 RESTORE ALL）`,
      );
    }

    // 2. 解析恢复计划（此时不产生任何副作用，计划失败直接中止）
    const plan = this.buildRestorePlan(backupDir, meta);

    // 3. 恢复前强制自动备份（全量，回滚保险；失败则中止恢复）
    const preRestore = await this.createBackup(
      { scope: 'all' },
      { reason: 'pre-restore' },
    );

    // 4. 执行恢复：失效连接 → 覆盖文件 → 重连基座
    const admin = this.prisma as unknown as Partial<WorkspaceConnectionAdmin>;
    const canInvalidate =
      typeof admin.invalidateWorkspaceConnections === 'function';
    const canReconnect = typeof admin.reconnectBaseConnection === 'function';
    const dbUrls = Array.from(new Set(plan.flatMap((t) => t.dbUrls)));

    try {
      if (canInvalidate) {
        const disconnected =
          await admin.invalidateWorkspaceConnections!(dbUrls);
        this.logger.log(`恢复前已断开数据层连接：${disconnected.length} 个`);
      } else {
        this.logger.warn(
          '数据层未暴露连接失效接口，跳过连接断开（仅限无池场景）',
        );
      }

      let registryRestored = false;
      if (meta.scope === 'all') {
        const snapshotRegistry = path.join(backupDir, 'workspaces.json');
        if (fs.existsSync(snapshotRegistry)) {
          fs.copyFileSync(snapshotRegistry, registryFilePath());
          registryRestored = true;
        }
      }

      for (const target of plan) {
        this.restoreDatabaseFile(backupDir, target);
      }

      return {
        restoredBackupId: meta.id,
        preRestoreBackupId: preRestore.id,
        restoredWorkspaces: plan.map((t) => t.workspaceId),
        registryRestored,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`恢复失败（backup=${meta.id}）：${message}`);
      // 结构化失败：不静默吞掉，同时给出回滚保险的位置
      throw new Error(
        `恢复失败：${message}。当前现场可用恢复前备份 ${preRestore.id} 手动回滚。`,
      );
    } finally {
      // 无论成败都把 default 基座连接拉起来，绝不把服务器留在断连状态
      if (canReconnect) {
        try {
          await admin.reconnectBaseConnection!();
        } catch (e) {
          this.logger.error(`恢复后重连默认库失败：${(e as Error).message}`);
        }
      }
    }
  }

  // ---------------------------------------------------------------- 内部：路径与目录

  private backupRoot(): string {
    return path.resolve(process.env.WORKSPACE_BACKUP_DIR ?? '.apm-backups');
  }

  /** 备份目录名：backup-<ISO 时间戳（冒号/毫秒点转连字符，Windows 文件名非法字符）>-all|<workspaceId> */
  private allocateBackupDir(
    now: Date,
    scope: string,
    workspaceId?: string,
  ): string {
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const base = `backup-${stamp}-${scope === 'all' ? 'all' : workspaceId}`;
    const root = this.backupRoot();
    let dir = path.join(root, base);
    // 同毫秒并发创建时追加序号，保证目录唯一
    let seq = 1;
    while (fs.existsSync(dir)) {
      dir = path.join(root, `${base}-${seq}`);
      seq += 1;
    }
    return dir;
  }

  /** 备份 ID 白名单校验 + 目录存在性（backupId 会拼进路径，必须防路径穿越） */
  private resolveExistingBackupDir(backupId: string): string {
    if (!/^[A-Za-z0-9._-]+$/.test(backupId) || backupId.includes('..')) {
      throw new BadRequestException('非法的备份 ID');
    }
    const root = path.resolve(this.backupRoot());
    const dir = path.resolve(root, backupId);
    if (!dir.startsWith(root + path.sep)) {
      throw new BadRequestException('非法的备份 ID');
    }
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new NotFoundException('备份不存在（可能已被滚动清理）');
    }
    return dir;
  }

  private readMetaOrThrow(backupDir: string): BackupMeta {
    const metaPath = path.join(backupDir, 'meta.json');
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as BackupMeta;
    } catch {
      throw new NotFoundException('备份元数据缺失或损坏，无法恢复');
    }
  }

  /**
   * 工作区 → 库文件绝对路径（备份视角）。
   * DATABASE_URL 是 file: URL 格式：剥前缀后绝对路径直接用；相对路径按
   * schema.prisma 所在目录（<cwd>/prisma）解析——与 Prisma 运行时行为一致
   * （实证：仓库 dev.db 落在 apps/server/prisma/dev.db）。
   */
  private resolveDbPath(record: WorkspaceRecord): string | null {
    if (record.id === DEFAULT_WORKSPACE_ID) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL 未配置，无法备份默认工作区');
      return this.fileUrlToDbPath(url);
    }
    if (!record.path) return null;
    const db = path.join(record.path, 'data', 'apm.db');
    return fs.existsSync(db) ? db : null;
  }

  private fileUrlToDbPath(url: string): string {
    const raw = url.startsWith('file:') ? url.slice('file:'.length) : url;
    if (path.isAbsolute(raw)) return path.normalize(raw);
    return path.resolve(process.cwd(), 'prisma', raw);
  }

  // ---------------------------------------------------------------- 内部：快照

  private buildFileEntry(
    dir: string,
    name: string,
    kind: 'registry' | 'database',
    write: () => void,
    workspaceId?: string,
  ): BackupMetaFile {
    write();
    const sizeBytes = fs.statSync(path.join(dir, name)).size;
    const file: BackupMetaFile = { name, sizeBytes, kind };
    if (workspaceId) file.workspaceId = workspaceId;
    return file;
  }

  /**
   * 单库快照：运行库（default 恒为运行库；其余按 -wal/-shm 判定）走
   * VACUUM INTO（专用短连客户端，显式指定源 URL——数据层代理按请求上下文
   * 路由，与「要备份哪个库」无关，不能借用）；静态库直接复制。
   */
  private async snapshotDatabase(
    sourceDbPath: string,
    targetPath: string,
    isDefault: boolean,
  ): Promise<void> {
    const hasWalSidecar =
      fs.existsSync(sourceDbPath + '-wal') ||
      fs.existsSync(sourceDbPath + '-shm');
    const useVacuum = isDefault || hasWalSidecar;

    if (!useVacuum) {
      fs.copyFileSync(sourceDbPath, targetPath);
      return;
    }

    const url = isDefault ? process.env.DATABASE_URL : dbFileUrl(sourceDbPath);
    if (!url) throw new Error('DATABASE_URL 未配置，无法快照默认工作区');
    // VACUUM INTO 要求目标文件不存在；目录是新建的，此处防御性清理
    fs.rmSync(targetPath, { force: true });
    const escaped = escapeSqliteTextLiteral(targetPath);
    // 用完即断：备份客户端不进数据层连接池，避免长占文件句柄
    const client = new PrismaClient({ datasources: { db: { url } } });
    try {
      await client.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);
    } finally {
      await client.$disconnect().catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------- 内部：恢复计划与执行

  private buildRestorePlan(
    backupDir: string,
    meta: BackupMeta,
  ): RestoreTarget[] {
    if (meta.scope === 'workspace') {
      const ws = meta.workspaceId ? findWorkspace(meta.workspaceId) : null;
      if (!ws) {
        throw new BadRequestException(
          '该备份对应的工作区已不在注册表，无法确定恢复目标',
        );
      }
      const targetPath =
        ws.id === DEFAULT_WORKSPACE_ID
          ? this.resolveDbPath(ws)
          : ws.path
            ? path.join(ws.path, 'data', 'apm.db')
            : null;
      if (!targetPath) {
        throw new BadRequestException(
          '该工作区当前未初始化数据库目录，无法恢复',
        );
      }
      return [
        {
          workspaceId: ws.id,
          snapshotName: `${ws.id}.db`,
          targetPath,
          dbUrls: this.dbUrlsForInvalidate(targetPath),
        },
      ];
    }

    // scope=all：库目标路径以备份时点注册表为准（点时还原），注册表随后回写
    const snapshotRegistryPath = path.join(backupDir, 'workspaces.json');
    let snapshotRecords: WorkspaceRecord[] = [];
    try {
      snapshotRecords = JSON.parse(
        fs.readFileSync(snapshotRegistryPath, 'utf-8'),
      ) as WorkspaceRecord[];
    } catch {
      throw new NotFoundException(
        '备份内注册表快照缺失或损坏，无法执行全库恢复',
      );
    }
    const plan: RestoreTarget[] = [];
    for (const file of meta.files) {
      if (file.kind !== 'database' || !file.workspaceId) continue;
      const record = snapshotRecords.find((r) => r.id === file.workspaceId);
      const targetPath =
        file.workspaceId === DEFAULT_WORKSPACE_ID
          ? process.env.DATABASE_URL
            ? this.fileUrlToDbPath(process.env.DATABASE_URL)
            : null
          : record?.path
            ? path.join(record.path, 'data', 'apm.db')
            : null;
      if (!targetPath) {
        throw new BadRequestException(
          `备份内工作区 ${file.workspaceId} 无法定位恢复目标路径（注册表快照缺 path 或 DATABASE_URL 未配置）`,
        );
      }
      plan.push({
        workspaceId: file.workspaceId,
        snapshotName: file.name,
        targetPath,
        dbUrls: this.dbUrlsForInvalidate(targetPath),
      });
    }
    if (plan.length === 0) {
      throw new BadRequestException('备份内没有任何数据库快照，无法恢复');
    }
    return plan;
  }

  /** 失效接口入参：目标库 URL + 原始 DATABASE_URL（基座实例按原串匹配） */
  private dbUrlsForInvalidate(targetPath: string): string[] {
    const urls = [dbFileUrl(targetPath)];
    if (process.env.DATABASE_URL) urls.push(process.env.DATABASE_URL);
    return urls;
  }

  /**
   * 覆盖单个库文件：临时文件 + rename（copy 失败时原库完好），
   * 随后清掉陈旧 -wal/-shm（旧 WAL 套新库文件必然损坏）。
   */
  private restoreDatabaseFile(backupDir: string, target: RestoreTarget): void {
    const snapshot = path.join(backupDir, target.snapshotName);
    if (!fs.existsSync(snapshot)) {
      throw new Error(`备份内快照文件缺失：${target.snapshotName}`);
    }
    fs.mkdirSync(path.dirname(target.targetPath), { recursive: true });
    const tmp = `${target.targetPath}.restore-tmp-${Date.now()}`;
    try {
      fs.copyFileSync(snapshot, tmp);
      fs.rmSync(target.targetPath, { force: true });
      fs.renameSync(tmp, target.targetPath);
    } catch (err) {
      try {
        fs.rmSync(tmp, { force: true });
      } catch {
        // 清理失败不掩盖原始错误
      }
      throw err;
    }
    for (const sidecar of ['-wal', '-shm']) {
      try {
        fs.rmSync(target.targetPath + sidecar, { force: true });
      } catch (e) {
        this.logger.warn(
          `清理 ${target.targetPath}${sidecar} 失败：${(e as Error).message}`,
        );
      }
    }
    this.logger.log(
      `已恢复工作区库：${target.workspaceId} → ${target.targetPath}`,
    );
  }

  // ---------------------------------------------------------------- 内部：滚动清理

  /**
   * 滚动保留 BACKUP_RETENTION_LIMIT 份（含 pre-restore 自动份，取舍见类注释）。
   * 排序键用 meta.createdAt（缺失回退目录名）；单目录删除失败只告警不中断
   * （Windows 文件句柄释放有延迟，备份目录被占用不应影响主流程）。
   */
  private pruneOldBackups(): void {
    const root = this.backupRoot();
    if (!fs.existsSync(root)) return;
    const dirs = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('backup-'))
      .map((e) => {
        let createdAt = '';
        try {
          const meta = JSON.parse(
            fs.readFileSync(path.join(root, e.name, 'meta.json'), 'utf-8'),
          ) as BackupMeta;
          createdAt = meta.createdAt ?? '';
        } catch {
          createdAt = '';
        }
        return { name: e.name, createdAt };
      });
    dirs.sort((a, b) =>
      (a.createdAt || a.name) < (b.createdAt || b.name) ? 1 : -1,
    );
    for (const stale of dirs.slice(BACKUP_RETENTION_LIMIT)) {
      try {
        fs.rmSync(path.join(root, stale.name), {
          recursive: true,
          force: true,
        });
        this.logger.log(`滚动清理旧备份：${stale.name}`);
      } catch (e) {
        this.logger.warn(
          `滚动清理失败（跳过）：${stale.name}，${(e as Error).message}`,
        );
      }
    }
  }
}

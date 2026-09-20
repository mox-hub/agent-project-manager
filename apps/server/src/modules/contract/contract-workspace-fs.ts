import { Injectable, Logger } from '@nestjs/common';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { PrismaService } from '../../core/database/prisma.service';

/**
 * 契约文件系统端口（v2 纪要 §6.4：server 不直连磁盘的原则性承接）。
 * V1 提供本地实现；未来 Runtime 节点 fs 代理实现同一接口即可替换，
 * 引擎与绑定服务层不感知存储位置。
 */
export interface ContractWorkspaceFs {
  readFileIfExists(absPath: string): Promise<string | null>;
  writeFile(absPath: string, content: string): Promise<void>;
}

/** DI token：接口在 V1 为本地实现，未来 Runtime fs 代理实现同一接口后替换 */
export const CONTRACT_WORKSPACE_FS = Symbol('CONTRACT_WORKSPACE_FS');

@Injectable()
export class LocalWorkspaceFs implements ContractWorkspaceFs {
  async readFileIfExists(absPath: string): Promise<string | null> {
    try {
      return readFileSync(absPath, 'utf8');
    } catch {
      return null;
    }
  }

  async writeFile(absPath: string, content: string): Promise<void> {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, 'utf8');
  }
}

/**
 * 项目工作区根解析，按优先级取：
 * 1. 最早登记仓库的 workspacePath（契约域专用列）
 * 2. 同仓库 localPath
 * 3. ProjectWorkspace.localPath（git 模块 setWorkspace/接入向导写入的项目级工作区）
 * 未能解析时上层诚实降级（跳过种生/对齐），绝不猜测根路径。
 */
@Injectable()
export class ContractWorkspaceResolver {
  private readonly logger = new Logger(ContractWorkspaceResolver.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveRoot(projectId: string): Promise<string | null> {
    const repo = await this.prisma.repository.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: { workspacePath: true, localPath: true },
    });
    const root =
      repo?.workspacePath ||
      repo?.localPath ||
      (
        await this.prisma.projectWorkspace.findUnique({
          where: { projectId },
          select: { localPath: true },
        })
      )?.localPath ||
      null;
    if (!root) {
      this.logger.warn(`项目 ${projectId} 无可用仓库工作区路径`);
      return null;
    }
    return root;
  }

  /** POSIX 相对路径转本地绝对路径；拒绝绝对路径与 `..` 逃逸。 */
  join(root: string, relPath: string): string {
    if (isAbsolute(relPath) || relPath.split('/').includes('..')) {
      throw new Error(`非法的契约文件相对路径: ${relPath}`);
    }
    return resolve(root, ...relPath.split('/'));
  }
}

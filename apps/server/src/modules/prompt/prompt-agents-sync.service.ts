/**
 * AGENTS.md 受管区块物化服务（CAP-A-24 增强 D）
 *
 * 项目级提示词的投递面：保存时把 AppConfig 中的项目提示词物化到工作区
 * AGENTS.md 的独立受管区块（`apm:managed:project-prompt`），与契约种子的
 * 区块（project-intro 等）同文件共存——复用 ContractEngineService 托管
 * 区块原语，applyManagedBlocks 只动同 id 区块、未涉及区块字节不变。
 *
 * 真相源仍是 AppConfig（AGENTS.md 是投递面）：文件侧被外部修改时由
 * readBlock 检出 drift，回填走人确认（前端提示「以文件为准」后走
 * 既有 PUT config 写回），绝不静默覆盖任一侧。
 * 无本地工作区（root 解析为 null）或 IO 失败：物化降级为未同步，不阻断
 * 提示词保存主链路。
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { ContractEngineService } from '@/modules/contract/contract-engine.service';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from '@/modules/contract/contract-workspace-fs';

/** AGENTS.md 中项目提示词受管区块的稳定 id（合法字符集见引擎 MANAGED_BLOCK_ID_PATTERN） */
export const AGENTS_PROJECT_PROMPT_BLOCK_ID = 'project-prompt';

export interface AgentsMaterializeResult {
  /** 文件是否成功写入 */
  synced: boolean;
  /** 未同步原因（synced=false 时给人看） */
  reason: string | null;
  /** 工作区根目录（null = 项目未绑定本地工作区） */
  root: string | null;
}

export interface AgentsBlockReadResult {
  /** AGENTS.md 文件是否存在 */
  fileExists: boolean;
  /** 受管区块当前内容（文件或区块缺失为 null） */
  blockContent: string | null;
}

const AGENTS_FILE_HEADER = [
  '# AGENTS.md',
  '',
  '本文件含 APM 托管的受管区块（`<!-- BEGIN/END apm:managed:... -->`）：',
  '区块内内容由 APM 维护，请在 APM 内编辑；区块外的自由区归你所有。',
  '',
].join('\n');

@Injectable()
export class PromptAgentsSyncService {
  private readonly logger = new Logger(PromptAgentsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ContractEngineService,
    private readonly resolver: ContractWorkspaceResolver,
    @Inject(CONTRACT_WORKSPACE_FS) private readonly fs: ContractWorkspaceFs,
  ) {}

  /**
   * 项目本地根目录解析（与派发面 getWorkspaceRoot 同口径的三级链：
   * ProjectWorkspace.localPath → AppConfig git.workspaceRoot → Repository.localPath）。
   * 复用契约域的 resolver 保持单一解析实现。
   */
  async resolveRoot(projectId: string): Promise<string | null> {
    try {
      return await this.resolver.resolveRoot(projectId);
    } catch {
      return null;
    }
  }

  /** AGENTS.md 绝对路径；项目未绑定工作区返回 null */
  async resolveAgentsPath(projectId: string): Promise<string | null> {
    const root = await this.resolveRoot(projectId);
    return root ? this.resolver.join(root, 'AGENTS.md') : null;
  }

  /**
   * 物化项目提示词到 AGENTS.md 受管区块。
   * @param prompt 项目提示词全文；null/空 = 清除区块（保留文件其余部分）
   */
  async materialize(
    projectId: string,
    prompt: string | null,
  ): Promise<AgentsMaterializeResult> {
    const absPath = await this.resolveAgentsPath(projectId);
    if (!absPath) {
      return { synced: false, reason: '项目未绑定本地工作区', root: null };
    }

    let root: string | null = null;
    try {
      root = await this.resolveRoot(projectId);
    } catch {
      root = null;
    }

    let existing: string | null = null;
    try {
      existing = await this.fs.readFileIfExists(absPath);
    } catch (e) {
      this.logger.warn(
        `AGENTS.md read failed for project ${projectId}: ${(e as Error).message}`,
      );
      return { synced: false, reason: 'AGENTS.md 读取失败', root };
    }

    try {
      if (existing === null) {
        if (!prompt?.trim()) {
          // 无文件且无提示词：无事可做
          return { synced: true, reason: null, root };
        }
        const block = this.engine.buildManagedBlock(
          AGENTS_PROJECT_PROMPT_BLOCK_ID,
          prompt.trim(),
        );
        await this.fs.writeFile(absPath, `${AGENTS_FILE_HEADER}\n${block}\n`);
        return { synced: true, reason: null, root };
      }

      if (!prompt?.trim()) {
        const removed = this.removeBlock(existing);
        if (removed !== existing) {
          await this.fs.writeFile(absPath, removed);
        }
        return { synced: true, reason: null, root };
      }

      const next = this.engine.applyManagedBlocks(
        existing,
        [{ id: AGENTS_PROJECT_PROMPT_BLOCK_ID, content: prompt.trim() }],
        { appendMissing: true },
      );
      if (next !== existing) {
        await this.fs.writeFile(absPath, next);
      }
      return { synced: true, reason: null, root };
    } catch (e) {
      this.logger.warn(
        `AGENTS.md materialize failed for project ${projectId}: ${(e as Error).message}`,
      );
      return { synced: false, reason: 'AGENTS.md 写入失败', root };
    }
  }

  /** 读文件侧受管区块内容（drift 检测用）；文件/区块缺失为 null */
  async readBlock(projectId: string): Promise<AgentsBlockReadResult> {
    const absPath = await this.resolveAgentsPath(projectId);
    if (!absPath) return { fileExists: false, blockContent: null };
    let raw: string | null = null;
    try {
      raw = await this.fs.readFileIfExists(absPath);
    } catch {
      return { fileExists: false, blockContent: null };
    }
    if (raw === null) return { fileExists: false, blockContent: null };
    const parsed = this.engine.parse(raw);
    const span = parsed.blocks.find(
      (b) => b.id === AGENTS_PROJECT_PROMPT_BLOCK_ID,
    );
    return { fileExists: true, blockContent: span?.inner ?? null };
  }

  /** 从原文移除指定受管区块（含标记行），其余字节不变 */
  private removeBlock(raw: string): string {
    const parsed = this.engine.parse(raw);
    const span = parsed.blocks.find(
      (b) => b.id === AGENTS_PROJECT_PROMPT_BLOCK_ID,
    );
    if (!span) return raw;
    const eol = this.engine.detectEol(raw);
    let out = raw.slice(0, span.start) + raw.slice(span.end);
    // 清掉区块移除后遗留的多余空行
    out = out.replace(
      new RegExp(`(?:${eol === '\r\n' ? '\\r?\\n' : '\\n'}){3,}$`, 'g'),
      `${eol}${eol}`,
    );
    return out;
  }
}

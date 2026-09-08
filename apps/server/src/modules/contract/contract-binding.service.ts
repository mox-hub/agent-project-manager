import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ContractEngineService } from './contract-engine.service';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from './contract-workspace-fs';

/** 托管区间在 DB 侧的真相记录（binding.managedBlocks JSON 元素） */
export interface ManagedBlockRecord {
  id: string;
  source: string;
  generator: string; // 如 seed:v1
}

/** Prisma Json 列写入转换（interface 数组缺 index signature，需显式归一） */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const CONTRACT_FILE_TYPES = [
  'agents',
  'claude_alias',
  'changelog',
  'readme',
  'docs_dir',
] as const;
export type ContractFileType = (typeof CONTRACT_FILE_TYPES)[number];

export const CONTRACT_SYNC_MODES = ['managed', 'synced', 'detached'] as const;
export type ContractSyncMode = (typeof CONTRACT_SYNC_MODES)[number];

export type ConflictAction = 'accept_file' | 'accept_db' | 'detach';

export interface AlignmentReport {
  state: 'aligned' | 'conflicted' | 'skipped_detached' | 'missing_file';
  diffs?: {
    id: string;
    state: 'equal' | 'file_differs' | 'missing_in_file';
  }[];
  proposalId?: string;
}

@Injectable()
export class ContractBindingService {
  private readonly logger = new Logger(ContractBindingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ContractEngineService,
    private readonly resolver: ContractWorkspaceResolver,
    @Inject(CONTRACT_WORKSPACE_FS) private readonly fs: ContractWorkspaceFs,
  ) {}

  async getBinding(projectId: string, fileType: ContractFileType) {
    return this.prisma.contractFileBinding.findUnique({
      where: { projectId_fileType: { projectId, fileType } },
    });
  }

  listBindings(projectId: string) {
    return this.prisma.contractFileBinding.findMany({
      where: { projectId },
      orderBy: { fileType: 'asc' },
    });
  }

  upsertBinding(input: {
    projectId: string;
    fileType: ContractFileType;
    filePath: string;
    syncMode: ContractSyncMode;
    managedBlocks?: ManagedBlockRecord[];
    truthOwner?: 'file_git' | 'system';
    baseline?: string;
  }) {
    const data = {
      filePath: input.filePath,
      syncMode: input.syncMode,
      managedBlocks: input.managedBlocks
        ? toJson(input.managedBlocks)
        : undefined,
      truthOwner: input.truthOwner ?? 'file_git',
      baseline: input.baseline ?? null,
    };
    return this.prisma.contractFileBinding.upsert({
      where: {
        projectId_fileType: {
          projectId: input.projectId,
          fileType: input.fileType,
        },
      },
      update: data,
      create: { ...data, projectId: input.projectId, fileType: input.fileType },
    });
  }

  /** 三态状态机：任意转换；转入 detached 清冲突态，转入 managed 记录写入者。 */
  async setSyncMode(
    projectId: string,
    fileType: ContractFileType,
    mode: ContractSyncMode,
  ): Promise<void> {
    const binding = await this.getBinding(projectId, fileType);
    if (!binding) {
      throw new NotFoundException(`契约绑定不存在: ${fileType}`);
    }
    const data: Record<string, unknown> = { syncMode: mode };
    if (mode === 'detached') {
      data.conflictState = null;
    }
    await this.prisma.contractFileBinding.update({
      where: { id: binding.id },
      data,
    });
  }

  /**
   * 对齐检查（对齐节拍由 execution 终态钩子驱动，v2 纪要 §6.4）。
   * managed 模式下检出漂移 → 升级 DecisionProposal(kind=contract_conflict)，
   * 绝不静默覆盖；同一绑定存在未决冲突时不再重复建提案。
   */
  async checkAlignment(
    projectId: string,
    fileType: ContractFileType,
  ): Promise<AlignmentReport> {
    const binding = await this.getBinding(projectId, fileType);
    if (!binding) {
      throw new NotFoundException(`契约绑定不存在: ${fileType}`);
    }
    if (binding.syncMode === 'detached') {
      return { state: 'skipped_detached' };
    }

    const root = await this.resolver.resolveRoot(projectId);
    if (!root) return { state: 'missing_file' };
    const raw = await this.fs.readFileIfExists(
      this.resolver.join(root, binding.filePath),
    );
    if (raw === null) return { state: 'missing_file' };

    const expected = this.parseManagedBlocks(binding.managedBlocks);
    const diffs = this.engine.compareManagedBlocks(
      raw,
      expected.map((b) => ({ id: b.id, content: b.source })),
    );
    const drifted = diffs.filter((d) => d.state !== 'equal');

    if (drifted.length === 0) {
      await this.prisma.contractFileBinding.update({
        where: { id: binding.id },
        data: { baseline: this.engine.checksum(raw), conflictState: null },
      });
      return { state: 'aligned', diffs };
    }

    if (binding.syncMode === 'managed') {
      if (binding.conflictState !== 'conflicted') {
        const proposalId = await this.escalateConflict(
          binding.id,
          binding.projectId,
          binding.filePath,
          diffs,
          expected,
        );
        return { state: 'conflicted', diffs, proposalId };
      }
      return { state: 'conflicted', diffs };
    }
    return { state: 'conflicted', diffs };
  }

  /**
   * 冲突裁决执行（binding 侧数据动作）。对应 DecisionProposal 的提案闭环
   * 由 decision 模块流程驱动后调用本方法；V1 由调用方负责提案状态收口。
   */
  async resolveConflict(
    bindingId: string,
    action: ConflictAction,
  ): Promise<void> {
    const binding = await this.prisma.contractFileBinding.findUnique({
      where: { id: bindingId },
    });
    if (!binding) throw new NotFoundException(`契约绑定不存在: ${bindingId}`);

    if (action === 'detach') {
      await this.prisma.contractFileBinding.update({
        where: { id: bindingId },
        data: { syncMode: 'detached', conflictState: null },
      });
      return;
    }

    const root = await this.resolver.resolveRoot(binding.projectId);
    if (!root) throw new Error(`项目 ${binding.projectId} 无可用工作区根`);
    const absPath = this.resolver.join(root, binding.filePath);
    const raw = await this.fs.readFileIfExists(absPath);
    if (raw === null) throw new Error(`契约文件缺失: ${binding.filePath}`);

    if (action === 'accept_file') {
      // 采纳文件侧：文件现值成为 DB 真相
      const parsed = this.engine.parse(raw);
      const managedBlocks = this.parseManagedBlocks(binding.managedBlocks)
        .map((record) => {
          const span = parsed.blocks.find((b) => b.id === record.id);
          return span ? { ...record, source: span.inner } : record;
        })
        .filter((record) => parsed.blocks.some((b) => b.id === record.id));
      await this.prisma.contractFileBinding.update({
        where: { id: bindingId },
        data: {
          managedBlocks: toJson(managedBlocks),
          baseline: this.engine.checksum(raw),
          conflictState: null,
          lastWriter: 'file',
        },
      });
      return;
    }

    // accept_db：DB 真相写回文件
    const expected = this.parseManagedBlocks(binding.managedBlocks);
    const next = this.engine.applyManagedBlocks(
      raw,
      expected.map((b) => ({ id: b.id, content: b.source })),
    );
    await this.fs.writeFile(absPath, next);
    await this.prisma.contractFileBinding.update({
      where: { id: bindingId },
      data: {
        baseline: this.engine.checksum(next),
        conflictState: null,
        lastWriter: 'system',
      },
    });
  }

  private async escalateConflict(
    bindingId: string,
    projectId: string,
    filePath: string,
    diffs: ReturnType<ContractEngineService['compareManagedBlocks']>,
    expected: ManagedBlockRecord[],
  ): Promise<string> {
    const expectedById = new Map(expected.map((b) => [b.id, b.source]));
    const proposal = await this.prisma.decisionProposal.create({
      data: {
        kind: 'contract_conflict',
        projectId,
        title: `契约托管区冲突：${filePath}`,
        detail:
          'managed 模式下托管区间在文件侧被直接修改。请裁决：采纳文件侧 / 采纳平台侧 / 解绑。',
        payload: {
          bindingId,
          filePath,
          blocks: diffs.map((d) => ({
            id: d.id,
            state: d.state,
            fileSide: d.fileSide ?? null,
            dbSide: expectedById.get(d.id) ?? null,
          })),
        },
        proposerType: 'system',
        proposerId: 'apm:contract',
      },
    });
    await this.prisma.contractFileBinding.update({
      where: { id: bindingId },
      data: { conflictState: 'conflicted', lastWriter: 'file' },
    });
    this.logger.warn(`契约托管区冲突已升级为提案 ${proposal.id}: ${filePath}`);
    return proposal.id;
  }

  private parseManagedBlocks(value: unknown): ManagedBlockRecord[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (v): v is ManagedBlockRecord =>
        typeof v === 'object' &&
        v !== null &&
        typeof (v as ManagedBlockRecord).id === 'string' &&
        typeof (v as ManagedBlockRecord).source === 'string',
    );
  }
}

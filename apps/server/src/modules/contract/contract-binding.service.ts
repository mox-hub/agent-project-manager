import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ContractEngineService } from './contract-engine.service';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from './contract-workspace-fs';
import { QuickJudgeService } from '../ai-hub/quick-judge/quick-judge.service';
import {
  contractDriftQuestions,
  extractContractDrift,
} from '../ai-hub/quick-judge/judge-scenarios';

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
  state:
    | 'aligned'
    | 'conflicted'
    | 'skipped_detached'
    | 'missing_file'
    | 'aligned_with_drift';
  diffs?: {
    id: string;
    state: 'equal' | 'file_differs' | 'missing_in_file';
  }[];
  proposalId?: string;
  /** CAP-A-27 P1-D：AI 漂移语义判定（advisory）——benign 降级时不建卡仅记事件 */
  aiImpact?: {
    impact: 'benign' | 'semantic-break' | 'formatting-only';
    confidence: number | null;
    model: string;
  };
}

@Injectable()
export class ContractBindingService {
  private readonly logger = new Logger(ContractBindingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ContractEngineService,
    private readonly resolver: ContractWorkspaceResolver,
    @Inject(CONTRACT_WORKSPACE_FS) private readonly fs: ContractWorkspaceFs,
    private readonly messageBus: MessageBusService,
    private readonly quickJudge: QuickJudgeService,
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

    // 派生型绑定（无托管区间，如 CHANGELOG 导出）：整文件指纹比对
    if (expected.length === 0) {
      const intact = binding.baseline === this.engine.checksum(raw);
      if (intact) return { state: 'aligned', diffs: [] };
      if (binding.syncMode === 'managed') {
        if (binding.conflictState !== 'conflicted') {
          const proposalId = await this.escalateDerivedConflict(
            binding.id,
            binding.projectId,
            binding.filePath,
          );
          return { state: 'conflicted', diffs: [], proposalId };
        }
        return { state: 'conflicted', diffs: [] };
      }
      return { state: 'conflicted', diffs: [] };
    }

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
        // CAP-A-27 P1-D：升级前 AI 语义判定（advisory）——benign 且高置信仅记
        // 事件不建卡（漂移事实仍在，下轮对齐会再检出再判，成本可忽略）；
        // judge 失败/未启用（null）→ 照旧升级，行为与现状一致。
        const aiImpact = await this.judgeDriftImpact(binding, diffs, expected);
        if (
          aiImpact?.impact === 'benign' &&
          (aiImpact.confidence ?? 0) >= 0.85
        ) {
          this.messageBus.publish('contract.drift.benign', {
            bindingId: binding.id,
            projectId: binding.projectId,
            filePath: binding.filePath,
            driftedBlocks: drifted.map((d) => d.id),
            impact: aiImpact.impact,
            confidence: aiImpact.confidence,
            model: aiImpact.model,
          });
          this.logger.log(
            `契约漂移判为 benign（conf ${aiImpact.confidence}），降级不建卡: ${binding.filePath}`,
          );
          return { state: 'aligned_with_drift', diffs, aiImpact };
        }
        const proposalId = await this.escalateConflict(
          binding.id,
          binding.projectId,
          binding.filePath,
          diffs,
          expected,
          aiImpact,
        );
        return {
          state: 'conflicted',
          diffs,
          proposalId,
          aiImpact: aiImpact ?? undefined,
        };
      }
      return { state: 'conflicted', diffs };
    }
    return { state: 'conflicted', diffs };
  }

  /**
   * P1-D：漂移语义判定（quick-judge advisory）。state 只含系统结构化内容
   * （托管区间 DB 侧真相 + 文件侧 diff），失败/未启用返回 null。
   */
  private async judgeDriftImpact(
    binding: { id: string; filePath: string },
    diffs: ReturnType<ContractEngineService['compareManagedBlocks']>,
    expected: ManagedBlockRecord[],
  ): Promise<AlignmentReport['aiImpact'] | null> {
    try {
      const expectedById = new Map(expected.map((b) => [b.id, b.source]));
      const state = diffs
        .filter((d) => d.state !== 'equal')
        .map((d) => {
          const truncated = (s: string | null | undefined, n = 1500) =>
            String(s ?? '').slice(0, n);
          if (d.state === 'missing_in_file') {
            return `【托管区间 ${d.id}】文件侧缺失。\nDB 侧期望：\n${truncated(expectedById.get(d.id))}`;
          }
          return `【托管区间 ${d.id}】\nDB 侧期望：\n${truncated(expectedById.get(d.id))}\n文件侧实际：\n${truncated(d.fileSide)}`;
        })
        .join('\n\n');
      if (!state) return null;
      const result = await this.quickJudge.judge(
        'contract_drift',
        `契约文件：${binding.filePath}\n\n检出偏差：\n${state}`,
        contractDriftQuestions(),
      );
      if (!result) return null;
      const j = extractContractDrift(result.answers);
      if (!j.impact) return null;
      return {
        impact: j.impact,
        confidence: j.confidence,
        model: result.model,
      };
    } catch (err) {
      this.logger.warn(
        `AI 漂移判定失败（照旧升级）: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
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
      // 采纳文件侧：文件现值成为 DB 真相（派生型绑定即认可手改版为新基线）
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
    if (expected.length === 0) {
      // 派生型绑定（CHANGELOG 等）的「采纳平台侧」= 重新导出，
      // 由导出方（ReleaseService.exportChangelog）执行并经
      // recordDerivedExport 记基线，此处不代写文件。
      throw new Error(
        `派生型绑定 ${binding.filePath} 请通过重新导出恢复平台真相`,
      );
    }
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

  /** 派生型文件导出后由导出方调用：记录新基线并清除冲突态。 */
  async recordDerivedExport(
    projectId: string,
    fileType: ContractFileType,
    fileChecksum: string,
  ): Promise<void> {
    const binding = await this.getBinding(projectId, fileType);
    if (!binding) return;
    await this.prisma.contractFileBinding.update({
      where: { id: binding.id },
      data: {
        baseline: fileChecksum,
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
    aiImpact?: AlignmentReport['aiImpact'] | null,
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
          // CAP-A-27 P2-G：AI 参考槽——有判定（semantic-break/formatting-only/
          // 低置信 benign）时随卡带给决策者参考；benign 高置信根本不建卡
          ...(aiImpact
            ? {
                aiSuggestion: {
                  ...aiImpact,
                  judgedAt: new Date().toISOString(),
                },
              }
            : {}),
        },
        proposerType: 'system',
        proposerId: 'apm:contract',
      },
    });
    await this.prisma.contractFileBinding.update({
      where: { id: bindingId },
      data: { conflictState: 'conflicted', lastWriter: 'file' },
    });
    // P1-10：与 ProposalService.create 同事件同形态——冲突裁决卡此前直写零发布，
    // 待批卡静默堆积（通知订阅 + 网关徽标均感知不到）
    this.messageBus.publish('decision.proposal.created', {
      proposalId: proposal.id,
      kind: proposal.kind,
      title: proposal.title,
      projectId: proposal.projectId,
      issueId: proposal.issueId,
    });
    this.logger.warn(`契约托管区冲突已升级为提案 ${proposal.id}: ${filePath}`);
    return proposal.id;
  }

  /** 派生型绑定（无托管区间）冲突升级：整文件指纹失配，裁决 = 重新导出/认可手改/解绑 */
  private async escalateDerivedConflict(
    bindingId: string,
    projectId: string,
    filePath: string,
  ): Promise<string> {
    const proposal = await this.prisma.decisionProposal.create({
      data: {
        kind: 'contract_conflict',
        projectId,
        title: `派生契约文件被手改：${filePath}`,
        detail:
          '该文件由平台派生（真相在 DB）。请裁决：重新导出（采纳平台侧）/ 认可手改版 / 解绑。',
        payload: { bindingId, filePath, derived: true },
        proposerType: 'system',
        proposerId: 'apm:contract',
      },
    });
    await this.prisma.contractFileBinding.update({
      where: { id: bindingId },
      data: { conflictState: 'conflicted', lastWriter: 'file' },
    });
    this.messageBus.publish('decision.proposal.created', {
      proposalId: proposal.id,
      kind: proposal.kind,
      title: proposal.title,
      projectId: proposal.projectId,
      issueId: proposal.issueId,
    });
    this.logger.warn(
      `派生契约文件冲突已升级为提案 ${proposal.id}: ${filePath}`,
    );
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

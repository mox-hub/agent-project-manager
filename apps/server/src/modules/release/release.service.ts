import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import {
  ContractBindingService,
  ContractFileType,
} from '../contract/contract-binding.service';
import { ContractEngineService } from '../contract/contract-engine.service';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from '../contract/contract-workspace-fs';
import {
  ReleaseGateService,
  type GateCheck,
  type GateResult,
} from './release-gate.service';
import { ReleaseVersionService } from './release-version.service';
import { assertReleaseTransition } from './release-status';
import {
  ReleaseDeliverableItemDto,
  ReleaseDeliverablesDto,
} from './dto/release.dto';
import type { Release as ReleaseModel, Prisma } from '@prisma/client';

export const CHANGELOG_FILE_PATH = 'CHANGELOG.md';

/**
 * 交付成果清单元素必填口径（CAP-K-03 批二）：
 * name（交付了什么）/ location（在哪拿）/ howToVerify（怎么验证可用）trim 后非空；
 * limitations（限制或已知问题）/ receiver（接收人）可选。空数组 = 清空清单，合法。
 */
export function assertDeliverableItems(items: unknown): void {
  if (!Array.isArray(items)) {
    throw new BadRequestException('交付成果清单须为数组');
  }
  const required = ['name', 'location', 'howToVerify'] as const;
  items.forEach((item, index) => {
    const row = item as Record<string, unknown> | null;
    for (const field of required) {
      const value = row?.[field];
      if (typeof value !== 'string' || value.trim() === '') {
        throw new BadRequestException(
          `交付成果第 ${index + 1} 项缺少必填字段「${field}」`,
        );
      }
    }
  });
}

/** Release 关联轻量投影（CAP-A-16 计划-交付轴 + 绑定关系可读名）：所属项目与里程碑摘要 */
const RELEASE_INCLUDE = {
  project: { select: { id: true, name: true } },
  milestone: { select: { id: true, name: true, status: true } },
} satisfies Prisma.ReleaseInclude;

export interface CreateReleaseInput {
  projectId: string;
  version: string;
  name?: string;
  notes?: string;
  createdBy: string;
  scopeIssueIds?: string[];
  milestoneId?: string | null;
}

/**
 * 发版服务（契约与文档知识层 v2 纪要切片 1b + CAP-K-03 驱动型发版）。
 * CHANGELOG 真相 = Release 实体集合，文件是单向投影：release.created
 * 事件触发全量再生（DB→文件，绝不反向导入）。
 * 驱动链路：创建草案 → 圈定范围 → 门禁（submitGate）→ 决策卡审批
 * （createApprovalProposal / approve）→ 发布执行（ReleasePublishService）。
 */
@Injectable()
export class ReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly engine: ContractEngineService,
    private readonly bindings: ContractBindingService,
    private readonly resolver: ContractWorkspaceResolver,
    @Inject(CONTRACT_WORKSPACE_FS) private readonly fs: ContractWorkspaceFs,
    private readonly gate: ReleaseGateService,
    private readonly version: ReleaseVersionService,
  ) {}

  async createRelease(input: CreateReleaseInput) {
    try {
      await this.version.assertVersionUsable(input.projectId, input.version);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : String(err),
      );
    }
    if (input.milestoneId) {
      await this.assertMilestoneUsable(input.projectId, input.milestoneId);
    }
    return this.prisma.release.create({
      data: {
        projectId: input.projectId,
        version: input.version,
        name: input.name,
        notes: input.notes,
        createdBy: input.createdBy,
        scope: input.scopeIssueIds
          ? ({ issueIds: input.scopeIssueIds } as Prisma.InputJsonValue)
          : undefined,
        milestoneId: input.milestoneId ?? undefined,
      },
      include: RELEASE_INCLUDE,
    });
  }

  /** 发版列表：projectId 缺省返回全部（CAP-A-15 跨项目发版流水） */
  async listReleases(projectId?: string) {
    return this.prisma.release.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: [{ releasedAt: 'desc' }, { createdAt: 'desc' }],
      include: RELEASE_INCLUDE,
    });
  }

  async getRelease(releaseId: string) {
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
      include: RELEASE_INCLUDE,
    });
    if (!release) throw new NotFoundException(`发版不存在: ${releaseId}`);
    return release;
  }

  /**
   * 更新交付成果清单（CAP-K-03 批二切片）：交付了什么/在哪拿/怎么验证/限制/接收人。
   * 全状态可改（released 后仍可补录交付信息），全量替换并记录操作人与时间。
   * 存储 = 单个 deliverables Json 列：{ items, updatedBy, updatedAt }，不建子表。
   */
  async updateDeliverables(
    releaseId: string,
    items: ReleaseDeliverableItemDto[],
    userId: string,
  ): Promise<ReleaseModel> {
    await this.getRelease(releaseId);
    assertDeliverableItems(items);
    const deliverables: ReleaseDeliverablesDto = {
      items,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    };
    return this.prisma.release.update({
      where: { id: releaseId },
      data: { deliverables: deliverables as unknown as Prisma.InputJsonValue },
      include: RELEASE_INCLUDE,
    });
  }

  /** 里程碑关联校验（CAP-A-16）：存在 + 同项目（跨项目 400） */
  private async assertMilestoneUsable(
    projectId: string,
    milestoneId: string,
  ): Promise<void> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { projectId: true },
    });
    if (!milestone) {
      throw new BadRequestException(`里程碑不存在: ${milestoneId}`);
    }
    if (milestone.projectId !== projectId) {
      throw new BadRequestException('里程碑不属于该项目，跨项目关联被拒绝');
    }
  }

  /** 改草案：仅 draft 可改（版本唯一性/只前滚校验复用） */
  async updateDraft(
    releaseId: string,
    dto: {
      name?: string;
      notes?: string;
      version?: string;
      scopeIssueIds?: string[];
      milestoneId?: string | null;
    },
  ) {
    const release = await this.getRelease(releaseId);
    if (release.status !== 'draft') {
      throw new BadRequestException('仅草案状态可编辑');
    }
    if (dto.version && dto.version !== release.version) {
      try {
        await this.version.assertVersionUsable(
          release.projectId,
          dto.version,
          releaseId,
        );
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : String(err),
        );
      }
    }
    if (dto.milestoneId) {
      await this.assertMilestoneUsable(release.projectId, dto.milestoneId);
    }
    return this.prisma.release.update({
      where: { id: releaseId },
      data: {
        name: dto.name,
        notes: dto.notes,
        version: dto.version,
        scope:
          dto.scopeIssueIds !== undefined
            ? ({ issueIds: dto.scopeIssueIds } as Prisma.InputJsonValue)
            : undefined,
        milestoneId: dto.milestoneId,
      },
      include: RELEASE_INCLUDE,
    });
  }

  /**
   * 提交门禁：draft → 跑门禁聚合（四证据源 + CHANGELOG 一致性追加检查）。
   * 全过 → gated；有拒 → 留 draft 并落 gateResult 快照（前端展示拒因）。
   */
  async submitGate(releaseId: string): Promise<GateResult> {
    const release = await this.getRelease(releaseId);
    assertReleaseTransition(release.status, 'gated');

    const result = await this.gate.runGate(
      release.projectId,
      release.scope as { issueIds?: string[] } | null,
    );
    result.checks.push(await this.checkChangelogConsistency(release));
    result.passed = result.checks.every((c) => c.passed);

    await this.prisma.release.update({
      where: { id: releaseId },
      data: {
        status: result.passed ? 'gated' : 'draft',
        gateResult: result as unknown as Prisma.InputJsonValue,
      },
    });
    return result;
  }

  /** CHANGELOG 一致性（派生文本 vs 工作区文件），依赖本服务故不进 GateService */
  private async checkChangelogConsistency(
    release: ReleaseModel,
  ): Promise<GateCheck> {
    const root = await this.resolver.resolveRoot(release.projectId);
    if (!root) {
      return {
        key: 'changelog',
        label: 'CHANGELOG 一致性',
        passed: true,
        detail: '项目无工作区，发布时将诚实跳过导出',
      };
    }
    const expected = await this.generateChangelog(release.projectId);
    const actual = await this.fs.readFileIfExists(
      this.resolver.join(root, CHANGELOG_FILE_PATH),
    );
    if (actual === null) {
      return {
        key: 'changelog',
        label: 'CHANGELOG 一致性',
        passed: true,
        detail: 'CHANGELOG.md 尚不存在，发布时将首次导出',
      };
    }
    return {
      key: 'changelog',
      label: 'CHANGELOG 一致性',
      passed: actual === expected,
      detail:
        actual === expected
          ? 'CHANGELOG 与发版记录一致'
          : 'CHANGELOG.md 与发版记录不一致——发布将自动再生覆盖，请确认本地无手改',
    };
  }

  /** 创建发布审批决策卡（gated → 待人确认；借鉴 release-please「人确认才发布」） */
  async createApprovalProposal(releaseId: string, userId: string) {
    const release = await this.getRelease(releaseId);
    if (release.status !== 'gated') {
      throw new BadRequestException('仅 gated 状态可发起发布审批');
    }
    const dup = await this.prisma.decisionProposal.findFirst({
      where: {
        kind: 'release',
        status: 'pending',
        payload: { path: '$.releaseId', equals: releaseId },
      },
    });
    if (dup) {
      throw new BadRequestException(`该发版已有待审批决策卡: ${dup.id}`);
    }
    const scope =
      (release.scope as { issueIds?: string[] } | null)?.issueIds ?? [];
    const proposal = await this.prisma.decisionProposal.create({
      data: {
        kind: 'release',
        projectId: release.projectId,
        title: `发布 ${release.version}${release.name ? `「${release.name}」` : ''}`,
        detail: release.notes ?? undefined,
        payload: {
          releaseId,
          version: release.version,
          scopeCount: scope.length,
          gateResult: release.gateResult,
        } as Prisma.InputJsonValue,
        proposerType: 'human',
        proposerId: userId,
        status: 'pending',
      },
    });
    // P1-10：与 ProposalService.create 同事件同 payload 形态——发版审批卡此前
    // 直写零发布，通知订阅（decision.proposal.created → 项目成员）与网关徽标
    // 失效均感知不到，审批卡静默堆积（体验报告 P1-10 主断点）。
    this.messageBus.publish('decision.proposal.created', {
      proposalId: proposal.id,
      kind: proposal.kind,
      title: proposal.title,
      projectId: proposal.projectId,
      issueId: proposal.issueId,
    });
    return proposal;
  }

  /** 审批通过：gated → approved（决策卡 applier 与本方法共用），广播触发自动发布 */
  async approve(releaseId: string, userId: string) {
    const release = await this.getRelease(releaseId);
    assertReleaseTransition(release.status, 'approved');
    const approved = await this.prisma.release.update({
      where: { id: releaseId },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });
    this.messageBus.publish('release.approved', { releaseId });
    return approved;
  }

  /** 打回草案：gated/approved → draft（决策卡 reject 或人工打回） */
  async rejectToDraft(releaseId: string, reason?: string) {
    const release = await this.getRelease(releaseId);
    assertReleaseTransition(release.status, 'draft');
    return this.prisma.release.update({
      where: { id: releaseId },
      data: {
        status: 'draft',
        failureReason: reason ? `已打回: ${reason}` : '已打回',
      },
    });
  }

  /** 失败重开：failed → draft（重走门禁） */
  async reopenDraft(releaseId: string) {
    const release = await this.getRelease(releaseId);
    assertReleaseTransition(release.status, 'draft');
    return this.prisma.release.update({
      where: { id: releaseId },
      data: { status: 'draft', failureReason: null, executionLog: [] },
    });
  }

  /** 版本推荐（conventional commits 机械推断，见 ReleaseVersionService） */
  recommendVersion(projectId: string, excludeReleaseId?: string) {
    return this.version.recommendVersion(projectId, excludeReleaseId);
  }

  /** 从 Release 集合全量生成 CHANGELOG 文本（Keep a Changelog 风格）。 */
  async generateChangelog(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    const releases = await this.listReleases(projectId);
    const lines = [
      '<!-- apm:derived-file:changelog 派生自 Release 实体，请勿手改；发版时自动再生 -->',
      '# Changelog',
      '',
      `${project?.name ?? '项目'}的发版日志。`,
    ];
    for (const release of releases) {
      const date = (release.releasedAt ?? release.createdAt)
        .toISOString()
        .slice(0, 10);
      lines.push('', `## [${release.version}] - ${date}`);
      if (release.name) lines.push('', `**${release.name}**`);
      if (release.notes) {
        lines.push('', release.notes.trimEnd());
      }
    }
    return `${lines.join('\n')}\n`;
  }

  /**
   * CHANGELOG 单向导出：无工作区则诚实跳过；写文件后经
   * recordDerivedExport 记录基线（冲突检测 = 整文件指纹）。
   */
  async exportChangelog(projectId: string): Promise<{
    exported: boolean;
    reason?: string;
    path?: string;
  }> {
    const root = await this.resolver.resolveRoot(projectId);
    if (!root) return { exported: false, reason: 'no_workspace' };
    const content = await this.generateChangelog(projectId);
    await this.fs.writeFile(
      this.resolver.join(root, CHANGELOG_FILE_PATH),
      content,
    );
    await this.bindings.upsertBinding({
      projectId,
      fileType: 'changelog' as ContractFileType,
      filePath: CHANGELOG_FILE_PATH,
      syncMode: 'managed',
      truthOwner: 'system',
      baseline: this.engine.checksum(content),
    });
    await this.bindings.recordDerivedExport(
      projectId,
      'changelog' as ContractFileType,
      this.engine.checksum(content),
    );
    return { exported: true, path: CHANGELOG_FILE_PATH };
  }
}

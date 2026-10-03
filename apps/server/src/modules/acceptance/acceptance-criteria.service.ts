import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { CreateCriteriaDto } from './dto/acceptance.dto';
import { QuickJudgeService } from '@/modules/ai-hub/quick-judge/quick-judge.service';
import {
  evidencePrecheckQuestions,
  extractEvidencePrecheck,
} from '@/modules/ai-hub/quick-judge/judge-scenarios';

/**
 * 证据有效性判定（CAP-B-01 口径，唯一真相）：
 * 证据创建时快照当时所属标准的 revision（criteriaRevision），
 * 与标准当前 revision 一致即有效；存量证据无快照（null）按 1（初版）处理。
 */
export function isEvidenceCurrent(
  evidence: { criteriaRevision?: number | null },
  criteriaRevision: number,
): boolean {
  return (evidence.criteriaRevision ?? 1) === criteriaRevision;
}

@Injectable()
export class AcceptanceCriteriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly quickJudge: QuickJudgeService,
  ) {
    this.logger.setContext('AcceptanceCriteriaService');
  }

  /**
   * 为验收契约添加标准
   */
  async create(acceptanceId: string, dto: CreateCriteriaDto) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    }

    // 获取当前最大 order
    const maxOrder = await this.prisma.acceptanceCriteria.aggregate({
      where: { acceptanceId },
      _max: { order: true },
    });

    return this.prisma.acceptanceCriteria.create({
      data: {
        acceptanceId,
        criteriaType: dto.criteriaType,
        category: dto.category,
        content: dto.content,
        source: dto.source || 'manual',
        weight: dto.weight || 1,
        severity: dto.severity || 'medium',
        order: dto.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  /**
   * 批量添加标准
   */
  async createMany(acceptanceId: string, criteria: CreateCriteriaDto[]) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    }

    const maxOrder = await this.prisma.acceptanceCriteria.aggregate({
      where: { acceptanceId },
      _max: { order: true },
    });

    let orderOffset = (maxOrder._max.order ?? -1) + 1;

    const created = await Promise.all(
      criteria.map((c) =>
        this.prisma.acceptanceCriteria.create({
          data: {
            acceptanceId,
            criteriaType: c.criteriaType,
            category: c.category,
            content: c.content,
            source: c.source || 'manual',
            weight: c.weight || 1,
            severity: c.severity || 'medium',
            order: c.order ?? orderOffset++,
          },
        }),
      ),
    );

    return created;
  }

  /**
   * 更新标准。状态判定时自动落一条 human_approval 证据（userId 存在时）。
   *
   * CAP-B-01 修订即失效：实质内容字段（content）被修改时
   * revision+1、revisedAt 落时间、status 重置回 pending、passedAt 清空——
   * 既有证据不删除，但有效性按 isEvidenceCurrent 判定，旧版证据转为「待复核」。
   * 同一请求若同时携带 content 与 status，以修订失效优先（status 传入被忽略），
   * 避免用旧证据给新版本标准背书。
   */
  async update(
    criteriaId: string,
    data: {
      content?: string;
      status?: string;
      severity?: string;
      order?: number;
    },
    userId?: string,
  ) {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
    });

    if (!criteria) {
      throw new NotFoundException(`Criteria ${criteriaId} not found`);
    }

    // 实质修订判定：仅 content（标准判定性内容本体）触发修订；
    // severity/order/status 属元属性或流转态，变更不构成「标准改写」
    const isSubstantiveRevision =
      data.content !== undefined && data.content !== criteria.content;

    const updateData: any = { ...data };
    if (isSubstantiveRevision) {
      delete updateData.status; // 修订失效优先，忽略同请求的状态直写
      updateData.revision = criteria.revision + 1;
      updateData.revisedAt = new Date();
      updateData.status = 'pending';
      updateData.passedAt = null;
    } else if (data.status === 'passed') {
      updateData.passedAt = new Date();
    }

    const updated = await this.prisma.acceptanceCriteria.update({
      where: { id: criteriaId },
      data: updateData,
    });

    if (!isSubstantiveRevision && data.status && userId) {
      await this.prisma.acceptanceEvidence.create({
        data: {
          criteriaId,
          evidenceType: 'human_approval',
          content: `人工判定为 ${data.status}`,
          submittedBy: userId,
          criteriaRevision: updated.revision,
        },
      });
    }

    return updated;
  }

  /**
   * 为标准追加验收证据（CI/PR/模型/人工）
   */
  async addEvidence(
    criteriaId: string,
    dto: {
      evidenceType: string;
      content?: string;
      storageRef?: string;
      metadata?: Record<string, unknown>;
    },
    userId: string,
  ) {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
    });
    if (!criteria) {
      throw new NotFoundException(`Criteria ${criteriaId} not found`);
    }

    return this.prisma.acceptanceEvidence.create({
      data: {
        criteriaId,
        evidenceType: dto.evidenceType,
        content: dto.content,
        storageRef: dto.storageRef,
        submittedBy: userId,
        // CAP-B-01：证据创建时快照当前标准版本，修订后旧证据自动转「待复核」
        criteriaRevision: criteria.revision,
        metadata: dto.metadata as any,
      },
    });
  }

  /**
   * AI 证据预审（CAP-A-27，advisory）：对一条回流证据跑判断模型初审，
   * 结论落 `model_evaluation` 类型证据（metadata.advisory=true）仅供验收面板
   * 展示——**不改 acceptCompletion 判定权、不给标准打 passed/failed**。
   * 防重键 = 证据类型+内容（回流有 content 级去重，同内容只预审一次）。
   * 调用方（证据回流订阅器）以 fire-and-forget 挂载；judge 失败/未启用时静默返回。
   */
  async runAiEvidencePrecheck(
    criteriaId: string,
    sourceEvidence: { evidenceType: string; content: string },
  ): Promise<void> {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
      select: { content: true, revision: true },
    });
    if (!criteria) return;

    const precheckKey = `${sourceEvidence.evidenceType}:${sourceEvidence.content}`;
    // SQLite 的 Prisma JSON path 数组过滤不可用，防重在内存做（单标准预审证据量小）
    const prechecks = await this.prisma.acceptanceEvidence.findMany({
      where: { criteriaId, evidenceType: 'model_evaluation' },
      select: { metadata: true },
    });
    if (
      prechecks.some(
        (p) =>
          (p.metadata as Record<string, unknown> | null)?.precheckKey ===
          precheckKey,
      )
    ) {
      return;
    }

    const state = [
      `验收标准：${criteria.content}`,
      `证据（${sourceEvidence.evidenceType}）：${sourceEvidence.content}`,
    ].join('\n');

    const result = await this.quickJudge.judge(
      'evidence_precheck',
      state,
      evidencePrecheckQuestions(),
    );
    if (!result) return;
    const judgement = extractEvidencePrecheck(result.answers);
    if (!judgement.verdict) return;

    await this.prisma.acceptanceEvidence.create({
      data: {
        criteriaId,
        evidenceType: 'model_evaluation',
        content: `AI 预审：${judgement.verdict}`,
        submittedBy: 'system',
        criteriaRevision: criteria.revision,
        metadata: {
          advisory: true,
          precheckKey,
          sourceEvidenceType: sourceEvidence.evidenceType,
          confidence: judgement.confidence,
          probabilities: judgement.probabilities,
          evidenceSufficient: judgement.evidenceSufficient,
          model: result.model,
          judgedAt: new Date().toISOString(),
        } as any,
      },
    });
    this.logger.log(
      `AI evidence precheck attached to criteria ${criteriaId} (verdict: ${judgement.verdict})`,
    );
  }

  /**
   * 删除标准
   */
  async delete(criteriaId: string) {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
    });

    if (!criteria) {
      throw new NotFoundException(`Criteria ${criteriaId} not found`);
    }

    await this.prisma.acceptanceCriteria.delete({
      where: { id: criteriaId },
    });
  }

  /**
   * 获取验收的所有标准
   */
  async findByAcceptance(acceptanceId: string) {
    return this.prisma.acceptanceCriteria.findMany({
      where: { acceptanceId },
      orderBy: { order: 'asc' },
      include: {
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * 获取标准详情
   */
  async findOne(criteriaId: string) {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
      include: {
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
        acceptance: {
          select: { id: true, issueId: true },
        },
      },
    });

    if (!criteria) {
      throw new NotFoundException(`Criteria ${criteriaId} not found`);
    }

    return criteria;
  }

  /**
   * 批量更新标准状态
   */
  async updateStatus(criteriaIds: string[], status: string) {
    const updateData = criteriaIds.map((id, _index) => ({
      id,
      status,
      passedAt: status === 'passed' ? new Date() : undefined,
    }));

    return Promise.all(
      updateData.map((data) =>
        this.prisma.acceptanceCriteria.update({
          where: { id: data.id },
          data: {
            status: data.status,
            passedAt: data.passedAt,
          },
        }),
      ),
    );
  }
}

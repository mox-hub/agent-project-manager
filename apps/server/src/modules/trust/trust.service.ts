/**
 * Trust Service - 信任档案与评估管道
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import {
  PR_OUTCOME_DELTAS,
  type GitHubPrState,
} from '@/modules/integration/providers/github/github.constants';

// ==================== CAP-B-07 三级授权口径（P2-21 门禁共用） ====================

/** 三级等级名（与前端 shared/member MEMBER_TRUST_TIERS、i18n trust.tierN 对齐） */
export const TRUST_TIER_NAMES: Record<number, string> = {
  1: '观察者',
  2: '协助者',
  3: '受托者',
};

/**
 * 自动派发门槛等级 = 协助者（2）。
 * 口径出处：docs/roadmap/experience-report-2026-09-20.md §八第三批 9
 * 「信任等级接门禁（协助者以上才可自动派发等），兑现三级授权」；
 * docs/01-需求/能力清单-v1.md §4.2 CAP-B-07（2026-09-18 三级裁决）。
 */
export const TRUST_DISPATCH_MIN_LEVEL = 2;

/**
 * 旧五档（L0-L4）存量归一：与前端 shared/member normalizeTrustLevel 同口径——
 * >=4 归受托者（3）；1-3 原样；0/负数/非有限数值视为未评估（null，fail-open）。
 */
export function normalizeTrustLevel(
  level: number | null | undefined,
): number | null {
  if (level === null || level === undefined || !Number.isFinite(level)) {
    return null;
  }
  if (level >= 4) return 3;
  if (level >= 1) return level;
  return null;
}

/** 自动派发门禁判定结果 */
export interface AutoDispatchDecision {
  allowed: boolean;
  /** allowed=false 时的原因；目前唯一拦截分支 = 明确低于门槛（观察者） */
  reason: 'below_threshold' | null;
  /** 归一化后的等级；未评估为 null */
  level: number | null;
  levelName: string | null;
}

/**
 * P2-21：自动派发门禁判定（纯函数，供派发链消费）。
 * - 协助者（2）/ 受托者（3）：可自动派发（协助者产出须人验收、受托者可自行重试，
 *   由验收/评估链承载，不在本门禁范围）；
 * - 观察者（1）：不可自动派发（唯一拦截分支）；
 * - 未评估（null：trustLevel 缺失 / 旧档越界）：放行——存量兼容铁律，
 *   由调用方在工单时间线记提示，绝不因等级拿不到卡死存量自动派发。
 */
export function evaluateAutoDispatchPermission(
  trustLevel: number | null | undefined,
): AutoDispatchDecision {
  const level = normalizeTrustLevel(trustLevel);
  if (level === null) {
    return { allowed: true, reason: null, level: null, levelName: null };
  }
  if (level >= TRUST_DISPATCH_MIN_LEVEL) {
    return {
      allowed: true,
      reason: null,
      level,
      levelName: TRUST_TIER_NAMES[level] ?? null,
    };
  }
  return {
    allowed: false,
    reason: 'below_threshold',
    level,
    levelName: TRUST_TIER_NAMES[level] ?? null,
  };
}

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  /**
   * FR-TRUST-01: 获取或创建信任档案
   */
  async getOrCreateProfile(agentId: string, projectId?: string) {
    let profile = await this.prisma.appConfig.findFirst({
      where: {
        key: `trust.profile.${agentId}`,
        projectId: projectId ?? null,
        scope: 'trust.profile',
      },
    });

    if (!profile) {
      profile = await this.prisma.appConfig.create({
        data: {
          key: `trust.profile.${agentId}`,
          value: {
            agentId,
            projectId,
            trustScore: 50,
            // 初始等级与 trustScore 50 按三级映射一致（50 = 协助者）
            trustLevel: this.scoreToLevel(50),
            totalEvaluations: 0,
            successfulEvaluations: 0,
            averageScores: {
              correctness: 50,
              efficiency: 50,
              safety: 50,
              collaboration: 50,
            },
            recentEvaluations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          scope: 'trust.profile',
          projectId: projectId ?? null,
        },
      });
    }

    // 懒迁移：Member 列为空时从档案回填（历史数据字段化）
    await this.syncToMember(agentId, profile.value as any, true);

    return profile.value;
  }

  /**
   * 将信任分同步到 Member.trustScore/trustLevel 列。
   * agentId 不是 Member id 时 no-op；onlyIfNull=true 用于懒迁移回填。
   */
  private async syncToMember(
    agentId: string,
    profile: { trustScore?: number; trustLevel?: number },
    onlyIfNull = false,
  ) {
    try {
      await this.prisma.member.updateMany({
        where: {
          id: agentId,
          ...(onlyIfNull
            ? { OR: [{ trustScore: null }, { trustLevel: null }] }
            : {}),
        },
        data: {
          trustScore: profile.trustScore ?? 50,
          // 等级缺失时按分数三级映射兜底（旧档案缺 trustLevel 字段的边界）
          trustLevel:
            profile.trustLevel ?? this.scoreToLevel(profile.trustScore ?? 50),
        },
      });
    } catch (e) {
      this.logger.warn(`sync trust to member failed: ${(e as Error).message}`);
    }
  }

  /**
   * FR-TRUST-02: 执行评估管道（三层评估）
   */
  async evaluateExecution(dto: {
    executionRunId: string;
    agentId: string;
    projectId: string;
    criteria: {
      correctness: number;
      efficiency: number;
      safety: number;
      collaboration: number;
    };
    outcome: 'success' | 'partial' | 'failure';
  }) {
    const profile = (await this.getOrCreateProfile(
      dto.agentId,
      dto.projectId,
    )) as any;

    // Layer 1: 即时评估
    const immediateScore = this.calculateImmediateScore(dto.criteria);

    // Layer 2: 滚动评估
    const rollingScore = await this.calculateRollingScore(
      dto.agentId,
      dto.projectId,
    );

    // Layer 3: 综合评估
    const comprehensiveScore = this.calculateComprehensiveScore(
      profile,
      immediateScore,
      rollingScore,
    );

    // 更新档案
    const recentEvaluations = profile.recentEvaluations || [];
    const newRecent = [
      {
        ...immediateScore,
        timestamp: new Date().toISOString(),
        outcome: dto.outcome,
      },
      ...recentEvaluations,
    ].slice(0, 50);

    const profileRecord = await this.prisma.appConfig.findFirst({
      where: {
        key: `trust.profile.${dto.agentId}`,
        projectId: dto.projectId ?? null,
        scope: 'trust.profile',
      },
    });

    if (profileRecord) {
      await this.prisma.appConfig.update({
        where: { id: profileRecord.id },
        data: {
          value: {
            ...profile,
            trustScore: comprehensiveScore.total,
            trustLevel: this.scoreToLevel(comprehensiveScore.total),
            totalEvaluations: (profile.totalEvaluations || 0) + 1,
            successfulEvaluations:
              dto.outcome === 'success'
                ? (profile.successfulEvaluations || 0) + 1
                : profile.successfulEvaluations || 0,
            recentEvaluations: newRecent,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }

    // 评估结果写穿到 Member 列（成员卡片/统计直接读列）
    await this.syncToMember(dto.agentId, {
      trustScore: comprehensiveScore.total,
      trustLevel: this.scoreToLevel(comprehensiveScore.total),
    });

    return {
      immediateScore,
      rollingScore,
      comprehensiveScore,
      newTrustLevel: this.scoreToLevel(comprehensiveScore.total),
    };
  }

  /**
   * FR-TRUST-03: 角色驱动评估指标
   */
  getRoleBasedCriteria(role: string) {
    const roleConfigs: Record<string, { weights: any; thresholds: any }> = {
      pm: {
        weights: {
          correctness: 0.2,
          efficiency: 0.15,
          safety: 0.2,
          collaboration: 0.45,
        },
        thresholds: {
          correctness: 70,
          efficiency: 60,
          safety: 75,
          collaboration: 80,
        },
      },
      developer: {
        weights: {
          correctness: 0.35,
          efficiency: 0.25,
          safety: 0.25,
          collaboration: 0.15,
        },
        thresholds: {
          correctness: 75,
          efficiency: 70,
          safety: 70,
          collaboration: 60,
        },
      },
    };

    return (
      roleConfigs[role.toLowerCase()] || {
        weights: {
          correctness: 0.25,
          efficiency: 0.25,
          safety: 0.25,
          collaboration: 0.25,
        },
        thresholds: {
          correctness: 70,
          efficiency: 65,
          safety: 70,
          collaboration: 70,
        },
      }
    );
  }

  /**
   * FR-TRUST-04: 信任分计算与等级升降
   */
  async calculateTrustScore(agentId: string, projectId?: string) {
    const profile = (await this.getOrCreateProfile(agentId, projectId)) as any;
    const recentScores = profile.recentEvaluations?.slice(-10) || [];

    if (recentScores.length === 0) {
      return {
        score: profile.trustScore || 50,
        // 等级缺失时按分数三级映射兜底
        level:
          profile.trustLevel || this.scoreToLevel(profile.trustScore || 50),
      };
    }

    const weights = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
    let totalWeight = 0;
    let weightedSum = 0;

    recentScores.forEach((evaluation: any, index: number) => {
      const weight = weights[index] || 0.1;
      weightedSum += (evaluation.total || 50) * weight;
      totalWeight += weight;
    });

    const score = Math.round(weightedSum / totalWeight);
    const level = this.scoreToLevel(score);

    return { score, level };
  }

  /**
   * FR-TRUST-05: 跨项目信任迁移
   */
  async migrateTrustProfile(
    agentId: string,
    fromProjectId: string,
    toProjectId: string,
    migrationPolicy: 'full' | 'partial' | 'reset' = 'partial',
  ) {
    const sourceProfile = (await this.getOrCreateProfile(
      agentId,
      fromProjectId,
    )) as any;

    let migratedScore = 50;
    if (migrationPolicy === 'full') {
      migratedScore = sourceProfile.trustScore || 50;
    } else if (migrationPolicy === 'partial') {
      migratedScore = Math.round((sourceProfile.trustScore || 50) * 0.7);
    }

    await this.prisma.appConfig.create({
      data: {
        key: `trust.profile.${agentId}`,
        value: {
          agentId,
          projectId: toProjectId,
          trustScore: migratedScore,
          trustLevel: this.scoreToLevel(migratedScore),
          totalEvaluations: 0,
          successfulEvaluations: 0,
          averageScores: {
            correctness: 50,
            efficiency: 50,
            safety: 50,
            collaboration: 50,
          },
          recentEvaluations: [],
          migratedFrom: fromProjectId,
          migrationPolicy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        scope: 'trust.profile',
        projectId: toProjectId,
      },
    });

    this.messageBus.publish('trust.profile.migrated', {
      agentId,
      fromProjectId,
      toProjectId,
      migrationPolicy,
      score: migratedScore,
    });

    return { score: migratedScore, level: this.scoreToLevel(migratedScore) };
  }

  // ==================== 私有方法 ====================

  private calculateImmediateScore(criteria: any): any {
    const weights = {
      correctness: 0.25,
      efficiency: 0.25,
      safety: 0.25,
      collaboration: 0.25,
    };
    const total = Math.round(
      criteria.correctness * weights.correctness +
        criteria.efficiency * weights.efficiency +
        criteria.safety * weights.safety +
        criteria.collaboration * weights.collaboration,
    );
    return { ...criteria, total };
  }

  private async calculateRollingScore(
    agentId: string,
    projectId?: string,
  ): Promise<any> {
    const profile = (await this.getOrCreateProfile(agentId, projectId)) as any;
    const recent = (profile.recentEvaluations || []).slice(-5);

    if (recent.length === 0) {
      return {
        correctness: 50,
        efficiency: 50,
        safety: 50,
        collaboration: 50,
        total: 50,
      };
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const correctnessArr = recent.map((e: any) => e.correctness || 50);
    const efficiencyArr = recent.map((e: any) => e.efficiency || 50);
    const safetyArr = recent.map((e: any) => e.safety || 50);
    const collaborationArr = recent.map((e: any) => e.collaboration || 50);
    const totalArr = recent.map((e: any) => e.total || 50);

    return {
      correctness: Math.round(avg(correctnessArr)),
      efficiency: Math.round(avg(efficiencyArr)),
      safety: Math.round(avg(safetyArr)),
      collaboration: Math.round(avg(collaborationArr)),
      total: Math.round(avg(totalArr)),
    };
  }

  private calculateComprehensiveScore(
    profile: any,
    immediate: any,
    rolling: any,
  ): any {
    const weights = { immediate: 0.4, rolling: 0.35, historical: 0.25 };
    const avgScores = profile.averageScores || {
      correctness: 50,
      efficiency: 50,
      safety: 50,
      collaboration: 50,
    };

    const total = Math.round(
      immediate.total * weights.immediate +
        rolling.total * weights.rolling +
        (profile.trustScore || 50) * weights.historical,
    );

    return {
      correctness: Math.round(
        immediate.correctness * weights.immediate +
          rolling.correctness * weights.rolling +
          avgScores.correctness * weights.historical,
      ),
      efficiency: Math.round(
        immediate.efficiency * weights.immediate +
          rolling.efficiency * weights.rolling +
          avgScores.efficiency * weights.historical,
      ),
      safety: Math.round(
        immediate.safety * weights.immediate +
          rolling.safety * weights.rolling +
          avgScores.safety * weights.historical,
      ),
      collaboration: Math.round(
        immediate.collaboration * weights.immediate +
          rolling.collaboration * weights.rolling +
          avgScores.collaboration * weights.historical,
      ),
      total,
    };
  }

  /**
   * V3 阶段2: 将 PR outcome 注入信任评分。
   * 仅作为 correctness 维度的补充信号（不复用作为唯一指标），
   * 其它维度（efficiency/safety/collaboration）保持不动。
   *
   * @param dto.agentId   AI agent id（必填；忽略 PR 无主的情况）
   * @param dto.projectId 本地项目 id
   * @param dto.prState   'open' | 'merged' | 'closed' | 'changes_requested' | 'merged_with_comments'
   * @param dto.source    'webhook' | 'review' | 'manual'
   */
  async applyPrOutcome(dto: {
    agentId?: string;
    projectId?: string;
    prState: GitHubPrState;
    repoFullName: string;
    prNumber: number;
    reviewerLogin?: string;
    source?: 'webhook' | 'review' | 'manual';
  }) {
    if (!dto.agentId || !dto.projectId) {
      this.logger.debug(
        `applyPrOutcome skipped: missing agent/project binding (repo=${dto.repoFullName}#${dto.prNumber})`,
      );
      return { ok: false, reason: 'no-binding' };
    }

    const profile = (await this.getOrCreateProfile(
      dto.agentId,
      dto.projectId,
    )) as any;

    const delta = PR_OUTCOME_DELTAS[dto.prState] ?? 0;
    if (delta === 0) {
      this.logger.debug(`applyPrOutcome: state=${dto.prState} delta=0; noop`);
      return { ok: true, delta: 0 };
    }

    const lastAvg = profile.averageScores || {
      correctness: 50,
      efficiency: 50,
      safety: 50,
      collaboration: 50,
    };

    // correctness 维度应用 delta，其它维度保持
    const updatedAvgScores = {
      correctness: Math.max(0, Math.min(100, lastAvg.correctness + delta)),
      efficiency: lastAvg.efficiency,
      safety: lastAvg.safety,
      collaboration: lastAvg.collaboration,
    };

    const newTrustScore = Math.max(
      0,
      Math.min(100, (profile.trustScore || 50) + delta),
    );
    const newLevel = this.scoreToLevel(newTrustScore);

    const recentEvaluations = profile.recentEvaluations || [];
    const newRecent = [
      {
        dimension: 'correctness',
        delta,
        source: 'pr_outcome',
        sourceRef: `${dto.repoFullName}#${dto.prNumber}`,
        reviewer: dto.reviewerLogin ?? null,
        state: dto.prState,
        timestamp: new Date().toISOString(),
      },
      ...recentEvaluations,
    ].slice(0, 50);

    const profileRecord = await this.prisma.appConfig.findFirst({
      where: {
        key: `trust.profile.${dto.agentId}`,
        projectId: dto.projectId ?? null,
        scope: 'trust.profile',
      },
    });

    if (profileRecord) {
      await this.prisma.appConfig.update({
        where: { id: profileRecord.id },
        data: {
          value: {
            ...profile,
            trustScore: newTrustScore,
            trustLevel: newLevel,
            averageScores: updatedAvgScores,
            recentEvaluations: newRecent,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }

    this.messageBus.publish('trust.pr_outcome.applied', {
      agentId: dto.agentId,
      projectId: dto.projectId,
      prState: dto.prState,
      delta,
      newTrustScore,
      newLevel,
      repoFullName: dto.repoFullName,
      prNumber: dto.prNumber,
      source: dto.source ?? 'webhook',
    });

    return {
      ok: true,
      delta,
      newTrustScore,
      newLevel,
    };
  }

  /**
   * CAP-B-07：信任三级口径（可理解的分级授权，PRD §12 原则 4「渐进放权」）。
   * 1=观察者（<40）仅可读上下文，写操作均须人确认；
   * 2=协助者（40-69）可自动执行常规变更，结果须人验收；
   * 3=受托者（>=70）可自动执行常规变更并自行重试。
   * 红线（发布 / 删除 / 花钱 / 成员与权限变更）任何等级都永远须人确认（本期为展示口径，
   * 门禁联动为后续切片）。与前端 shared/member/trustLevelFromScore 展示映射保持一致。
   * 注意：trustLevel 值域恒为 1-3 整数，仅语义阈值变化，存量数据无需迁移。
   */
  private scoreToLevel(score: number): number {
    if (score >= 70) return 3;
    if (score >= 40) return 2;
    return 1;
  }
}

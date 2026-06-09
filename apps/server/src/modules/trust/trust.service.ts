/**
 * Trust Service - 信任档案与评估管道
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';

@Injectable()
export class TrustService {
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
            trustLevel: 1,
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

    return profile.value;
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
        level: profile.trustLevel || 1,
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

  private scoreToLevel(score: number): number {
    if (score >= 90) return 3;
    if (score >= 70) return 2;
    return 1;
  }
}

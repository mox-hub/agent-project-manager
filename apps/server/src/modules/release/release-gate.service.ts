import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface GateCheck {
  key: 'scope' | 'acceptance' | 'ci' | 'contract' | 'changelog' | 'audit';
  label: string;
  passed: boolean;
  detail: string;
}

export interface GateResult {
  passed: boolean;
  ranAt: string;
  checks: GateCheck[];
}

export interface ReleaseScope {
  issueIds?: string[];
}

/**
 * 发布门禁（CAP-K-03 二期）：只读四证据源，不复制判定逻辑——
 * acceptance=验收证据层、contract=文件绑定层（治理骨架分工），本服务仅消费。
 * CHANGELOG 一致性检查在 ReleaseService.submitGate 追加（依赖本模块派生文本，
 * 放这里会与 ReleaseService 成环）。
 */
@Injectable()
export class ReleaseGateService {
  constructor(private readonly prisma: PrismaService) {}

  async runGate(
    projectId: string,
    scope: ReleaseScope | null,
  ): Promise<GateResult> {
    const checks: GateCheck[] = [];
    const issueIds = scope?.issueIds ?? [];

    checks.push(await this.checkScope(projectId, issueIds));
    checks.push(await this.checkAcceptance(projectId, issueIds));
    checks.push(await this.checkCiEvidence(issueIds));
    checks.push(await this.checkContract(projectId));
    checks.push(await this.checkAudit(issueIds));

    return {
      passed: checks.every((c) => c.passed),
      ranAt: new Date().toISOString(),
      checks,
    };
  }

  /** 范围检查：非空、issue 存在且属于本项目 */
  private async checkScope(
    projectId: string,
    issueIds: string[],
  ): Promise<GateCheck> {
    if (issueIds.length === 0) {
      return {
        key: 'scope',
        label: '发布范围',
        passed: false,
        detail: '发布范围为空——请先圈定纳入本版本的工单',
      };
    }
    const found = await this.prisma.issue.findMany({
      where: { id: { in: issueIds }, projectId },
      select: { id: true },
    });
    const missing = issueIds.filter((id) => !found.some((f) => f.id === id));
    return {
      key: 'scope',
      label: '发布范围',
      passed: missing.length === 0,
      detail:
        missing.length === 0
          ? `范围含 ${issueIds.length} 条工单，全部归属本项目`
          : `以下工单不存在或不属于本项目: ${missing.join('、')}`,
    };
  }

  /** 验收检查：范围内每个工单都有验收单且状态为 passed/waived */
  private async checkAcceptance(
    projectId: string,
    issueIds: string[],
  ): Promise<GateCheck> {
    const acceptances = await this.prisma.acceptance.findMany({
      where: { issueId: { in: issueIds }, issue: { projectId } },
      select: { issueId: true, status: true, title: true },
    });
    const byIssue = new Map<string, string[]>();
    for (const a of acceptances) {
      byIssue.set(a.issueId, [...(byIssue.get(a.issueId) ?? []), a.status]);
    }
    const notDone = issueIds.filter((issueId) => {
      const statuses = byIssue.get(issueId) ?? [];
      return (
        statuses.length === 0 ||
        statuses.some((s) => s !== 'passed' && s !== 'waived')
      );
    });
    return {
      key: 'acceptance',
      label: '验收全绿',
      passed: notDone.length === 0,
      detail:
        notDone.length === 0
          ? `范围内 ${issueIds.length} 条工单验收全部通过或豁免`
          : `以下工单验收未全部通过（passed/waived）: ${notDone.join('、')}`,
    };
  }

  /**
   * CI 证据检查（证据回流 CAP-B-08 一期落点）：范围内存在 conclusion 为
   * 失败态的 ci_result 证据即拒绝；无 CI 证据不阻断（项目可未接 CI），仅注记。
   */
  private async checkCiEvidence(issueIds: string[]): Promise<GateCheck> {
    if (issueIds.length === 0) {
      return {
        key: 'ci',
        label: 'CI 证据',
        passed: false,
        detail: '范围为空，跳过',
      };
    }
    const acceptances = await this.prisma.acceptance.findMany({
      where: { issueId: { in: issueIds } },
      select: { id: true },
    });
    const acceptanceIds = acceptances.map((a) => a.id);
    const evidences = await this.prisma.acceptanceEvidence.findMany({
      where: {
        evidenceType: 'ci_result',
        criteria: { acceptanceId: { in: acceptanceIds } },
      },
      select: { metadata: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const failures = evidences.filter((e) => {
      const meta = (e.metadata ?? {}) as { conclusion?: string };
      return (
        meta.conclusion === 'failure' ||
        meta.conclusion === 'timed_out' ||
        meta.conclusion === 'cancel' ||
        meta.conclusion === 'action_required'
      );
    });
    return {
      key: 'ci',
      label: 'CI 证据',
      passed: failures.length === 0,
      detail:
        failures.length > 0
          ? `存在 ${failures.length} 条失败的 CI 结论证据，请先修复或重跑`
          : evidences.length > 0
            ? `CI 结论证据 ${evidences.length} 条均无失败`
            : '无 CI 证据（未接 CI 或未回流），不阻断',
    };
  }

  /** 契约检查：绑定无 detached（CHANGELOG 一致性由 ReleaseService 追加检查） */
  private async checkContract(projectId: string): Promise<GateCheck> {
    const detached = await this.prisma.contractFileBinding.findFirst({
      where: { projectId, syncMode: 'detached' },
      select: { id: true, filePath: true },
    });
    if (detached) {
      return {
        key: 'contract',
        label: '契约绑定',
        passed: false,
        detail: `存在失联绑定（detached）: ${detached.filePath}，请先重新同步`,
      };
    }
    return {
      key: 'contract',
      label: '契约绑定',
      passed: true,
      detail: '绑定无失联',
    };
  }

  /** 审计检查：范围内验收的完整性审计无 red（未审计不阻断，仅注记） */
  private async checkAudit(issueIds: string[]): Promise<GateCheck> {
    if (issueIds.length === 0) {
      return {
        key: 'audit',
        label: '完整性审计',
        passed: false,
        detail: '范围为空，跳过',
      };
    }
    const reports = await this.prisma.completenessAuditReport.findMany({
      where: { acceptance: { issueId: { in: issueIds } } },
      select: { acceptanceId: true, riskLevel: true },
    });
    const reds = reports.filter((r) => r.riskLevel === 'red');
    return {
      key: 'audit',
      label: '完整性审计',
      passed: reds.length === 0,
      detail:
        reds.length > 0
          ? `${reds.length} 份审计报告存在强阻断项（red），请先补全验收标准`
          : reports.length > 0
            ? `审计报告 ${reports.length} 份，均无强阻断项`
            : '范围内无审计报告（未执行审计），不阻断',
    };
  }
}

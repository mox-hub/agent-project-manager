import { ReleaseGateService } from '../release-gate.service';
import type { ReleaseScope } from '../release-gate.service';

/**
 * 发布门禁聚合（GAP-T-22）：五检查的判定分支——
 * 范围归属 / 验收全绿 / CI 证据失败态 / 契约 detached / 审计 red。
 * Prisma 内存桩，不做第二套业务判定（门禁只读证据）。
 */

class StubPrisma {
  issues: Array<{ id: string; projectId: string }> = [];
  acceptances: Array<{
    id: string;
    issueId: string;
    status: string;
  }> = [];
  evidences: Array<{
    evidenceType: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    criteria: { acceptanceId: string };
  }> = [];
  bindings: Array<{
    projectId: string;
    syncMode: string;
    id: string;
    filePath: string;
  }> = [];
  auditReports: Array<{
    acceptanceId: string;
    riskLevel: string;
  }> = [];

  get issue() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findMany: async ({ where }: any) =>
        svc.issues.filter(
          (i) => where.id.in.includes(i.id) && i.projectId === where.projectId,
        ),
    };
  }

  get acceptance() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findMany: async ({ where }: any) => {
        let rows = svc.acceptances;
        if (where.issueId?.in) {
          rows = rows.filter((a) => where.issueId.in.includes(a.issueId));
        }
        if (where.issue?.projectId) {
          const ids = new Set(
            svc.issues
              .filter((i) => i.projectId === where.issue.projectId)
              .map((i) => i.id),
          );
          rows = rows.filter((a) => ids.has(a.issueId));
        }
        return rows;
      },
    };
  }

  get acceptanceEvidence() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findMany: async ({ where }: any) =>
        svc.evidences.filter(
          (e) =>
            e.evidenceType === where.evidenceType &&
            where.criteria.acceptanceId.in.includes(e.criteria.acceptanceId),
        ),
    };
  }

  get contractFileBinding() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findFirst: async ({ where }: any) =>
        svc.bindings.find(
          (b) =>
            b.projectId === where.projectId && b.syncMode === where.syncMode,
        ) ?? null,
    };
  }

  get completenessAuditReport() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findMany: async ({ where }: any) => {
        const issueIds = new Set(where.acceptance.issueId.in);
        const accIds = new Set(
          svc.acceptances
            .filter((a) => issueIds.has(a.issueId))
            .map((a) => a.id),
        );
        return svc.auditReports.filter((r) => accIds.has(r.acceptanceId));
      },
    };
  }
}

function buildService(prisma: StubPrisma) {
  return new ReleaseGateService(prisma as never);
}

const SCOPE: ReleaseScope = { issueIds: ['i-1', 'i-2'] };

describe('ReleaseGateService 发布门禁（GAP-T-22）', () => {
  it('全绿：范围归属正确 + 验收全 passed/waived + 无失败 CI + 无 detached + 无 red 审计 → passed', async () => {
    const prisma = new StubPrisma();
    prisma.issues = [
      { id: 'i-1', projectId: 'p-1' },
      { id: 'i-2', projectId: 'p-1' },
    ];
    prisma.acceptances = [
      { id: 'a-1', issueId: 'i-1', status: 'passed' },
      { id: 'a-2', issueId: 'i-2', status: 'waived' },
    ];
    const result = await buildService(prisma).runGate('p-1', SCOPE);
    expect(result.passed).toBe(true);
    expect(result.checks.map((c) => c.key)).toEqual([
      'scope',
      'acceptance',
      'ci',
      'contract',
      'audit',
    ]);
  });

  it('范围含他项目工单 → scope 拒绝', async () => {
    const prisma = new StubPrisma();
    prisma.issues = [{ id: 'i-1', projectId: 'p-other' }];
    const result = await buildService(prisma).runGate('p-1', {
      issueIds: ['i-1'],
    });
    const scope = result.checks.find((c) => c.key === 'scope')!;
    expect(result.passed).toBe(false);
    expect(scope.passed).toBe(false);
    expect(scope.detail).toContain('不属于本项目');
  });

  it('范围为空 → scope 拒绝', async () => {
    const result = await buildService(new StubPrisma()).runGate('p-1', null);
    expect(result.passed).toBe(false);
  });

  it('验收未全 passed → acceptance 拒绝（列出未过工单）', async () => {
    const prisma = new StubPrisma();
    prisma.issues = [
      { id: 'i-1', projectId: 'p-1' },
      { id: 'i-2', projectId: 'p-1' },
    ];
    prisma.acceptances = [
      { id: 'a-1', issueId: 'i-1', status: 'passed' },
      { id: 'a-2', issueId: 'i-2', status: 'in_review' },
    ];
    const result = await buildService(prisma).runGate('p-1', SCOPE);
    const acc = result.checks.find((c) => c.key === 'acceptance')!;
    expect(result.passed).toBe(false);
    expect(acc.detail).toContain('i-2');
  });

  it('存在失败结论的 CI 证据 → ci 拒绝；仅有成功结论不阻断', async () => {
    const prisma = new StubPrisma();
    prisma.issues = [{ id: 'i-1', projectId: 'p-1' }];
    prisma.acceptances = [{ id: 'a-1', issueId: 'i-1', status: 'passed' }];
    prisma.evidences = [
      {
        evidenceType: 'ci_result',
        metadata: { conclusion: 'failure' },
        createdAt: new Date(),
        criteria: { acceptanceId: 'a-1' },
      },
    ];
    const failed = await buildService(prisma).runGate('p-1', {
      issueIds: ['i-1'],
    });
    expect(failed.passed).toBe(false);

    prisma.evidences[0]!.metadata = { conclusion: 'success' };
    const ok = await buildService(prisma).runGate('p-1', {
      issueIds: ['i-1'],
    });
    const ci = ok.checks.find((c) => c.key === 'ci')!;
    expect(ci.passed).toBe(true);
  });

  it('无 CI 证据不阻断（未接 CI 项目诚实注记）', async () => {
    const prisma = new StubPrisma();
    prisma.issues = [{ id: 'i-1', projectId: 'p-1' }];
    prisma.acceptances = [{ id: 'a-1', issueId: 'i-1', status: 'passed' }];
    const result = await buildService(prisma).runGate('p-1', {
      issueIds: ['i-1'],
    });
    const ci = result.checks.find((c) => c.key === 'ci')!;
    expect(ci.passed).toBe(true);
    expect(ci.detail).toContain('无 CI 证据');
  });

  it('存在 detached 绑定 → contract 拒绝', async () => {
    const prisma = new StubPrisma();
    prisma.issues = [{ id: 'i-1', projectId: 'p-1' }];
    prisma.acceptances = [{ id: 'a-1', issueId: 'i-1', status: 'passed' }];
    prisma.bindings = [
      {
        projectId: 'p-1',
        syncMode: 'detached',
        id: 'b-1',
        filePath: 'spec.md',
      },
    ];
    const result = await buildService(prisma).runGate('p-1', {
      issueIds: ['i-1'],
    });
    const contract = result.checks.find((c) => c.key === 'contract')!;
    expect(result.passed).toBe(false);
    expect(contract.detail).toContain('detached');
  });

  it('审计有 red → audit 拒绝；未审计不阻断', async () => {
    const prisma = new StubPrisma();
    prisma.issues = [{ id: 'i-1', projectId: 'p-1' }];
    prisma.acceptances = [{ id: 'a-1', issueId: 'i-1', status: 'passed' }];
    prisma.auditReports = [{ acceptanceId: 'a-1', riskLevel: 'red' }];
    const red = await buildService(prisma).runGate('p-1', {
      issueIds: ['i-1'],
    });
    expect(red.passed).toBe(false);

    prisma.auditReports = [];
    const unaudited = await buildService(prisma).runGate('p-1', {
      issueIds: ['i-1'],
    });
    const audit = unaudited.checks.find((c) => c.key === 'audit')!;
    expect(audit.passed).toBe(true);
    expect(audit.detail).toContain('无审计报告');
  });
});

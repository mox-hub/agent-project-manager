import { BadRequestException } from '@nestjs/common';
import { AcceptanceService } from './acceptance.service';

/** CAP-B-01 验收判定接入：接收完成要求每条标准至少一条有效（同版本）证据 */

function buildDeps(prisma: any) {
  const messageBus = { publish: vi.fn(async () => undefined) };
  const proposalService = {
    proposeTaskResolutionIfReady: vi.fn(async () => undefined),
  };
  const service = new AcceptanceService(
    prisma,
    {} as any,
    proposalService as any,
    messageBus as any,
  );
  return { service, messageBus, proposalService };
}

function makeAcceptance(criteria: Array<Record<string, unknown>>) {
  return {
    id: 'acc1',
    issueId: 'iss1',
    status: 'in_review',
    title: '验收 - 导出功能',
    completionType: 'artifact',
    completionEvidence: { artifactId: 'artifact-1' },
    auditReport: { riskLevel: 'green', blockedItems: [] },
    criteria,
  };
}

function buildPrisma(acceptance: Record<string, unknown>) {
  return {
    acceptance: {
      findUnique: vi.fn(async () => acceptance),
      update: vi.fn(async ({ data }: any) => ({ ...acceptance, ...data })),
    },
  };
}

describe('AcceptanceService.acceptCompletion 证据版本门禁（CAP-B-01）', () => {
  it('标准修订后（v2）仅有 v1 旧证据 → ACCEPT_BLOCKED，failures 含 criteriaEvidence', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'pending',
        revision: 2,
        evidences: [{ id: 'e1', criteriaRevision: 1 }],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const err = await service
      .acceptCompletion('acc1', undefined, 'u1')
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const failures = err.response?.failures ?? [];
    const evidenceFailure = failures.find(
      (f: any) => f.check === 'criteriaEvidence',
    );
    expect(evidenceFailure).toBeDefined();
    expect(evidenceFailure.reason).toContain('已修订');
  });

  it('标准修订后有同版本（v2）新证据 → 接收通过（旧证据并存不阻断）', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'pending',
        revision: 2,
        evidences: [
          { id: 'e1', criteriaRevision: 1 },
          { id: 'e2', criteriaRevision: 2 },
        ],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const updated = await service.acceptCompletion('acc1', undefined, 'u1');

    expect(updated.status).toBe('passed');
  });

  it('标准从未有任何证据 → ACCEPT_BLOCKED（缺少有效验收证据）', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'passed',
        revision: 1,
        evidences: [],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const err = await service
      .acceptCompletion('acc1', undefined, 'u1')
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const failures = err.response?.failures ?? [];
    const evidenceFailure = failures.find(
      (f: any) => f.check === 'criteriaEvidence',
    );
    expect(evidenceFailure.reason).toContain('缺少有效验收证据');
  });

  it('存量兼容：证据无版本快照（null）且标准 revision=1 → 视为有效，接收通过', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'passed',
        revision: 1,
        evidences: [{ id: 'e1', criteriaRevision: null }],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const updated = await service.acceptCompletion('acc1', undefined, 'u1');

    expect(updated.status).toBe('passed');
  });
});

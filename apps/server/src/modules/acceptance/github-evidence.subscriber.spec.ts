import { GithubEvidenceSubscriber } from './github-evidence.subscriber';

/** GitHub 事件 → 验收证据回流单测：PR 终态补 completionEvidence + check_run 落 CI 标准证据 */

function buildPrisma() {
  return {
    remotePullRequest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    acceptance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    acceptanceCriteria: {
      findMany: vi.fn(),
    },
    acceptanceEvidence: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
  };
}

describe('GithubEvidenceSubscriber.onPullRequestUpdated', () => {
  const makeSubscriber = () => {
    const prisma = buildPrisma();
    return { prisma, subscriber: new GithubEvidenceSubscriber(prisma as any) };
  };

  it('merged 终态补全 completionEvidence 并保留已有字段', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'https://github.com/o/r/pull/7',
      number: 7,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'pr',
      status: 'in_review',
      completionEvidence: {
        executionRunId: 'run1',
        artifacts: [{ name: 'a' }],
      },
    });

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });

    expect(prisma.acceptance.update).toHaveBeenCalledTimes(1);
    const arg = prisma.acceptance.update.mock.calls[0][0];
    expect(arg.where.id).toBe('acc1');
    expect(arg.data.completionEvidence.state).toBe('merged');
    expect(arg.data.completionEvidence.prUrl).toBe(
      'https://github.com/o/r/pull/7',
    );
    expect(arg.data.completionEvidence.executionRunId).toBe('run1');
    expect(arg.data.completionEvidence.artifacts).toEqual([{ name: 'a' }]);
    expect(arg.data.completionEvidence.prNumber).toBe(7);
  });

  it('已有 prUrl 时不覆盖', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'https://github.com/o/r/pull/7',
      number: 7,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'pr',
      status: 'in_review',
      completionEvidence: { prUrl: 'https://manual.example/pr/7' },
    });

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });

    expect(
      prisma.acceptance.update.mock.calls[0][0].data.completionEvidence.prUrl,
    ).toBe('https://manual.example/pr/7');
  });

  it('非终态 / 无关联 / 非 pr 契约 / 已裁决 均跳过', async () => {
    const { prisma, subscriber } = makeSubscriber();

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'open' });
    expect(prisma.remotePullRequest.findUnique).not.toHaveBeenCalled();

    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: null,
    });
    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });
    expect(prisma.acceptance.findUnique).not.toHaveBeenCalled();

    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'u',
      number: 1,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'artifact',
      status: 'in_review',
      completionEvidence: null,
    });
    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });
    expect(prisma.acceptance.update).not.toHaveBeenCalled();

    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'pr',
      status: 'accepted',
      completionEvidence: null,
    });
    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });
    expect(prisma.acceptance.update).not.toHaveBeenCalled();
  });
});

describe('GithubEvidenceSubscriber.onCheckRunCompleted', () => {
  const makeSubscriber = () => {
    const prisma = buildPrisma();
    return { prisma, subscriber: new GithubEvidenceSubscriber(prisma as any) };
  };

  it('CI 结论落到 source=ci 的标准并写 metadata', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findFirst.mockResolvedValue({
      acceptanceId: 'acc1',
      number: 7,
    });
    prisma.acceptanceCriteria.findMany.mockResolvedValue([
      { id: 'c1' },
      { id: 'c2' },
    ]);
    prisma.acceptanceEvidence.findFirst.mockResolvedValue(null);

    await subscriber.onCheckRunCompleted({
      branch: 'feat/x',
      checkName: 'quality-gate',
      conclusion: 'success',
      sha: 'abc123',
      htmlUrl: 'https://github.com/o/r/actions/run/1',
      repo: 'o/r',
    });

    expect(prisma.remotePullRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ headBranch: 'feat/x' }),
      }),
    );
    expect(prisma.acceptanceEvidence.createMany).toHaveBeenCalledTimes(1);
    const arg = prisma.acceptanceEvidence.createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(2);
    expect(arg.data[0].evidenceType).toBe('ci_result');
    expect(arg.data[0].submittedBy).toBe('system:github-checks');
    expect(arg.data[0].metadata.conclusion).toBe('success');
    expect(arg.data[0].content).toBe('quality-gate:success:abc123');
  });

  it('无分支 / 无关联 PR / 无 ci 标准 / 重复投递 均跳过', async () => {
    const { prisma, subscriber } = makeSubscriber();

    await subscriber.onCheckRunCompleted({
      checkName: 'ci',
      conclusion: 'success',
    });
    expect(prisma.remotePullRequest.findFirst).not.toHaveBeenCalled();

    prisma.remotePullRequest.findFirst.mockResolvedValue(null);
    await subscriber.onCheckRunCompleted({
      branch: 'b',
      checkName: 'ci',
      conclusion: 'success',
    });
    expect(prisma.acceptanceCriteria.findMany).not.toHaveBeenCalled();

    prisma.remotePullRequest.findFirst.mockResolvedValue({
      acceptanceId: 'acc1',
      number: 1,
    });
    prisma.acceptanceCriteria.findMany.mockResolvedValue([]);
    await subscriber.onCheckRunCompleted({
      branch: 'b',
      checkName: 'ci',
      conclusion: 'success',
    });
    expect(prisma.acceptanceEvidence.createMany).not.toHaveBeenCalled();

    prisma.acceptanceCriteria.findMany.mockResolvedValue([{ id: 'c1' }]);
    prisma.acceptanceEvidence.findFirst.mockResolvedValue({ id: 'e1' });
    await subscriber.onCheckRunCompleted({
      branch: 'b',
      checkName: 'ci',
      conclusion: 'success',
      sha: 'abc',
    });
    expect(prisma.acceptanceEvidence.createMany).not.toHaveBeenCalled();
  });
});

import { CliDispatchService } from './dispatch.service';

/**
 * 依赖门禁单测（需求重审 G4，2026-09-17 裁决 A）：
 * 仅 type='blocks' 的依赖参与派发拦截；依赖达成 = 依赖工单状态
 * StatusDefinition.isFinal（终态组口径，不硬编码状态名）；状态定义缺失时
 * 无法断言未达终态，放行（与 issue.service 关单守卫 fail-open 同口径）。
 */
describe('CliDispatchService.assertDependenciesSatisfied', () => {
  function makeService() {
    const prisma = {
      issueDependency: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      statusDefinition: {
        findFirst: vi.fn().mockResolvedValue({ isFinal: true }),
      },
    };
    const svc = new CliDispatchService(
      prisma as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );
    return { svc, prisma };
  }

  const dep = (status: string) => ({
    dependsOnIssue: { id: 'dep-1', title: '前置任务', status, projectId: 'p1' },
  });

  it('无 blocks 依赖时放行', async () => {
    const { svc, prisma } = makeService();
    prisma.issueDependency.findMany.mockResolvedValue([]);
    await expect(
      (svc as any).assertDependenciesSatisfied('i1'),
    ).resolves.toBeUndefined();
    expect(prisma.issueDependency.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { issueId: 'i1', type: 'blocks' } }),
    );
  });

  it('依赖已终态（isFinal）时放行', async () => {
    const s = makeService();
    s.prisma.issueDependency.findMany.mockResolvedValue([dep('done')]);
    s.prisma.statusDefinition.findFirst.mockResolvedValue({ isFinal: true });
    await expect(
      (s.svc as any).assertDependenciesSatisfied('i1'),
    ).resolves.toBeUndefined();
  });

  it('依赖未达终态时阻断并给出可见原因', async () => {
    const s = makeService();
    s.prisma.issueDependency.findMany.mockResolvedValue([dep('in_progress')]);
    s.prisma.statusDefinition.findFirst.mockResolvedValue({ isFinal: false });
    await expect(
      (s.svc as any).assertDependenciesSatisfied('i1'),
    ).rejects.toThrow(/未完成的 blocks 依赖/);
    await expect(
      (s.svc as any).assertDependenciesSatisfied('i1'),
    ).rejects.toThrow(/前置任务/);
  });

  it('状态定义缺失时无法断言未达终态，放行（fail-open 同关单守卫口径）', async () => {
    const s = makeService();
    s.prisma.issueDependency.findMany.mockResolvedValue([dep('custom-x')]);
    s.prisma.statusDefinition.findFirst.mockResolvedValue(null);
    await expect(
      (s.svc as any).assertDependenciesSatisfied('i1'),
    ).resolves.toBeUndefined();
  });

  it('多个未完成依赖全部列入阻断原因', async () => {
    const s = makeService();
    s.prisma.issueDependency.findMany.mockResolvedValue([
      dep('in_progress'),
      {
        dependsOnIssue: {
          id: 'dep-2',
          title: '第二个依赖',
          status: 'planned',
          projectId: 'p1',
        },
      },
    ]);
    s.prisma.statusDefinition.findFirst.mockResolvedValue({ isFinal: false });
    await expect(
      (s.svc as any).assertDependenciesSatisfied('i1'),
    ).rejects.toThrow(/前置任务.*第二个依赖/);
  });
});

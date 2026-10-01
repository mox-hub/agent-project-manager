/**
 * G5-b 派发链隔离注入单测（ADR-017，设计稿 §5.2/§5.3）。
 *
 * 断言口径：worktree 准备成功 → workspaceRoot 三处（cliSession/binding、
 * cliInput、daemon createDispatch）替换为 worktree 路径 + Execution.metadata
 * 落 isolation；失败/非 git/开关关闭 → 降级共享根不阻塞派发。
 * 不 spawn 任何 CLI——executor/runtimeService 均 mock。
 */
import { CliDispatchService } from './dispatch.service';

function buildService(
  options: {
    /** isolation.mode 配置值（appConfig scope=execution 返回） */
    isolationConfig?: unknown;
    isGitRepo?: boolean;
    prepareError?: Error;
    mergeTreeReady?: boolean;
    gitVersion?: string;
  } = {},
) {
  const WORKTREE_PATH = 'E:\\repo\\.apm\\worktrees\\abcd1234';

  const prisma = {
    issue: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'issue_1',
        title: '实现登录页',
        description: '按设计稿实现',
        projectId: 'proj_1',
        aiAgentId: null,
        project: { id: 'proj_1' },
      }),
    },
    projectWorkspace: { findUnique: vi.fn().mockResolvedValue(null) },
    appConfig: {
      // getWorkspaceRoot（git.workspaceRoot）与 isolation.mode 共用 findFirst，
      // 按 scope 区分：scope=execution → 隔离开关；其余（project）→ null
      findFirst: vi
        .fn()
        .mockImplementation(
          async (args: { where?: { scope?: string; key?: string } }) => {
            if (args?.where?.scope === 'execution') {
              return options.isolationConfig === undefined
                ? null
                : { value: options.isolationConfig };
            }
            return null;
          },
        ),
      findMany: vi.fn().mockResolvedValue([]), // 无在线 runtime → 进程内回退
    },
    repository: {
      findFirst: vi.fn().mockResolvedValue({ localPath: 'E:\\repo' }),
    },
    member: { findUnique: vi.fn().mockResolvedValue(null) },
    issueDependency: { findMany: vi.fn().mockResolvedValue([]) },
    execution: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    runtime: { findFirst: vi.fn().mockResolvedValue({ id: 'rt_1' }) },
    cliSession: { create: vi.fn().mockResolvedValue({ id: 'cs_1' }) },
    cliExecutionBinding: { create: vi.fn().mockResolvedValue({}) },
  };

  const executionService = {
    createExecutionRun: vi.fn().mockResolvedValue({
      id: 'exec_abcd1234zzzz',
      subjectType: 'external_agent',
      subjectId: 'user_1',
      projectId: 'proj_1',
      acceptanceId: null,
      metadata: null,
    }),
    updateExecutionRun: vi.fn(),
  };

  const executor = { execute: vi.fn() };
  const registry = { isAvailable: vi.fn().mockReturnValue(true) };
  const cliResolution = { resolveForMember: vi.fn() };
  const contextBuilder = {
    buildTaskExecutionContext: vi.fn().mockResolvedValue({ summary: 'ctx' }),
  };
  const trustService = { evaluateExecution: vi.fn() };
  const acceptanceService = {
    assertDispatchGate: vi.fn().mockResolvedValue('acc-mock'),
  };
  const runtimeService = { createDispatch: vi.fn() };
  const messageBus = { publish: vi.fn() };

  const worktree = {
    isGitRepository: vi.fn().mockResolvedValue(options.isGitRepo ?? false),
    checkMergeTreeSupport: vi.fn().mockResolvedValue({
      ready: options.mergeTreeReady ?? true,
      version: options.gitVersion ?? '2.45.1',
    }),
    prepareWorktree: vi.fn().mockImplementation(
      options.prepareError
        ? async () => {
            throw options.prepareError;
          }
        : async () => ({
            worktreePath: WORKTREE_PATH,
            branch: 'apm/exec/abcd1234',
            baseRef: 'base123sha',
          }),
    ),
  };

  const service = new CliDispatchService(
    prisma as never,
    messageBus as never,
    executionService as never,
    executor as never,
    registry as never,
    cliResolution as never,
    contextBuilder as never,
    trustService as never,
    acceptanceService as never,
    runtimeService as never,
    undefined as never,
    worktree as never,
  );

  return {
    service,
    prisma,
    executionService,
    executor,
    runtimeService,
    worktree,
    WORKTREE_PATH,
  };
}

describe('CliDispatchService 派发隔离注入（G5-b）', () => {
  it('worktree 准备成功：三处 workspaceRoot 替换为 worktree 路径，metadata 落 isolation', async () => {
    const { service, prisma, executor, WORKTREE_PATH } = buildService({
      isGitRepo: true,
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {});
    expect(result.status).toBe('dispatched');

    // 进程内 cliInput 载荷（executor.execute 第二参）
    const cliInput = executor.execute.mock.calls[0][1];
    expect(cliInput.workspaceRoot).toBe(WORKTREE_PATH);
    // cliSession / binding 落 worktree 路径（执行面板回读即所见即所得）
    expect(prisma.cliSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceRoot: WORKTREE_PATH }),
      }),
    );
    expect(prisma.cliExecutionBinding.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceRoot: WORKTREE_PATH }),
      }),
    );
    // metadata.isolation 形状
    expect(prisma.execution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec_abcd1234zzzz' },
        data: {
          metadata: expect.objectContaining({
            isolation: expect.objectContaining({
              mode: 'worktree',
              worktreePath: WORKTREE_PATH,
              branch: 'apm/exec/abcd1234',
              baseRef: 'base123sha',
              projectRoot: 'E:\\repo',
            }),
          }),
        },
      }),
    );
  });

  it('非 git 仓库：降级共享根（reason=not-git-repo），workspaceRoot 不变，派发不阻塞', async () => {
    const { service, prisma, executor } = buildService({
      isGitRepo: false,
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {});
    expect(result.status).toBe('dispatched');

    expect(executor.execute.mock.calls[0][1].workspaceRoot).toBe('E:\\repo');
    expect(prisma.execution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          metadata: expect.objectContaining({
            isolation: { mode: 'shared-root', reason: 'not-git-repo' },
          }),
        },
      }),
    );
  });

  it('开关关闭（isolation.mode=shared-root）：不探测 git，直接降级 disabled', async () => {
    const { service, worktree, executor } = buildService({
      isolationConfig: { mode: 'shared-root' },
      isGitRepo: true,
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {});
    expect(result.status).toBe('dispatched');
    expect(worktree.isGitRepository).not.toHaveBeenCalled();
    expect(executor.execute.mock.calls[0][1].workspaceRoot).toBe('E:\\repo');
  });

  it('worktree add 失败：降级 worktree-add-failed 附原始错误摘要', async () => {
    const { service, prisma, executor } = buildService({
      isGitRepo: true,
      prepareError: new Error('fatal: cannot lock ref'),
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {});
    expect(result.status).toBe('dispatched');
    expect(executor.execute.mock.calls[0][1].workspaceRoot).toBe('E:\\repo');
    expect(prisma.execution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          metadata: expect.objectContaining({
            isolation: {
              mode: 'shared-root',
              reason: 'worktree-add-failed',
              detail: 'fatal: cannot lock ref',
            },
          }),
        },
      }),
    );
  });

  it('git 过旧（merge-tree 不可用）：降级 git-too-old 附版本摘要', async () => {
    const { service, prisma, worktree } = buildService({
      isGitRepo: true,
      mergeTreeReady: false,
      gitVersion: '2.31.0',
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {});
    expect(result.status).toBe('dispatched');
    expect(worktree.prepareWorktree).not.toHaveBeenCalled();
    const updateCall = prisma.execution.update.mock.calls[0][0];
    const isolation = updateCall.data.metadata.isolation;
    expect(isolation.mode).toBe('shared-root');
    expect(isolation.reason).toBe('git-too-old');
    expect(isolation.detail).toContain('2.31.0');
  });
});

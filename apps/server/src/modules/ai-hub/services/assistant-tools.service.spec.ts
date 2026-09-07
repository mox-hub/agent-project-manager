import {
  AssistantToolsService,
  ASSISTANT_TOOL_CATALOG,
} from './assistant-tools.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { IssueService } from '../../issue/issue.service';
import { DocumentService } from '../../document/document.service';
import { MemberService } from '../../team/member.service';
import { TeamService } from '../../team/team.service';
import { ProjectService } from '../../project/project.service';
import { AcceptanceService } from '../../acceptance/acceptance.service';
import { IssueAssigneeService } from '../../team/issue-assignee.service';
import { MemoryService } from '../../memory/memory.service';
import { CollaborationService } from '../../collaboration/collaboration.service';

describe('AssistantToolsService', () => {
  let service: AssistantToolsService;

  const mockPrisma = {
    member: {
      findUnique: jest.fn().mockResolvedValue({ id: 'member-xiaozhou' }),
    },
    issue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    project: { findUnique: jest.fn() },
    decisionProposal: { findMany: jest.fn(), create: jest.fn() },
    document: { findMany: jest.fn() },
  };

  const mockIssueService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mockDocumentService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const mockMemberService = { create: jest.fn(), update: jest.fn() };
  const mockTeamService = {
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };
  const mockProjectService = {
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };
  const mockAcceptanceService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    acceptCompletion: jest.fn(),
    rejectCompletion: jest.fn(),
    waiveCompletion: jest.fn(),
  };
  const mockIssueAssigneeService = { add: jest.fn() };
  const mockMemoryService = {
    recall: jest.fn().mockResolvedValue([]),
    note: jest.fn().mockResolvedValue({ id: 'mem1' }),
    brief: jest.fn().mockResolvedValue({
      scope: 'global',
      pinned: [],
      recent: [],
      counts: { total: 0, working: 0 },
    }),
  };
  const mockCollaborationService = {
    create: jest.fn(),
    respond: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssistantToolsService(
      mockPrisma as unknown as PrismaService,
      mockIssueService as unknown as IssueService,
      mockDocumentService as unknown as DocumentService,
      mockMemberService as unknown as MemberService,
      mockTeamService as unknown as TeamService,
      mockProjectService as unknown as ProjectService,
      mockAcceptanceService as unknown as AcceptanceService,
      mockIssueAssigneeService as unknown as IssueAssigneeService,
      mockMemoryService as unknown as MemoryService,
      mockCollaborationService as unknown as CollaborationService,
    );
  });

  it('目录包含查询与出卡工具，renderCatalogForPrompt 输出 HTTP 形式', () => {
    const names = ASSISTANT_TOOL_CATALOG.map((t) => t.name);
    expect(names).toContain('propose_decision');
    expect(names).toContain('get_task');

    const text = service.renderCatalogForPrompt('p1');
    expect(text).toContain('get_task');
    expect(text).toContain('x-workspace-id');
    expect(text).toContain('p1');
  });

  it('describeTools 与目录同源', () => {
    const { tools } = service.describeTools();
    expect(tools).toHaveLength(ASSISTANT_TOOL_CATALOG.length);
  });

  it('assign_member_to_task 走 IssueAssigneeService（含异常转可读 error）', async () => {
    const tools = service.buildTools({ projectId: 'p1', userId: 'u1' });
    mockIssueAssigneeService.add.mockResolvedValue({
      id: 'ta-1',
      issueId: 't1',
      memberId: 'm1',
    });
    const result = (await (
      tools as unknown as Record<
        string,
        { execute: (args: unknown) => Promise<unknown> }
      >
    ).assign_member_to_task.execute({ issueId: 't1', memberId: 'm1' })) as {
      issueId?: string;
      error?: string;
    };
    expect(mockIssueAssigneeService.add).toHaveBeenCalledWith(
      { issueId: 't1', memberId: 'm1' },
      'u1',
    );
    expect(result.issueId).toBe('t1');
  });

  it('propose_decision assignment 形状不合法时拒卡', async () => {
    const tools = service.buildTools({ projectId: 'p1', userId: 'u1' });
    const propose = (
      tools as unknown as Record<
        string,
        { execute: (args: unknown) => Promise<unknown> }
      >
    ).propose_decision;
    const bad = (await propose.execute({
      kind: 'assignment',
      title: 't',
      payload: { assignments: [{ issueId: 't1' }] },
    })) as { error?: string };
    expect(bad.error).toContain('assignments');
    expect(mockPrisma.decisionProposal.create).not.toHaveBeenCalled();
  });

  it('propose_decision 工具落 DecisionProposal（ai_agent/main-assistant，pending）', async () => {
    const createdAt = new Date('2026-09-04T08:00:00Z');
    mockPrisma.decisionProposal.create.mockResolvedValue({
      id: 'dp-1',
      status: 'pending',
      createdAt,
    });

    const tools = service.buildTools({ projectId: 'p1' });
    const propose = tools.propose_decision as unknown as {
      execute: (input: unknown) => Promise<Record<string, unknown>>;
    };

    const result = await propose.execute({
      kind: 'plan',
      title: '重构登录模块',
      payload: { steps: ['a', 'b'] },
      detail: '两步走',
    });

    expect(result).toMatchObject({
      proposalId: 'dp-1',
      status: 'pending',
      kind: 'plan',
      title: '重构登录模块',
      detail: '两步走',
      projectId: 'p1',
    });
    expect(mockPrisma.decisionProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: 'plan',
          title: '重构登录模块',
          projectId: 'p1',
          proposerType: 'ai_agent',
          proposerId: 'member-xiaozhou',
          status: 'pending',
        }),
      }),
    );
  });

  it('create_task 走 IssueService（继承校验/事件），异常转可读 error', async () => {
    mockIssueService.create.mockResolvedValue({
      id: 't9',
      shortId: 'AB12',
      title: '新任务',
      status: 'todo',
      type: 'bug',
    });
    const tools = service.buildTools({ projectId: 'p1', userId: 'u1' });
    const createTask = tools.create_task as unknown as {
      execute: (input: unknown) => Promise<Record<string, unknown>>;
    };
    const result = await createTask.execute({ title: '新任务', type: 'bug' });
    expect(result).toMatchObject({ issueId: 't9', type: 'bug' });
    expect(mockIssueService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '新任务',
        type: 'bug',
        projectId: 'p1',
      }),
      'u1',
    );

    mockIssueService.create.mockRejectedValue(
      Object.assign(new Error('Invalid status: xx'), {
        getResponse: () => 'Invalid status: xx',
      }),
    );
    const failed = await createTask.execute({ title: 'x' });
    expect(failed).toEqual({ error: 'Invalid status: xx' });
  });

  it('delete_task 未带 confirm 时拒绝执行', async () => {
    const tools = service.buildTools({ projectId: 'p1', userId: 'u1' });
    const del = tools.delete_task as unknown as {
      execute: (input: unknown) => Promise<Record<string, unknown>>;
    };
    const result = await del.execute({ issueId: 't1', confirm: false });
    expect(result).toEqual({ error: '缺少用户确认：请先向用户确认后再删除' });
    expect(mockIssueService.delete).not.toHaveBeenCalled();
  });

  it('create_acceptance 走 AcceptanceService（含验收标准），异常转可读 error', async () => {
    mockAcceptanceService.create.mockResolvedValue({
      id: 'acc-1',
      status: 'draft',
      title: '验收 - 登录',
      criteria: [{}, {}],
    });
    const tools = service.buildTools({ projectId: 'p1', userId: 'u1' });
    const createAcceptance = tools.create_acceptance as unknown as {
      execute: (input: unknown) => Promise<Record<string, unknown>>;
    };
    const result = await createAcceptance.execute({
      issueId: 't1',
      title: '验收 - 登录',
      criteria: [{ criteriaType: 'functional', content: '登录成功' }],
    });
    expect(result).toMatchObject({
      acceptanceId: 'acc-1',
      status: 'draft',
      criteriaCount: 2,
    });
    expect(mockAcceptanceService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 't1',
        criteria: [
          expect.objectContaining({
            criteriaType: 'functional',
            source: 'manual',
          }),
        ],
      }),
      'u1',
    );

    mockAcceptanceService.create.mockRejectedValue(
      Object.assign(new Error('Task t0 not found'), {
        getResponse: () => 'Task t0 not found',
      }),
    );
    const failed = await createAcceptance.execute({ issueId: 't0' });
    expect(failed).toEqual({ error: 'Task t0 not found' });
  });

  it('resolve_acceptance 未带 confirm 拒绝；reject 缺 reason 提示', async () => {
    const tools = service.buildTools({ projectId: 'p1', userId: 'u1' });
    const resolve = tools.resolve_acceptance as unknown as {
      execute: (input: unknown) => Promise<Record<string, unknown>>;
    };

    const noConfirm = await resolve.execute({
      acceptanceId: 'a1',
      action: 'accept',
      confirm: false,
    });
    expect(noConfirm.error).toContain('缺少用户确认');
    expect(mockAcceptanceService.acceptCompletion).not.toHaveBeenCalled();

    const noReason = await resolve.execute({
      acceptanceId: 'a1',
      action: 'reject',
      confirm: true,
    });
    expect(noReason.error).toContain('reason');
    expect(mockAcceptanceService.rejectCompletion).not.toHaveBeenCalled();
  });

  it('list_project_tasks 缺项目上下文时返回可读错误', async () => {
    const tools = service.buildTools({});
    const listTasks = tools.list_project_tasks as unknown as {
      execute: (input: unknown) => Promise<{ error: string }>;
    };

    const result = await listTasks.execute({});
    expect(result.error).toContain('projectId');
    expect(mockPrisma.issue.findMany).not.toHaveBeenCalled();
  });

  it('工具输出 JSON 安全化：Prisma Date 字段序列化为字符串（防 tool 消息校验失败）', async () => {
    const dueDate = new Date('2026-09-10T00:00:00.000Z');
    mockPrisma.issue.findMany.mockResolvedValue([
      {
        id: 't1',
        title: 'A',
        status: 'in_progress',
        priority: 'high',
        assigneeType: 'user',
        dueDate,
      },
    ]);

    const tools = service.buildTools({ projectId: 'p1' });
    const listTasks = tools.list_project_tasks as unknown as {
      execute: (
        input: unknown,
      ) => Promise<{ tasks: Array<{ dueDate: unknown }> }>;
    };

    const result = await listTasks.execute({ projectId: 'p1' });
    // Date 若原样穿透，SDK 的 ToolResultOutput 校验会抛 InvalidPrompt
    expect(typeof result.tasks[0].dueDate).toBe('string');
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

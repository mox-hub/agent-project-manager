/**
 * MCP Server Service 单测（P0-6 止血）
 *
 * 重点覆盖：
 * - 会话创建/绑定携带 userId + tokenHash
 * - claim_task：不存在的 issue 报 404 语义错误；agentId 必须是存在的 Member；
 *   未传 agentId 时归因到 PAT 用户的 Member，兜底 'mcp-agent'
 * - 变更类工具写审计（AuditService.log）
 */
import { McpServerService } from './mcp-server.service';
import type { McpToolContext } from './mcp-server.service';

const CTX: McpToolContext = { userId: 'user-1' };

function buildService(prisma: Record<string, unknown>) {
  const auditService = { log: vi.fn().mockResolvedValue(undefined) };
  const service = new McpServerService(
    { completeExecution: vi.fn().mockResolvedValue(undefined) },
    { createApprovalRequest: vi.fn().mockResolvedValue({ id: 'apr-1' }) },
    { dispatchTaskToCli: vi.fn().mockResolvedValue({ ok: true }) },
    {},
    prisma as never,
    {
      listProviders: vi.fn().mockResolvedValue([]),
      detectAll: vi.fn().mockResolvedValue([]),
      configureProvider: vi
        .fn()
        .mockResolvedValue({ providerId: 'claude-code' }),
      healthCheck: vi.fn().mockResolvedValue({ ok: true }),
    },
    auditService,
  );
  return { service, auditService };
}

describe('McpServerService - 会话与 claim 校验（P0-6）', () => {
  it('createSession 绑定 userId 与 tokenHash，bindSession 可重绑', () => {
    const { service } = buildService({});
    const entry = service.createSession('user-1', 'hash-a');
    expect(entry.userId).toBe('user-1');
    expect(entry.tokenHash).toBe('hash-a');

    expect(service.bindSession('mcp_missing', 'u2', 'hash-b')).toBeNull();

    const rebound = service.bindSession(entry.sessionId, 'user-2', 'hash-b');
    expect(rebound?.userId).toBe('user-2');
    expect(rebound?.tokenHash).toBe('hash-b');
    service.removeSession(entry.sessionId);
  });

  it('claim_task：issue 不存在 → 报 not found（404 语义）', async () => {
    const prisma = {
      issue: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      member: { findFirst: vi.fn() },
    };
    const { service, auditService } = buildService(prisma);

    await expect(
      (service as never as Record<string, (...a: unknown[]) => unknown>)[
        'claimTask'
      ](CTX, { issueId: 'issue_missing' }),
    ).rejects.toThrow('Issue issue_missing not found');
    expect(prisma.issue.update).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('claim_task：agentId 不在 Member 表 → 报 Agent member not found', async () => {
    const prisma = {
      issue: {
        findUnique: vi.fn().mockResolvedValue({ id: 'issue-1' }),
        update: vi.fn(),
      },
      member: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const { service } = buildService(prisma);

    await expect(
      (service as never as Record<string, (...a: unknown[]) => unknown>)[
        'claimTask'
      ](CTX, { issueId: 'issue-1', agentId: 'ghost-agent' }),
    ).rejects.toThrow('Agent member not found: ghost-agent');
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it('claim_task：合法 agentId（含 shortId 命中）→ 认领成功并写审计', async () => {
    const prisma = {
      issue: {
        findUnique: vi.fn().mockResolvedValue({ id: 'issue-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
      member: { findFirst: vi.fn().mockResolvedValue({ id: 'member-9' }) },
    };
    const { service, auditService } = buildService(prisma);

    const result = await (
      service as never as Record<
        string,
        (...a: unknown[]) => Promise<{ content: { text: string }[] }>
      >
    )['claimTask'](CTX, { issueId: 'issue-1', agentId: 'short-abc' });

    expect(result.content[0].text).toContain('claimed successfully');
    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: 'issue-1' },
      data: { aiAgentId: 'member-9', assigneeType: 'ai_agent' },
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: 'agent',
        actorId: 'user-1',
        resourceType: 'task',
        resourceId: 'issue-1',
        metadata: expect.objectContaining({ via: 'mcp', agentId: 'member-9' }),
      }),
    );
  });

  it('claim_task：未传 agentId → 归因到 PAT 用户绑定的 Member', async () => {
    const prisma = {
      issue: {
        findUnique: vi.fn().mockResolvedValue({ id: 'issue-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
      member: { findFirst: vi.fn().mockResolvedValue({ id: 'member-self' }) },
    };
    const { service } = buildService(prisma);

    await (
      service as never as Record<string, (...a: unknown[]) => Promise<unknown>>
    )['claimTask'](CTX, { issueId: 'issue-1' });

    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: 'issue-1' },
      data: { aiAgentId: 'member-self', assigneeType: 'ai_agent' },
    });
  });

  it('claim_task：无 agentId 且 PAT 用户无 Member → 兜底 mcp-agent（兼容旧行为）', async () => {
    const prisma = {
      issue: {
        findUnique: vi.fn().mockResolvedValue({ id: 'issue-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
      member: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const { service } = buildService(prisma);

    await (
      service as never as Record<string, (...a: unknown[]) => Promise<unknown>>
    )['claimTask']({ userId: null }, { issueId: 'issue-1' });

    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: 'issue-1' },
      data: { aiAgentId: 'mcp-agent', assigneeType: 'ai_agent' },
    });
  });

  it('dispatch_task_to_cli：归因 Member 并写审计', async () => {
    const prisma = {
      member: { findFirst: vi.fn().mockResolvedValue({ id: 'member-7' }) },
    };
    const dispatchTaskToCli = vi.fn().mockResolvedValue({ ok: true });
    const auditService = { log: vi.fn().mockResolvedValue(undefined) };
    const service = new McpServerService(
      { completeExecution: vi.fn() },
      { createApprovalRequest: vi.fn() },
      { dispatchTaskToCli },
      {},
      prisma as never,
      {} as never,
      auditService,
    );

    await (
      service as never as Record<string, (...a: unknown[]) => Promise<unknown>>
    )['dispatchToCli'](CTX, { issueId: 'issue-2', providerId: 'codex' });

    expect(dispatchTaskToCli).toHaveBeenCalledWith(
      'issue-2',
      'member-7',
      expect.objectContaining({ providerId: 'codex' }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'execute',
        resourceType: 'task',
        resourceId: 'issue-2',
      }),
    );
  });
});

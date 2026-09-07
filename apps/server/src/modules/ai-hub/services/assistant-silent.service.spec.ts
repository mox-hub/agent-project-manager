import {
  AssistantSilentService,
  extractJsonObject,
} from './assistant-silent.service';
import { BadRequestException } from '@nestjs/common';

describe('extractJsonObject', () => {
  it('解析裸 JSON', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('解析 markdown code fence 包裹的 JSON', () => {
    expect(
      extractJsonObject('前置说明\n```json\n{"prompts":["q1"]}\n```\n尾注'),
    ).toEqual({
      prompts: ['q1'],
    });
  });

  it('容忍前后杂文', () => {
    expect(extractJsonObject('结果如下：{"score": 82} 请查收')).toEqual({
      score: 82,
    });
  });

  it('非对象/非法 JSON 抛 BadRequest', () => {
    expect(() => extractJsonObject('没有 JSON')).toThrow(BadRequestException);
    expect(() => extractJsonObject('[1,2,3]')).toThrow(BadRequestException);
    expect(() => extractJsonObject('{"a":')).toThrow(BadRequestException);
  });
});

describe('AssistantSilentService.run', () => {
  const makeService = (
    adapters: Array<{ provider: string; model: string }>,
  ) => {
    const chat = jest.fn().mockResolvedValue({
      content: '{"prompts":["风险有哪些？","进度如何？"]}',
      model: 'test-model',
      tokens: { prompt: 10, completion: 5, total: 15 },
    });
    const service = new AssistantSilentService(
      { aIUsageLog: { create: jest.fn().mockResolvedValue({}) } } as never,
      {
        listAdapters: () => adapters,
        getAdapter: () => ({
          getProvider: () => adapters[0]?.provider ?? 'x',
          chat,
        }),
      } as never,
      // UsagePricingService 桩：成本估算返回 null（估算不可用口径）
      { estimateCostUsd: jest.fn().mockResolvedValue(null) } as never,
    );
    return { service, chat };
  };

  it('未知场景 400', async () => {
    const { service } = makeService([{ provider: 'glm', model: 'm' }]);
    await expect(service.run('nope', {}, null, 'u1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('无可用 provider 时可读 400', async () => {
    const { service } = makeService([]);
    await expect(service.run('quick-prompts', {}, null, 'u1')).rejects.toThrow(
      /LLM provider/,
    );
  });

  it('quick-prompts 场景：instructions 含上下文，返回结构化 data + 用量落账', async () => {
    const { service, chat } = makeService([{ provider: 'glm', model: 'm' }]);
    const result = await service.run(
      'quick-prompts',
      { projectName: 'Apollo', viewing: { kind: 'task', id: 't1' } },
      'p1',
      'u1',
    );

    expect(result.scenario).toBe('quick-prompts');
    expect(result.data).toEqual({ prompts: ['风险有哪些？', '进度如何？'] });
    expect(chat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        instructions: expect.stringContaining('Apollo'),
      }),
    );
    // instructions 经 generateText options 传递而非 system 消息（v7 约束）
    const [messages, options] = chat.mock.calls[0];
    expect(JSON.stringify(messages)).not.toContain('system');
    expect((options as { instructions: string }).instructions).toContain(
      'task',
    );
  });

  it('listScenarios 返回注册表目录', () => {
    const { service } = makeService([]);
    const scenarios = service.listScenarios();
    expect(scenarios.map((s) => s.scenario)).toEqual([
      'quick-prompts',
      'create-suggestions',
      'project-score',
      'anchor-qa',
      'memory-digest',
    ]);
  });
});

describe('AssistantSilentService.run · anchor-qa', () => {
  const taskFacts = {
    id: 't1',
    title: '登录接口 500',
    status: 'in_progress',
    priority: 'high',
    project: { id: 'p1', name: 'Apollo' },
  };

  const makeAnchorService = (
    prismaOverrides: Record<string, unknown> = {},
    chatContent = '{"answer":"状态是进行中。","actions":[]}',
  ) => {
    const prisma = {
      aIUsageLog: { create: jest.fn().mockResolvedValue({}) },
      issue: {
        findUnique: jest
          .fn()
          .mockResolvedValue(prismaOverrides.task ?? taskFacts),
      },
      issueAssignee: {
        findMany: jest.fn().mockResolvedValue([{ memberId: 'm1' }]),
      },
      member: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'm1', displayName: '小码', type: 'ai_agent' },
          ]),
      },
      acceptance: { findFirst: jest.fn().mockResolvedValue(null) },
      issueDependency: { count: jest.fn().mockResolvedValue(0) },
      issueActivity: { findMany: jest.fn().mockResolvedValue([]) },
      ...(prismaOverrides.extra as Record<string, jest.Mock> | undefined),
    };
    const chat = jest.fn().mockResolvedValue({
      content: chatContent,
      model: 'test-model',
      tokens: { prompt: 10, completion: 5, total: 15 },
    });
    const service = new AssistantSilentService(
      prisma as never,
      {
        listAdapters: () => [{ provider: 'glm', model: 'm' }],
        getAdapter: () => ({ getProvider: () => 'glm', chat }),
      } as never,
      { estimateCostUsd: jest.fn().mockResolvedValue(null) } as never,
    );
    return { service, chat, prisma };
  };

  it('先侦查再开口：instructions 含数据库加载的任务事实与用户问题', async () => {
    const { service, chat, prisma } = makeAnchorService();
    const result = await service.run(
      'anchor-qa',
      {
        anchor: { kind: 'task', id: 't1' },
        question: '这个任务现在什么状态？',
      },
      'p1',
      'u1',
    );

    expect(result.data).toEqual({ answer: '状态是进行中。', actions: [] });
    expect(prisma.issue.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1' } }),
    );
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('登录接口 500');
    expect(instructions).toContain('小码');
    expect(instructions).toContain('这个任务现在什么状态？');
    expect(instructions).toContain('task.update_status');
  });

  it('锚点缺 id / 非任务锚点 / 任务不存在 → 400', async () => {
    const { service } = makeAnchorService();
    await expect(
      service.run('anchor-qa', { question: 'q' }, 'p1', 'u1'),
    ).rejects.toThrow(/锚点缺少实体 id/);
    await expect(
      service.run(
        'anchor-qa',
        { anchor: { kind: 'document', id: 'd1' }, question: 'q' },
        'p1',
        'u1',
      ),
    ).rejects.toThrow(/只支持任务锚点/);
    const missing = makeAnchorService({
      extra: {
        issue: { findUnique: jest.fn().mockResolvedValue(null) },
      },
    });
    await expect(
      missing.service.run(
        'anchor-qa',
        { anchor: { kind: 'task', id: 'nope' }, question: 'q' },
        'p1',
        'u1',
      ),
    ).rejects.toThrow(/锚点任务不存在/);
  });

  it('缺问题 → 400（不触 LLM）', async () => {
    const { service, chat } = makeAnchorService();
    await expect(
      service.run(
        'anchor-qa',
        { anchor: { kind: 'task', id: 't1' } },
        'p1',
        'u1',
      ),
    ).rejects.toThrow(/缺少问题/);
    expect(chat).not.toHaveBeenCalled();
  });
});

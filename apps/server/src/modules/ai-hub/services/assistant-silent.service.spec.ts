import type { Mock } from 'vitest';
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
    const chat = vi.fn().mockResolvedValue({
      content: '{"prompts":["风险有哪些？","进度如何？"]}',
      model: 'test-model',
      tokens: { prompt: 10, completion: 5, total: 15 },
    });
    const service = new AssistantSilentService(
      { aIUsageLog: { create: vi.fn().mockResolvedValue({}) } } as never,
      {
        listAdapters: () => adapters,
        getAdapter: () => ({
          getProvider: () => adapters[0]?.provider ?? 'x',
          chat,
        }),
      } as never,
      // UsagePricingService 桩：成本估算返回 null（估算不可用口径）
      { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
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
      'card-explain',
      'memory-digest',
      'grill-next',
      'interview-prefill',
      'intake-composite',
      'interview-dynamic',
      'workflow-draft',
    ]);
  });

  describe('interview-prefill', () => {
    const makePrefillService = (chatContent: string) => {
      const chat = vi.fn().mockResolvedValue({
        content: chatContent,
        model: 'test-model',
        tokens: { prompt: 10, completion: 5, total: 15 },
      });
      const service = new AssistantSilentService(
        { aIUsageLog: { create: vi.fn().mockResolvedValue({}) } } as never,
        {
          listAdapters: () => [{ provider: 'glm', model: 'm' }],
          getAdapter: () => ({ getProvider: () => 'glm', chat }),
        } as never,
        { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
      );
      return { service, chat };
    };

    it('按需求描述为每个问题生成答案候选，instructions 覆盖问题组', async () => {
      const { service, chat } = makePrefillService(
        '{"answers": [{"questionId": "problem", "answer": "会议决定记不住"}, {"questionId": "users", "answer": "小组 5 人"}]}',
      );
      const result = await service.run(
        'interview-prefill',
        {
          requirement: '做一个会议纪要工具',
          questions: [
            { id: 'problem', question: '要解决什么问题？' },
            { id: 'users', question: '谁会用？' },
          ],
        },
        'p1',
        'u1',
      );

      expect(result.data).toHaveProperty('answers');
      const answers = result.data.answers as Array<{ questionId: string }>;
      expect(answers).toHaveLength(2);
      const [, options] = chat.mock.calls[0];
      const instructions = (options as { instructions: string }).instructions;
      expect(instructions).toContain('做一个会议纪要工具');
      expect(instructions).toContain('"id":"problem"');
    });

    it('缺问题组 → 400（不触 LLM）', async () => {
      const { service, chat } = makePrefillService('{}');
      await expect(
        service.run('interview-prefill', { requirement: 'x' }, 'p1', 'u1'),
      ).rejects.toThrow(/缺少问题组/);
      expect(chat).not.toHaveBeenCalled();
    });
  });

  describe('intake-composite', () => {
    const DOCS = [
      {
        id: 'd1',
        title: '工程任务拆解 · P',
        content: '① 决定登记表 ② 会后提醒',
      },
      { id: 'd2', title: '验收草案 · P', content: '会后 10 分钟内可查到决定' },
    ];

    const makeCompositeService = (
      prismaDocs: Array<{ id: string; title: string; content: string }> = DOCS,
      chatContent = '{"tasks": [{"title": "做决定登记表", "description": "登记会议决定", "estimate": 8, "acceptance": {"criteria": [{"criteriaType": "functional", "content": "会后可查"}]}}]}',
    ) => {
      const chat = vi.fn().mockResolvedValue({
        content: chatContent,
        model: 'test-model',
        tokens: { prompt: 10, completion: 5, total: 15 },
      });
      const prisma = {
        aIUsageLog: { create: vi.fn().mockResolvedValue({}) },
        document: { findMany: vi.fn().mockResolvedValue(prismaDocs) },
      };
      const service = new AssistantSilentService(
        prisma as never,
        {
          listAdapters: () => [{ provider: 'glm', model: 'm' }],
          getAdapter: () => ({ getProvider: () => 'glm', chat }),
        } as never,
        { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
      );
      return { service, chat, prisma };
    };

    it('侦查两份工件 → instructions 含文档内容，输出 tasks payload', async () => {
      const { service, chat, prisma } = makeCompositeService();
      const result = await service.run(
        'intake-composite',
        { breakdownDocumentId: 'd1', acceptanceDocumentId: 'd2' },
        'p1',
        'u1',
      );

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['d1', 'd2'] } },
        }),
      );
      expect(result.data).toHaveProperty('tasks');
      const tasks = result.data.tasks as Array<Record<string, unknown>>;
      expect(tasks[0]).toMatchObject({ title: '做决定登记表' });
      const [, options] = chat.mock.calls[0];
      const instructions = (options as { instructions: string }).instructions;
      expect(instructions).toContain('决定登记表');
      expect(instructions).toContain('会后 10 分钟内可查到决定');
    });

    it('缺工件 id / 文档不存在 → 400（不触 LLM）', async () => {
      const { service, chat, prisma } = makeCompositeService();
      await expect(
        service.run('intake-composite', {}, 'p1', 'u1'),
      ).rejects.toThrow(/缺少工件/);
      expect(chat).not.toHaveBeenCalled();

      const missing = makeCompositeService([]);
      await expect(
        missing.service.run(
          'intake-composite',
          { breakdownDocumentId: 'gone' },
          'p1',
          'u1',
        ),
      ).rejects.toThrow(/工件文档不存在/);
      expect(missing.chat).not.toHaveBeenCalled();
      void prisma;
    });
  });

  describe('interview-dynamic', () => {
    const makeDynamicService = (
      chatContent: string,
      docs: Array<{ id: string; title: string; content: string }> = [],
    ) => {
      const chat = vi.fn().mockResolvedValue({
        content: chatContent,
        model: 'test-model',
        tokens: { prompt: 10, completion: 5, total: 15 },
      });
      const prisma = {
        aIUsageLog: { create: vi.fn().mockResolvedValue({}) },
        document: { findMany: vi.fn().mockResolvedValue(docs) },
      };
      const service = new AssistantSilentService(
        prisma as never,
        {
          listAdapters: () => [{ provider: 'glm', model: 'm' }],
          getAdapter: () => ({ getProvider: () => 'glm', chat }),
        } as never,
        { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
      );
      return { service, chat, prisma };
    };

    const QUESTIONS = [
      { id: 'problem', question: '要解决什么问题', hint: '' },
      { id: 'users', question: '谁在用', hint: '' },
    ];

    it('首轮追问：instructions 含问题组/阶段目的/空历史提示，输出 question 轮', async () => {
      const { service, chat } = makeDynamicService(
        '{"done": false, "question": "记录的决定大概多久要查一次？", "choices": ["每天", "偶尔"]}',
      );
      const result = await service.run(
        'interview-dynamic',
        { questions: QUESTIONS, stagePurpose: '澄清问题与用户', history: [] },
        'p1',
        'u1',
      );

      const [, options] = chat.mock.calls[0];
      const instructions = (options as { instructions: string }).instructions;
      expect(instructions).toContain('要解决什么问题');
      expect(instructions).toContain('澄清问题与用户');
      expect(instructions).toContain('还没有，请开始第一问');
      expect(result.data).toMatchObject({
        done: false,
        question: '记录的决定大概多久要查一次？',
      });
    });

    it('带工件 id → prepareContext 查库注入文档内容；已答历史进入 instructions', async () => {
      const { service, chat, prisma } = makeDynamicService(
        '{"done": true, "answers": [{"questionId": "problem", "answer": "会议决定记不住"}, {"questionId": "users", "answer": "小组 5 人"}]}',
        [{ id: 'd1', title: '需求澄清纪要', content: '用户想做决定登记表' }],
      );
      const result = await service.run(
        'interview-dynamic',
        {
          questions: QUESTIONS,
          history: [
            { question: '记录的决定大概多久要查一次？', answer: '每天' },
          ],
          artifactDocumentIds: ['d1'],
        },
        'p1',
        'u1',
      );

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['d1'] } } }),
      );
      const [, options] = chat.mock.calls[0];
      const instructions = (options as { instructions: string }).instructions;
      expect(instructions).toContain('需求澄清纪要');
      expect(instructions).toContain('每天');
      expect(result.data).toHaveProperty('answers');
    });

    it('缺问题组 → 400（不触 LLM）', async () => {
      const { service, chat } = makeDynamicService('{}');
      await expect(
        service.run('interview-dynamic', { history: [] }, 'p1', 'u1'),
      ).rejects.toThrow(/缺少问题组/);
      expect(chat).not.toHaveBeenCalled();
    });
  });

  describe('workflow-draft', () => {
    const makeDraftService = (chatContent: string) => {
      const chat = vi.fn().mockResolvedValue({
        content: chatContent,
        model: 'test-model',
        tokens: { prompt: 10, completion: 5, total: 15 },
      });
      const service = new AssistantSilentService(
        { aIUsageLog: { create: vi.fn().mockResolvedValue({}) } } as never,
        {
          listAdapters: () => [{ provider: 'glm', model: 'm' }],
          getAdapter: () => ({ getProvider: () => 'glm', chat }),
        } as never,
        { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
      );
      return { service, chat };
    };

    it('instructions 含五类步骤说明与产品动作目录，透传草稿 JSON', async () => {
      const { service, chat } = makeDraftService(
        '{"name": "周报流", "description": "生成周报", "steps": [{"id": "draft", "type": "llm", "prompt": "写周报"}]}',
      );
      const result = await service.run(
        'workflow-draft',
        { description: '每周五让 AI 写周报，我确认后归档' },
        'p1',
        'u1',
      );

      const [, options] = chat.mock.calls[0];
      const instructions = (options as { instructions: string }).instructions;
      expect(instructions).toContain('human-confirm');
      expect(instructions).toContain('issue.create');
      expect(instructions).toContain('document.create');
      expect(result.data).toMatchObject({ name: '周报流' });
    });

    it('缺流程描述 → 400（不触 LLM）', async () => {
      const { service, chat } = makeDraftService('{}');
      await expect(
        service.run('workflow-draft', {}, 'p1', 'u1'),
      ).rejects.toThrow(/缺少流程描述/);
      expect(chat).not.toHaveBeenCalled();
    });
  });
});

describe('AssistantSilentService.run · grill-next', () => {
  const GRILLING = '你是 APM 的需求拷问官（grill）。一次只问一个问题。';

  const makeGrillService = (
    skillRow: { enabled: boolean; content: string | null } | null = {
      enabled: true,
      content: GRILLING,
    },
    chatContent = '{"done": false, "question": "它要解决什么问题？", "choices": [{"key": "a", "label": "记不清", "guess": true}]}',
  ) => {
    const chat = vi.fn().mockResolvedValue({
      content: chatContent,
      model: 'test-model',
      tokens: { prompt: 10, completion: 5, total: 15 },
    });
    const prisma = {
      aIUsageLog: { create: vi.fn().mockResolvedValue({}) },
      skillConfig: { findUnique: vi.fn().mockResolvedValue(skillRow) },
    };
    const service = new AssistantSilentService(
      prisma as never,
      {
        listAdapters: () => [{ provider: 'glm', model: 'm' }],
        getAdapter: () => ({ getProvider: () => 'glm', chat }),
      } as never,
      { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
    );
    return { service, chat, prisma };
  };

  it('第一问：服务端加载 grilling 指令注入 instructions，含用户草稿', async () => {
    const { service, chat, prisma } = makeGrillService();
    const result = await service.run(
      'grill-next',
      { draft: '想做一个帮团队记会议的系统', history: [] },
      null,
      'u1',
    );

    expect(result.scenario).toBe('grill-next');
    expect(result.data).toHaveProperty('question', '它要解决什么问题？');
    expect(prisma.skillConfig.findUnique).toHaveBeenCalledWith({
      where: { key: 'grilling' },
    });
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('一次只问一个问题');
    expect(instructions).toContain('帮团队记会议的系统');
  });

  it('多轮：历史问答进入 instructions；done 时透出 summary', async () => {
    const { service } = makeGrillService(
      undefined,
      '{"done": true, "summary": {"name": "会议纪要库", "goals": ["不再丢结论"], "users": [], "scope": [], "nonGoals": [], "constraints": [], "acceptanceHints": []}}',
    );
    const result = await service.run(
      'grill-next',
      {
        draft: '会议纪要系统',
        history: [{ question: '给谁用？', answer: '小团队' }],
      },
      null,
      'u1',
    );
    expect(result.data).toHaveProperty('done', true);
    const summary = result.data.summary as Record<string, unknown>;
    expect(summary).toHaveProperty('name', '会议纪要库');
  });

  it('grilling 技能缺失/未启用/无正文 → 可读 400（不触 LLM）', async () => {
    const disabled = makeGrillService({ enabled: false, content: GRILLING });
    await expect(
      disabled.service.run(
        'grill-next',
        { draft: 'x', history: [] },
        null,
        'u1',
      ),
    ).rejects.toThrow(/grilling 技能不可用/);
    expect(disabled.chat).not.toHaveBeenCalled();

    const noContent = makeGrillService({ enabled: true, content: null });
    await expect(
      noContent.service.run(
        'grill-next',
        { draft: 'x', history: [] },
        null,
        'u1',
      ),
    ).rejects.toThrow(/grilling 技能不可用/);

    const missing = makeGrillService(null);
    await expect(
      missing.service.run(
        'grill-next',
        { draft: 'x', history: [] },
        null,
        'u1',
      ),
    ).rejects.toThrow(/grilling 技能不可用/);
  });

  it('draft 与 history 全空 → 400（不触 LLM）', async () => {
    const { service, chat } = makeGrillService();
    await expect(
      service.run('grill-next', { history: [] }, null, 'u1'),
    ).rejects.toThrow(/至少一项/);
    expect(chat).not.toHaveBeenCalled();
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
      aIUsageLog: { create: vi.fn().mockResolvedValue({}) },
      issue: {
        findUnique: vi
          .fn()
          .mockResolvedValue(prismaOverrides.task ?? taskFacts),
      },
      issueAssignee: {
        findMany: vi.fn().mockResolvedValue([{ memberId: 'm1' }]),
      },
      member: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 'm1', displayName: '小码', type: 'ai_agent' },
          ]),
      },
      acceptance: { findFirst: vi.fn().mockResolvedValue(null) },
      issueDependency: { count: vi.fn().mockResolvedValue(0) },
      issueActivity: { findMany: vi.fn().mockResolvedValue([]) },
      ...(prismaOverrides.extra as Record<string, Mock> | undefined),
    };
    const chat = vi.fn().mockResolvedValue({
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
      { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
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
        issue: { findUnique: vi.fn().mockResolvedValue(null) },
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

describe('AssistantSilentService.run · card-explain', () => {
  const taskRow = {
    id: 't1',
    shortId: 'T-1',
    title: '登录接口 500',
    description: '登录接口偶发 500',
    status: 'in_progress',
    priority: 'high',
    type: 'bug',
    customFields: null,
    dueDate: null,
    project: { id: 'p1', name: 'Apollo' },
    assignee: null,
  };

  const makeCardService = (
    prismaOverrides: Record<string, unknown> = {},
    chatContent = '{"title":"登录接口 500","summary":"这是一个缺陷任务，正在修复。","details":[{"label":"状态","text":"进行中"}],"nextStep":"等修复后验收"}',
  ) => {
    const prisma = {
      aIUsageLog: { create: vi.fn().mockResolvedValue({}) },
      issue: {
        findUnique: vi.fn().mockResolvedValue(taskRow),
      },
      issueAssignee: { findMany: vi.fn().mockResolvedValue([]) },
      member: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      acceptance: { findFirst: vi.fn().mockResolvedValue(null) },
      issueDependency: { count: vi.fn().mockResolvedValue(0) },
      issueActivity: { findMany: vi.fn().mockResolvedValue([]) },
      decisionProposal: { findUnique: vi.fn().mockResolvedValue(null) },
      ...(prismaOverrides as Record<string, Mock> | undefined),
    };
    const chat = vi.fn().mockResolvedValue({
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
      { estimateCostUsd: vi.fn().mockResolvedValue(null) } as never,
    );
    return { service, chat, prisma };
  };

  it('任务卡（无显式问题）：先侦查再开口，instructions 含任务事实与默认解释口径', async () => {
    const { service, chat, prisma } = makeCardService();
    const result = await service.run(
      'card-explain',
      { entity: { kind: 'task', id: 't1' } },
      'p1',
      'u1',
    );

    expect(result.scenario).toBe('card-explain');
    expect(result.data).toEqual({
      title: '登录接口 500',
      summary: '这是一个缺陷任务，正在修复。',
      details: [{ label: '状态', text: '进行中' }],
      nextStep: '等修复后验收',
    });
    expect(prisma.issue.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1' } }),
    );
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('登录接口 500');
    expect(instructions).toContain('最值得知道的事');
    expect(instructions).not.toContain('优先回答它');
  });

  it('带具体问题时 instructions 含问题文本', async () => {
    const { service, chat } = makeCardService();
    await service.run(
      'card-explain',
      { entity: { kind: 'task', id: 't1' }, question: '为什么会 500？' },
      'p1',
      'u1',
    );
    const [, options] = chat.mock.calls[0];
    expect((options as { instructions: string }).instructions).toContain(
      '为什么会 500？',
    );
  });

  it('决策卡：加载提案事实与提案人名', async () => {
    const { service, chat, prisma } = makeCardService({
      decisionProposal: {
        findUnique: vi.fn().mockResolvedValue({
          kind: 'plan',
          title: '拆解为 3 个子任务',
          detail: '按模块拆解',
          status: 'pending',
          payload: { issues: [] },
          resolution: null,
          proposerId: 'm1',
          createdAt: new Date('2026-09-09T00:00:00Z'),
        }),
      },
      member: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi
          .fn()
          .mockResolvedValue({ displayName: '小码', type: 'ai_agent' }),
      },
    });
    await service.run(
      'card-explain',
      { entity: { kind: 'decision', id: 'dp1' } },
      'p1',
      'u1',
    );

    expect(prisma.decisionProposal.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'dp1' } }),
    );
    expect(prisma.member.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1' } }),
    );
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('拆解为 3 个子任务');
    expect(instructions).toContain('小码');
  });

  it('成员卡：加载成员事实（含信任分）', async () => {
    const { service, chat, prisma } = makeCardService({
      member: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue({
          displayName: '小周',
          handle: 'xiaozhou',
          type: 'ai_agent',
          title: '系统助理',
          description: null,
          status: 'active',
          trustScore: 80,
          trustLevel: 2,
        }),
      },
    });
    await service.run(
      'card-explain',
      { entity: { kind: 'member', id: 'm1' } },
      null,
      'u1',
    );

    expect(prisma.member.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1' } }),
    );
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('小周');
    expect(instructions).toContain('xiaozhou');
  });

  it('契约绑定行：加载绑定事实（含项目名与冲突态），prompt 附绑定模式解释口径', async () => {
    const { service, chat, prisma } = makeCardService({
      contractFileBinding: {
        findUnique: vi.fn().mockResolvedValue({
          fileType: 'agents',
          filePath: 'AGENTS.md',
          syncMode: 'synced',
          conflictState: 'conflicted',
          truthOwner: 'file_git',
          updatedAt: new Date('2026-09-09T00:00:00Z'),
          project: { id: 'p1', name: 'Apollo' },
        }),
      },
    });
    await service.run(
      'card-explain',
      { entity: { kind: 'contract-binding', id: 'cfb1' } },
      'p1',
      'u1',
    );

    expect(prisma.contractFileBinding.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cfb1' } }),
    );
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('AGENTS.md');
    expect(instructions).toContain('conflicted');
    expect(instructions).toContain('managed=系统托管生成');
  });

  it('文档卡：加载文档事实（状态/发布/派生溯源/项目名）', async () => {
    const { service, chat, prisma } = makeCardService({
      document: {
        findUnique: vi.fn().mockResolvedValue({
          title: '需求澄清纪要',
          status: 'published',
          provenance: 'authored',
          publishedVersionId: 'v9',
          publishedAt: new Date('2026-09-09T00:00:00Z'),
          updatedAt: new Date('2026-09-09T00:00:00Z'),
          project: { id: 'p1', name: 'Apollo' },
        }),
      },
    });
    await service.run(
      'card-explain',
      { entity: { kind: 'document', id: 'doc1' } },
      'p1',
      'u1',
    );

    expect(prisma.document.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'doc1' } }),
    );
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('需求澄清纪要');
    expect(instructions).toContain('published');
  });

  it('验收卡：加载验收事实（标准明细 + 审计报告），prompt 附审计口径', async () => {
    const { service, chat, prisma } = makeCardService({
      acceptance: {
        findUnique: vi.fn().mockResolvedValue({
          title: null,
          status: 'pending',
          type: 'mixed',
          completionType: 'artifact',
          issue: {
            title: '登录接口 500',
            shortId: 'T-1',
            status: 'in_review',
            type: 'bug',
          },
          criteria: [
            {
              criteriaType: 'functional',
              content: '偶发请求返回 200',
              weight: 5,
              severity: 'critical',
              status: 'passed',
            },
            {
              criteriaType: 'technical',
              content: '压测脚本入库',
              weight: 3,
              severity: 'high',
              status: 'pending',
            },
          ],
          auditReport: {
            riskLevel: 'yellow',
            blockedItems: [],
            suggestedItems: [
              { type: 'log', content: '缺少日志验收标准', severity: 'medium' },
            ],
            passedItems: [{ content: '偶发请求返回 200' }],
            summary: '建议补全日志标准',
            auditDate: new Date('2026-09-09T00:00:00Z'),
          },
        }),
      },
    });
    await service.run(
      'card-explain',
      { entity: { kind: 'acceptance', id: 'ac1' } },
      'p1',
      'u1',
    );

    expect(prisma.acceptance.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ac1' } }),
    );
    const [, options] = chat.mock.calls[0];
    const instructions = (options as { instructions: string }).instructions;
    expect(instructions).toContain('登录接口 500');
    expect(instructions).toContain('压测脚本入库');
    expect(instructions).toContain('yellow');
    expect(instructions).toContain('red=有强阻断项');
  });

  it('项目卡与团队卡：加载项目健康面与团队规则事实', async () => {
    const { service, chat, prisma } = makeCardService({
      project: {
        findUnique: vi.fn().mockResolvedValue({
          name: 'Apollo 重构',
          description: '核心模块重构',
          projectCode: 'APOLLO',
          type: 'team',
          status: 'active',
          workflowStatus: 'in_progress',
          healthStatus: 'at_risk',
          riskLevel: 'high',
          targetDate: new Date('2026-10-01T00:00:00Z'),
          owner: { displayName: '老王', username: 'laowang' },
        }),
      },
      team: {
        findUnique: vi.fn().mockResolvedValue({
          name: '后端突击队',
          description: null,
          status: 'active',
          teamPrompt: '提交前必须跑门禁',
        }),
      },
    });

    await service.run(
      'card-explain',
      { entity: { kind: 'project', id: 'p1' } },
      'p1',
      'u1',
    );
    const [, projectOptions] = chat.mock.calls[0];
    const projectInstructions = (projectOptions as { instructions: string })
      .instructions;
    expect(projectInstructions).toContain('Apollo 重构');
    expect(projectInstructions).toContain('at_risk');
    expect(projectInstructions).toContain('老王');

    await service.run(
      'card-explain',
      { entity: { kind: 'team', id: 'team1' } },
      null,
      'u1',
    );
    const [, teamOptions] = chat.mock.calls[1];
    const teamInstructions = (teamOptions as { instructions: string })
      .instructions;
    expect(teamInstructions).toContain('后端突击队');
    expect(teamInstructions).toContain('提交前必须跑门禁');
    expect(prisma.project.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } }),
    );
  });

  it('缺 id / 不支持的类型 / 实体不存在 → 400（不触 LLM）', async () => {
    const { service, chat } = makeCardService();
    await expect(
      service.run('card-explain', { entity: { kind: 'task' } }, 'p1', 'u1'),
    ).rejects.toThrow(/缺少实体 id/);
    await expect(
      service.run(
        'card-explain',
        { entity: { kind: 'milestone', id: 'ms1' } },
        'p1',
        'u1',
      ),
    ).rejects.toThrow(/暂不支持该卡片类型/);
    const missing = makeCardService({
      decisionProposal: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    await expect(
      missing.service.run(
        'card-explain',
        { entity: { kind: 'decision', id: 'nope' } },
        'p1',
        'u1',
      ),
    ).rejects.toThrow(/卡片实体不存在/);
    const missingAcceptance = makeCardService({
      acceptance: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    await expect(
      missingAcceptance.service.run(
        'card-explain',
        { entity: { kind: 'acceptance', id: 'nope' } },
        'p1',
        'u1',
      ),
    ).rejects.toThrow(/卡片实体不存在/);
    expect(chat).not.toHaveBeenCalled();
  });
});

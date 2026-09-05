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
    ]);
  });
});

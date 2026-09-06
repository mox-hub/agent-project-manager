import { AssistantMemoryDigestService } from './assistant-memory-digest.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { PrismaService } from '@/core/database/prisma.service';
import { MemoryService } from '@/modules/memory/memory.service';
import { AssistantSilentService } from './assistant-silent.service';

/** 记忆消化器：会话静默后提炼写原子（必带溯源）；旁路容错不抛错 */

function makeDeps(overrides?: {
  silentData?: Record<string, unknown>;
  silentReject?: boolean;
}) {
  const prisma = {
    aIConversation: {
      findUnique: jest.fn().mockResolvedValue({ id: 'c1', projectId: 'p1' }),
    },
    aIMessage: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'm1',
          role: 'user',
          content: '这个项目以后接口都用 REST 风格',
          metadata: null,
        },
        {
          id: 'm2',
          role: 'assistant',
          content: JSON.stringify({
            id: 'x',
            role: 'assistant',
            parts: [{ type: 'text', text: '好的，我记下了。' }],
          }),
          metadata: { format: 'ui-message' },
        },
      ]),
    },
    execution: {
      findUnique: jest.fn().mockResolvedValue({
        input: { source: 'assistant-chat', conversationId: 'c1' },
      }),
    },
  };
  const memoryService = {
    note: jest.fn().mockResolvedValue({ id: 'mem1' }),
  };
  const silentService = {
    run: overrides?.silentReject
      ? jest.fn().mockRejectedValue(new Error('no provider'))
      : jest.fn().mockResolvedValue({
          scenario: 'memory-digest',
          data: overrides?.silentData ?? {
            summary: '讨论了接口风格约定',
            preferences: [],
            conclusions: [{ content: '接口统一用 REST 风格', confidence: 0.9 }],
          },
        }),
  };
  const messageBus = { subscribe: jest.fn() };
  const service = new AssistantMemoryDigestService(
    messageBus as unknown as MessageBusService,
    prisma as unknown as PrismaService,
    memoryService as unknown as MemoryService,
    silentService as unknown as AssistantSilentService,
  );
  return { service, prisma, memoryService, silentService, messageBus };
}

describe('AssistantMemoryDigestService', () => {
  it('订阅助手回复与执行结果两类事件', () => {
    const { service, messageBus } = makeDeps();
    service.onModuleInit();
    expect(messageBus.subscribe).toHaveBeenCalledWith(
      'ai.assistant.replied',
      expect.any(Function),
    );
    expect(messageBus.subscribe).toHaveBeenCalledWith(
      'runtime.execution.result',
      expect.any(Function),
    );
  });

  it('digestConversation：拉 transcript → 提炼 → 写 summary/conclusion 原子（带溯源）', async () => {
    const { service, memoryService, silentService } = makeDeps();
    await service.digestConversation('c1');

    const context = silentService.run.mock.calls[0][1] as {
      messages: unknown[];
    };
    expect(context.messages).toHaveLength(2);

    expect(memoryService.note).toHaveBeenCalledTimes(2);
    expect(memoryService.note).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p1',
        type: 'summary',
        content: '讨论了接口风格约定',
        sourceEventId: 'm2',
        sourceType: 'digest',
        createdBy: 'system:digester',
      }),
    );
    expect(memoryService.note).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'conclusion',
        content: '接口统一用 REST 风格',
      }),
    );
  });

  it('消息不足 2 条不消化；消化失败静默（旁路）', async () => {
    const tooFew = makeDeps();
    tooFew.prisma.aIMessage.findMany.mockResolvedValue([
      { id: 'm1', role: 'user', content: '在吗', metadata: null },
    ]);
    await tooFew.service.digestConversation('c1');
    expect(tooFew.memoryService.note).not.toHaveBeenCalled();

    const failing = makeDeps({ silentReject: true });
    await expect(
      failing.service.digestConversation('c1'),
    ).resolves.toBeUndefined();
    expect(failing.memoryService.note).not.toHaveBeenCalled();
  });
});

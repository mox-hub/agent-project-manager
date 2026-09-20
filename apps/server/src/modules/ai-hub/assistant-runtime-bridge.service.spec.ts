import { AssistantRuntimeBridge } from './assistant-runtime-bridge.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

describe('AssistantRuntimeBridge', () => {
  let bridge: AssistantRuntimeBridge;

  const mockPrisma = {
    execution: {
      findUnique: vi.fn(),
    },
    aIMessage: {
      update: vi.fn(),
    },
    aIConversation: {
      update: vi.fn(),
    },
  };
  const mockMessageBus = {
    publish: vi.fn(),
  };

  const assistantRun = {
    createdBy: 'u1',
    input: {
      source: 'assistant-chat',
      conversationId: 'conv-1',
      messageId: 'msg-1',
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    bridge = new AssistantRuntimeBridge(
      mockPrisma as unknown as PrismaService,
      mockMessageBus as unknown as MessageBusService,
    );
  });

  function publishedPayloads() {
    return mockMessageBus.publish.mock.calls
      .filter(([event]) => event === 'ai.stream')
      .map(([, payload]) => payload as Record<string, unknown>);
  }

  function publishedChunks() {
    return publishedPayloads().map(
      (p) => p.chunk as { type?: string } & Record<string, unknown>,
    );
  }

  it('非 assistant-chat 的执行事件不回流（普通任务派发不受影响）', async () => {
    mockPrisma.execution.findUnique.mockResolvedValue({
      createdBy: 'u1',
      input: { source: 'assistant' },
    });

    await bridge.onExecutionEvent({
      eventType: 'execution.token',
      executionRunId: 'run-1',
      summary: 'hello',
    });

    expect(mockMessageBus.publish).not.toHaveBeenCalled();
  });

  it('token 事件转 text-delta chunk（首个 token 前补 start/text-start），按 userId 定向', async () => {
    mockPrisma.execution.findUnique.mockResolvedValue(assistantRun);

    await bridge.onExecutionEvent({
      eventType: 'execution.token',
      executionRunId: 'run-1',
      summary: '你好',
    });

    const payloads = publishedPayloads();
    const chunks = publishedChunks();
    expect(chunks.map((c) => c.type)).toEqual([
      'start',
      'start-step',
      'text-start',
      'text-delta',
    ]);
    expect(payloads[0]).toMatchObject({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      userId: 'u1',
    });
    expect(chunks[3]).toMatchObject({
      type: 'text-delta',
      delta: '你好',
    });
    expect(payloads[3]).toMatchObject({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      userId: 'u1',
    });
  });

  it('后续 token 只发 text-delta（start 不重复），正文持续累积', async () => {
    mockPrisma.execution.findUnique.mockResolvedValue(assistantRun);

    await bridge.onExecutionEvent({
      eventType: 'execution.token',
      executionRunId: 'run-1',
      summary: '第一段',
    });
    await bridge.onExecutionEvent({
      eventType: 'execution.token',
      executionRunId: 'run-1',
      summary: '第二段',
    });

    const chunks = publishedChunks();
    expect(chunks.filter((c) => c.type === 'start')).toHaveLength(1);
    const deltas = chunks.filter((c) => c.type === 'text-delta');
    expect(deltas).toHaveLength(2);
  });

  it('completed 终态：累积正文落库为 UIMessage JSON（status done）并收尾流', async () => {
    mockPrisma.execution.findUnique.mockResolvedValue(assistantRun);
    mockPrisma.aIMessage.update.mockResolvedValue({});
    mockPrisma.aIConversation.update.mockResolvedValue({});

    await bridge.onExecutionEvent({
      eventType: 'execution.token',
      executionRunId: 'run-1',
      summary: '结论：风险可控',
    });
    await bridge.onExecutionResult({
      executionRunId: 'run-1',
      status: 'completed',
      summary: '任务执行完成',
    });

    expect(mockPrisma.aIMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-1' },
        data: expect.objectContaining({
          content: expect.stringContaining('结论：风险可控'),
          metadata: expect.objectContaining({
            format: 'ui-message',
            status: 'done',
            executionRunId: 'run-1',
          }),
        }),
      }),
    );
    const tail = publishedChunks().slice(-3);
    expect(tail.map((c) => c.type)).toEqual([
      'text-end',
      'finish-step',
      'finish',
    ]);
  });

  it('failed 终态：错误文案进正文并置 status failed', async () => {
    mockPrisma.execution.findUnique.mockResolvedValue(assistantRun);
    mockPrisma.aIMessage.update.mockResolvedValue({});

    await bridge.onExecutionResult({
      executionRunId: 'run-1',
      status: 'failed',
      error: { message: 'CLI 进程退出码 1' },
    });

    expect(mockPrisma.aIMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.stringContaining('CLI 进程退出码 1'),
          metadata: expect.objectContaining({ status: 'failed' }),
        }),
      }),
    );
    const chunks = publishedChunks();
    expect(chunks.some((c) => c.type === 'text-delta')).toBe(true);
    expect(chunks[chunks.length - 1].type).toBe('finish');
  });
});

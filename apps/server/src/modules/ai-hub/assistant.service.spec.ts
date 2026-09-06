import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AiHubService } from './ai-hub.service';
import { RuntimeService } from '../runtime/runtime.service';
import { ExecutionService } from '../execution/execution.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { MemoryService } from '../memory/memory.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

describe('AssistantService', () => {
  let service: AssistantService;

  const mockPrisma = {
    member: {
      findUnique: jest.fn().mockResolvedValue({ id: 'member-xiaozhou' }),
    },
    aIConversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    aIMessage: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockAiHub = {
    chat: jest.fn(),
  };
  const mockRuntime = {
    listRegistrations: jest.fn(),
    createDispatch: jest.fn(),
  };
  const mockExecution = {
    createExecutionRun: jest.fn(),
  };
  const mockAdapterRegistry = {
    listAdapters: jest.fn().mockReturnValue([]),
  };
  const mockAssistantTools = {
    describeTools: jest.fn().mockReturnValue({ tools: [] }),
    renderCatalogForPrompt: jest.fn().mockReturnValue('TOOLS'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiHubService, useValue: mockAiHub },
        { provide: RuntimeService, useValue: mockRuntime },
        { provide: ExecutionService, useValue: mockExecution },
        { provide: AdapterRegistryService, useValue: mockAdapterRegistry },
        { provide: AssistantToolsService, useValue: mockAssistantTools },
        // 记忆切片注入：默认无记忆（recall 返回空），指令注入为旁路
        {
          provide: MemoryService,
          useValue: { recall: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: MessageBusService,
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get(AssistantService);
  });

  describe('getCurrentConversation', () => {
    it('命中既有长驻会话时直接返回，不新建（按 updatedAt 新→旧取第一条）', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          projectId: null,
          metadata: { mainAssistant: true },
          createdBy: 'u1',
        },
        { id: 'conv-plain', projectId: null, metadata: null, createdBy: 'u1' },
      ]);
      mockPrisma.aIMessage.findMany.mockResolvedValue([
        { id: 'm1', role: 'user', content: 'hi' },
      ]);

      const result = await service.getCurrentConversation(null, 'u1');

      expect(result.conversationId).toBe('conv-1');
      expect(result.messages).toHaveLength(1);
      expect(mockPrisma.aIConversation.create).not.toHaveBeenCalled();
      // scope 过滤 + 当前会话 = updatedAt 最新
      expect(mockPrisma.aIConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdBy: 'u1', projectId: null },
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('无长驻会话时创建并打 mainAssistant 标记', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([]);
      mockPrisma.aIConversation.create.mockResolvedValue({
        id: 'conv-new',
        projectId: 'p1',
        metadata: { mainAssistant: true },
      });
      mockPrisma.aIMessage.findMany.mockResolvedValue([]);

      const result = await service.getCurrentConversation('p1', 'u1');

      expect(result.conversationId).toBe('conv-new');
      expect(mockPrisma.aIConversation.create).toHaveBeenCalledWith({
        data: {
          projectId: 'p1',
          createdBy: 'u1',
          title: 'Main AI Assistant',
          metadata: { mainAssistant: true },
        },
      });
    });

    it('普通会话不冒充长驻会话（JS 侧过滤 metadata 标记）', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        { id: 'conv-plain', projectId: null, metadata: null, createdBy: 'u1' },
      ]);
      mockPrisma.aIConversation.create.mockResolvedValue({
        id: 'conv-new',
        projectId: null,
        metadata: { mainAssistant: true },
      });
      mockPrisma.aIMessage.findMany.mockResolvedValue([]);

      const result = await service.getCurrentConversation(null, 'u1');

      expect(result.conversationId).toBe('conv-new');
    });
  });

  describe('sendMessage', () => {
    it('注入人格 systemInstruction 并复用既有会话', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        { id: 'conv-1', projectId: 'p1', metadata: { mainAssistant: true } },
      ]);
      mockAiHub.chat.mockResolvedValue({
        conversationId: 'conv-1',
        message: { id: 'm2', role: 'assistant', content: 'ok' },
      });

      const result = await service.sendMessage('项目进展如何', 'p1', 'u1');

      expect(result.message.content).toBe('ok');
      expect(result.mode).toBe('sync');
      expect(mockAiHub.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          projectId: 'p1',
          message: { role: 'user', content: '项目进展如何' },
          systemInstruction: expect.stringContaining('小周'),
          contextHints: expect.objectContaining({
            includeProjectSummary: true,
          }),
        }),
        'u1',
      );
    });

    it('viewing 为 task 时映射 taskId + includeTaskDetails，其余类型注入文本行', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        { id: 'conv-1', projectId: 'p1', metadata: { mainAssistant: true } },
      ]);
      mockAiHub.chat.mockResolvedValue({
        conversationId: 'conv-1',
        message: { id: 'm2', role: 'assistant', content: 'ok' },
      });

      await service.sendMessage(
        '这个任务怎么样',
        'p1',
        'u1',
        undefined,
        undefined,
        {
          type: 'task',
          id: 'task-9',
          title: '登录重构',
        },
      );

      expect(mockAiHub.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-9',
          contextHints: expect.objectContaining({ includeTaskDetails: true }),
        }),
        'u1',
      );

      await service.sendMessage(
        '这个文档呢',
        'p1',
        'u1',
        undefined,
        undefined,
        {
          type: 'document',
          id: 'doc-1',
          title: '需求说明',
        },
      );

      const secondCall = mockAiHub.chat.mock.calls[1][0];
      expect(secondCall.taskId).toBeUndefined();
      expect(secondCall.systemInstruction).toContain('文档「需求说明」');
    });

    it('显式 model 写入会话记忆并按 llm:<provider> 选适配器', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          projectId: 'p1',
          metadata: { mainAssistant: true },
          updatedAt: new Date(),
        },
      ]);
      mockAiHub.chat.mockResolvedValue({
        conversationId: 'conv-1',
        message: { id: 'm2', role: 'assistant', content: 'ok' },
      });

      await service.sendMessage(
        '换个模型答我',
        'p1',
        'u1',
        undefined,
        'llm:glm',
      );

      expect(mockPrisma.aIConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: {
            metadata: { mainAssistant: true, model: 'llm:glm' },
          },
        }),
      );
      expect(mockAiHub.chat).toHaveBeenCalledWith(
        expect.objectContaining({ modelPreference: 'glm' }),
        'u1',
      );
    });

    it('会话记忆的模型在未显式指定时生效', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          projectId: 'p1',
          metadata: { mainAssistant: true, model: 'gpt-4o' },
        },
      ]);
      mockAiHub.chat.mockResolvedValue({
        conversationId: 'conv-1',
        message: { id: 'm2', role: 'assistant', content: 'ok' },
      });

      await service.sendMessage('继续', 'p1', 'u1');

      expect(mockAiHub.chat).toHaveBeenCalledWith(
        expect.objectContaining({ modelPreference: 'gpt-4o' }),
        'u1',
      );
    });
  });

  describe('sendMessage 走 CLI 对话桥', () => {
    const onlineConv = {
      id: 'conv-1',
      projectId: 'p1',
      createdBy: 'u1',
      metadata: { mainAssistant: true },
      updatedAt: new Date(),
    };

    it('cli 模型：建占位消息 + ExecutionRun（input 带 conversationId/messageId）+ 派发', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([onlineConv]);
      mockPrisma.aIMessage.create.mockResolvedValue({ id: 'm-x' });
      mockExecution.createExecutionRun.mockResolvedValue({ id: 'run-77' });
      mockRuntime.listRegistrations.mockResolvedValue([
        {
          runtimeId: 'rt-1',
          status: 'online',
          workspaceRoots: ['E:/demo'],
          cliProviders: ['claude-code'],
        },
      ]);

      const result = await service.sendMessage(
        '帮我梳理风险',
        'p1',
        'u1',
        undefined,
        'cli',
      );

      expect(result).toMatchObject({
        conversationId: 'conv-1',
        mode: 'runtime',
        executionRunId: 'run-77',
        runtimeId: 'rt-1',
        status: 'pending',
      });
      // 占位消息：running 状态 + UIMessage 格式标记
      expect(mockPrisma.aIMessage.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.aIMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'assistant',
            metadata: expect.objectContaining({
              format: 'ui-message',
              status: 'running',
              source: 'assistant-chat',
            }),
          }),
        }),
      );
      expect(mockExecution.createExecutionRun).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'p1',
          identitySource: 'cli',
          input: expect.objectContaining({
            source: 'assistant-chat',
            conversationId: 'conv-1',
          }),
        }),
      );
      // prompt 带 transcript 与回写指引
      expect(mockRuntime.createDispatch).toHaveBeenCalledWith(
        'rt-1',
        expect.objectContaining({
          executionRunId: 'run-77',
          prompt: expect.stringContaining('对话记录'),
          timeout: 300_000,
        }),
      );
    });

    it('cli:<providerId> 按 provider 定向在线通道，无匹配则 400', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([onlineConv]);
      mockRuntime.listRegistrations.mockResolvedValue([
        {
          runtimeId: 'rt-1',
          status: 'online',
          workspaceRoots: ['E:/demo'],
          cliProviders: ['codex'],
        },
      ]);

      await expect(
        service.sendMessage('hi', 'p1', 'u1', undefined, 'cli:claude-code'),
      ).rejects.toThrow(/claude-code/);
    });

    it('工作区全局作用域（无 projectId）拒绝 CLI 模型并给出可读提示', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        { ...onlineConv, projectId: null },
      ]);
      mockRuntime.listRegistrations.mockResolvedValue([
        { runtimeId: 'rt-1', status: 'online', cliProviders: ['claude-code'] },
      ]);

      await expect(
        service.sendMessage('hi', null, 'u1', undefined, 'cli'),
      ).rejects.toThrow(/项目上下文/);
      expect(mockExecution.createExecutionRun).not.toHaveBeenCalled();
    });

    it('无在线 runtime 时 400', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([onlineConv]);
      mockRuntime.listRegistrations.mockResolvedValue([
        { runtimeId: 'rt-1', status: 'offline' },
      ]);

      await expect(
        service.sendMessage('hi', 'p1', 'u1', undefined, 'cli'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listModels', () => {
    it('聚合在线 CLI 通道与已启用 LLM provider', async () => {
      mockRuntime.listRegistrations.mockResolvedValue([
        {
          runtimeId: 'rt-1',
          status: 'online',
          cliProviders: ['claude-code', 'codex'],
        },
        { runtimeId: 'rt-2', status: 'offline', cliProviders: ['zcode'] },
      ]);
      mockAdapterRegistry.listAdapters.mockReturnValue([
        { provider: 'openai', model: 'gpt-4o' },
      ]);

      const result = await service.listModels();

      const ids = result.models.map((m: { id: string }) => m.id);
      expect(ids).toContain('cli');
      expect(ids).toContain('cli:claude-code');
      expect(ids).toContain('cli:codex');
      expect(ids).not.toContain('cli:zcode');
      expect(ids).toContain('llm:openai');
      const llm = result.models.find(
        (m: { id: string }) => m.id === 'llm:openai',
      );
      expect(llm).toMatchObject({ type: 'llm', model: 'gpt-4o' });
    });
  });

  describe('显式 conversationId（切换历史会话）', () => {
    const own = {
      id: 'conv-a',
      projectId: 'p1',
      createdBy: 'u1',
      metadata: { mainAssistant: true },
    };

    it('本人长驻会话返回其消息', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue(own);
      mockPrisma.aIMessage.findMany.mockResolvedValue([
        { id: 'm1', role: 'user', content: 'q' },
      ]);

      const result = await service.getCurrentConversation('p1', 'u1', 'conv-a');

      expect(result.conversationId).toBe('conv-a');
      expect(result.messages).toHaveLength(1);
    });

    it('非长驻会话拒绝', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        ...own,
        metadata: null,
      });
      await expect(
        service.getCurrentConversation('p1', 'u1', 'conv-a'),
      ).rejects.toThrow(BadRequestException);
    });

    it('scope 不匹配拒绝（跨作用域切换）', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue(own);
      await expect(
        service.getCurrentConversation(null, 'u1', 'conv-a'),
      ).rejects.toThrow(BadRequestException);
    });

    it('他人会话拒绝', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        ...own,
        createdBy: 'u2',
      });
      await expect(
        service.getCurrentConversation('p1', 'u1', 'conv-a'),
      ).rejects.toThrow(BadRequestException);
    });

    it('发送到指定历史会话', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue(own);
      mockAiHub.chat.mockResolvedValue({
        conversationId: 'conv-a',
        message: { id: 'm9', role: 'assistant', content: 'ok' },
      });

      await service.sendMessage('继续', 'p1', 'u1', 'conv-a');

      expect(mockAiHub.chat).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-a' }),
        'u1',
      );
    });
  });

  describe('listConversations', () => {
    it('仅返回长驻会话并带消息数', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([
        {
          id: 'conv-a',
          projectId: null,
          metadata: { mainAssistant: true },
          title: 'A',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'conv-plain',
          projectId: null,
          metadata: null,
          title: 'x',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'conv-b',
          projectId: null,
          metadata: { mainAssistant: true },
          title: 'B',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.aIMessage.groupBy.mockResolvedValue([
        { conversationId: 'conv-a', _count: { conversationId: 4 } },
      ]);

      const result = await service.listConversations(null, 'u1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'conv-a', messageCount: 4 });
      expect(result[1]).toMatchObject({ id: 'conv-b', messageCount: 0 });
    });
  });

  describe('createConversation', () => {
    it('新建长驻会话并返回空消息视图', async () => {
      mockPrisma.aIConversation.create.mockResolvedValue({
        id: 'conv-new',
        projectId: null,
        metadata: { mainAssistant: true },
      });

      const result = await service.createConversation(null, 'u1');

      expect(result).toEqual({
        conversationId: 'conv-new',
        projectId: null,
        messages: [],
      });
    });
  });

  describe('dispatchExecution', () => {
    it('无在线 runtime 时抛 400（提示启动守护进程）', async () => {
      mockRuntime.listRegistrations.mockResolvedValue([
        { runtimeId: 'rt-1', status: 'offline' },
      ]);

      await expect(
        service.dispatchExecution('排一下本周', 'p1', 'u1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockExecution.createExecutionRun).not.toHaveBeenCalled();
    });

    it('在线时建 ExecutionRun 并派发（prompt 带 PM 人格与项目上下文）', async () => {
      mockRuntime.listRegistrations.mockResolvedValue([
        {
          runtimeId: 'rt-1',
          status: 'online',
          workspaceRoots: ['E:/demo'],
        },
      ]);
      mockExecution.createExecutionRun.mockResolvedValue({ id: 'run-1' });
      mockRuntime.createDispatch.mockResolvedValue(undefined);

      const result = await service.dispatchExecution('排一下本周', 'p1', 'u1');

      expect(result).toEqual({
        executionRunId: 'run-1',
        runtimeId: 'rt-1',
        status: 'pending',
      });
      expect(mockExecution.createExecutionRun).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'p1',
          subjectType: 'platform_ai_member',
          subjectId: 'member-xiaozhou',
          identitySource: 'cli',
          goal: '排一下本周',
          createdBy: 'u1',
        }),
      );
      expect(mockRuntime.createDispatch).toHaveBeenCalledWith(
        'rt-1',
        expect.objectContaining({
          executionRunId: 'run-1',
          projectId: 'p1',
          prompt: expect.stringContaining('小周'),
          workspaceRoot: 'E:/demo',
          timeout: 300_000,
          status: 'pending',
        }),
      );
    });
  });
});

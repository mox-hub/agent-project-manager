import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AiHubService } from './ai-hub.service';
import { RuntimeService } from '../runtime/runtime.service';
import { ExecutionService } from '../execution/execution.service';

describe('AssistantService', () => {
  let service: AssistantService;

  const mockPrisma = {
    aIConversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    aIMessage: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiHubService, useValue: mockAiHub },
        { provide: RuntimeService, useValue: mockRuntime },
        { provide: ExecutionService, useValue: mockExecution },
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
          subjectId: 'main-assistant',
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

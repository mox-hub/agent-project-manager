import { Test, TestingModule } from '@nestjs/testing';
import { AssistantService } from './assistant.service';
import { PrismaService } from '../../core/database/prisma.service';
import { AiHubService } from './ai-hub.service';

describe('AssistantService', () => {
  let service: AssistantService;

  const mockPrisma = {
    aIConversation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    aIMessage: {
      findMany: jest.fn(),
    },
  };
  const mockAiHub = {
    chat: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiHubService, useValue: mockAiHub },
      ],
    }).compile();
    service = moduleRef.get(AssistantService);
  });

  describe('getCurrentConversation', () => {
    it('命中既有长驻会话时直接返回，不新建', async () => {
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
      // scope 过滤：全局会话按 projectId: null 查询
      expect(mockPrisma.aIConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdBy: 'u1', projectId: null },
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
});

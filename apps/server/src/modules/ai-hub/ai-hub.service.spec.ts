import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { AiHubService } from './ai-hub.service';
import { ContextBuilderService } from './services/context-builder.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { EncryptionService } from '../../core/crypto/encryption.service';

describe('AiHubService', () => {
  let service: AiHubService;

  const mockPrismaService = {
    aIModelConfig: { findMany: jest.fn() },
    aIConversation: { findUnique: jest.fn(), create: jest.fn() },
    aIUsageLog: { findMany: jest.fn() },
  };

  const mockMessageBusService = {
    publish: jest.fn(),
  };

  const mockContextBuilderService = {
    buildContext: jest.fn(),
    formatContextForPrompt: jest.fn(),
  };

  const mockAdapterRegistryService = {
    getAdapterByModel: jest.fn(),
    getLoadedProviders: jest.fn().mockReturnValue(['openai']),
    getAdapter: jest.fn(),
    listAdapters: jest.fn().mockReturnValue([{ provider: 'openai', model: 'gpt-4' }]),
  };

  const mockEncryptionService = {
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiHubService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MessageBusService, useValue: mockMessageBusService },
        { provide: ContextBuilderService, useValue: mockContextBuilderService },
        { provide: AdapterRegistryService, useValue: mockAdapterRegistryService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<AiHubService>(AiHubService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getModels should merge db models and registered adapters', async () => {
    mockPrismaService.aIModelConfig.findMany.mockResolvedValue([
      {
        id: 'm-1',
        name: 'db-model',
        provider: 'openai',
        taskTypes: ['chat'],
        maxTokens: 4096,
        enabled: true,
      },
    ]);

    const result = await service.getModels();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'm-1', name: 'db-model' }),
      ]),
    );
  });

  it('getConversation should reject non-owner access', async () => {
    mockPrismaService.aIConversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      createdBy: 'other-user',
      messages: [],
      project: null,
      task: null,
    });

    await expect(service.getConversation('conv-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('getUsage should aggregate token and cost by model', async () => {
    mockPrismaService.aIUsageLog.findMany.mockResolvedValue([
      {
        modelName: 'gpt-4.1-mini',
        totalTokens: 100,
        estimatedCost: 0.01,
      },
      {
        modelName: 'gpt-4.1-mini',
        totalTokens: 300,
        estimatedCost: 0.02,
      },
      {
        modelName: 'gpt-4.1',
        totalTokens: 200,
        estimatedCost: 0.05,
      },
    ]);

    const usage = await service.getUsage({});

    expect(usage.totalTokens).toBe(600);
    expect(usage.totalCost).toBeCloseTo(0.08, 6);
    expect(usage.byModel).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modelName: 'gpt-4.1-mini',
          totalTokens: 400,
          totalCost: 0.03,
        }),
        expect.objectContaining({
          modelName: 'gpt-4.1',
          totalTokens: 200,
          totalCost: 0.05,
        }),
      ]),
    );
  });
});

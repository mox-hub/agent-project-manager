import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../core/database/prisma.service';
import { EncryptionService } from '../../../core/crypto/encryption.service';
import { MessageBusService } from '../../../core/message-bus/message-bus.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { AiSdkAdapterFactory } from '../adapters/ai-sdk-adapter.factory';
import { ProviderConfigService } from './provider-config.service';
import { AIProviderType } from '../dto/provider-config.dto';

describe('ProviderConfigService', () => {
  let service: ProviderConfigService;

  const mockPrisma = {
    aIProviderConfig: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    aIModelConfig: {
      upsert: jest.fn(),
    },
  };

  const mockEncryption = {
    encrypt: jest.fn((v: string) => `enc:${v}`),
    decrypt: jest.fn((v: string) =>
      v.startsWith('enc:') ? v.slice(4) : v,
    ),
  };

  const mockMessageBus = {
    publish: jest.fn(),
  };

  const mockAdapterRegistry = {
    reload: jest.fn(),
  };

  const mockAdapter = {
    validateConnection: jest.fn(),
  };

  const mockAdapterFactory = {
    create: jest.fn().mockReturnValue(mockAdapter),
    createFromConfig: jest.fn(),
  };

  const baseProvider = {
    id: 'p-1',
    provider: 'openai',
    displayName: 'OpenAI',
    sdkType: 'openai',
    apiKeyEnc: 'enc:sk-test',
    baseUrl: null,
    organizationId: null,
    metadata: null,
    enabled: true,
    status: 'disconnected',
    lastValidatedAt: null,
    errorMessage: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderConfigService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: MessageBusService, useValue: mockMessageBus },
        { provide: AdapterRegistryService, useValue: mockAdapterRegistry },
        { provide: AiSdkAdapterFactory, useValue: mockAdapterFactory },
      ],
    }).compile();

    service = module.get<ProviderConfigService>(ProviderConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listProviders', () => {
    it('should return providers without exposing the API key', async () => {
      mockPrisma.aIProviderConfig.findMany.mockResolvedValue([
        { ...baseProvider, apiKeyEnc: 'enc:sk-secret' },
      ]);

      const result = await service.listProviders();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          provider: 'openai',
          displayName: 'OpenAI',
          hasApiKey: true,
        }),
      );
      // 敏感字段不得出现在响应中
      expect(JSON.stringify(result)).not.toContain('sk-secret');
      expect(result[0]).not.toHaveProperty('apiKeyEnc');
    });
  });

  describe('getProvider', () => {
    it('should return a single provider when found', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);

      const result = await service.getProvider('p-1');
      expect(result.id).toBe('p-1');
      expect(result.hasApiKey).toBe(true);
    });

    it('should throw NotFoundException when provider is missing', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(null);

      await expect(service.getProvider('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createProvider', () => {
    it('should encrypt the api key, set disconnected status and reload adapter', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(null);
      mockPrisma.aIProviderConfig.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...baseProvider, ...data }),
      );

      const result = await service.createProvider({
        provider: AIProviderType.OPENAI,
        displayName: 'OpenAI',
        apiKey: 'sk-test',
      });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith('sk-test');
      expect(mockPrisma.aIProviderConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'openai',
          apiKeyEnc: 'enc:sk-test',
          status: 'disconnected',
          sdkType: 'openai',
        }),
      });
      expect(mockAdapterRegistry.reload).toHaveBeenCalledWith('openai');
      expect(mockMessageBus.publish).toHaveBeenCalledWith('ai.provider.updated', {
        action: 'created',
        provider: 'openai',
      });
      expect(result.hasApiKey).toBe(true);
    });

    it('should throw BadRequestException when provider already exists', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);

      await expect(
        service.createProvider({
          provider: AIProviderType.OPENAI,
          displayName: 'OpenAI',
          apiKey: 'sk-test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProvider', () => {
    it('should throw NotFoundException when provider is missing', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(null);

      await expect(service.updateProvider('p-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should encrypt a new api key when provided', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);
      mockPrisma.aIProviderConfig.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...baseProvider, ...data }),
      );

      await service.updateProvider('p-1', { apiKey: 'sk-new' });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith('sk-new');
      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({ apiKeyEnc: 'enc:sk-new' }),
      });
      expect(mockAdapterRegistry.reload).toHaveBeenCalledWith('openai');
    });

    it('should clear the api key and reset validation when empty string passed', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);
      mockPrisma.aIProviderConfig.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...baseProvider, ...data }),
      );

      await service.updateProvider('p-1', { apiKey: '' });

      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          apiKeyEnc: null,
          status: 'disconnected',
          errorMessage: null,
          lastValidatedAt: null,
        }),
      });
    });
  });

  describe('deleteProvider', () => {
    it('should delete and reload the adapter', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);
      mockPrisma.aIProviderConfig.delete.mockResolvedValue(baseProvider);

      await service.deleteProvider('p-1');

      expect(mockPrisma.aIProviderConfig.delete).toHaveBeenCalledWith({
        where: { id: 'p-1' },
      });
      expect(mockAdapterRegistry.reload).toHaveBeenCalledWith('openai');
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        'ai.provider.updated',
        { action: 'deleted', provider: 'openai' },
      );
    });

    it('should throw NotFoundException when provider is missing', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(null);

      await expect(service.deleteProvider('p-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateProvider', () => {
    it('should return valid result when the adapter validates successfully', async () => {
      mockAdapter.validateConnection.mockResolvedValue({
        valid: true,
        models: ['gpt-4o'],
      });

      const result = await service.validateProvider({
        provider: AIProviderType.OPENAI,
        apiKey: 'sk-test',
      });

      expect(mockAdapterFactory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          sdkType: 'openai',
          apiKey: 'sk-test',
          defaultModel: 'gpt-4o',
        }),
      );
      expect(result).toEqual({ valid: true, models: ['gpt-4o'], error: undefined });
    });

    it('should return invalid result when validation fails', async () => {
      mockAdapter.validateConnection.mockResolvedValue({
        valid: false,
        error: 'Invalid API key',
      });

      const result = await service.validateProvider({
        provider: AIProviderType.OPENAI,
        apiKey: 'sk-bad',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('testSavedProvider', () => {
    it('should persist connected status on success', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);
      mockEncryption.decrypt.mockReturnValue('sk-test');
      mockAdapter.validateConnection.mockResolvedValue({
        valid: true,
        models: [],
      });
      mockPrisma.aIProviderConfig.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...baseProvider, ...data }),
      );

      const result = await service.testSavedProvider('p-1');

      expect(mockEncryption.decrypt).toHaveBeenCalledWith('enc:sk-test');
      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          status: 'connected',
          errorMessage: null,
        }),
      });
      expect(result.valid).toBe(true);
    });

    it('should persist error status on failure', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);
      mockEncryption.decrypt.mockReturnValue('sk-test');
      mockAdapter.validateConnection.mockResolvedValue({
        valid: false,
        error: 'Bad key',
      });
      mockPrisma.aIProviderConfig.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...baseProvider, ...data }),
      );

      const result = await service.testSavedProvider('p-1');

      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          status: 'error',
          errorMessage: 'Bad key',
        }),
      });
      expect(result.valid).toBe(false);
    });

    it('should throw BadRequestException when provider has no api key', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...baseProvider,
        apiKeyEnc: null,
      });

      await expect(service.testSavedProvider('p-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('detectModels', () => {
    it('should upsert detected models into AIModelConfig', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(baseProvider);
      mockEncryption.decrypt.mockReturnValue('sk-test');
      mockAdapter.validateConnection.mockResolvedValue({
        valid: true,
        models: ['gpt-4o', 'gpt-4o-mini'],
      });
      mockPrisma.aIModelConfig.upsert.mockResolvedValue({});

      const models = await service.detectModels('p-1');

      expect(mockPrisma.aIModelConfig.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.aIModelConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idx_ai_model_configs_name_provider: {
              name: 'gpt-4o',
              provider: 'openai',
            },
          },
          create: expect.objectContaining({
            name: 'gpt-4o',
            provider: 'openai',
            enabled: true,
          }),
        }),
      );
      expect(models).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });
  });
});

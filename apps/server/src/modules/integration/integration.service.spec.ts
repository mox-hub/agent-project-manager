import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { EncryptionService } from '../../core/crypto/encryption.service';
import { IntegrationService } from './integration.service';
import { IntegrationScope } from './dto/create-integration-config.dto';

describe('IntegrationService', () => {
  let service: IntegrationService;
  const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;

  const mockPrismaService = {
    project: { findUnique: jest.fn() },
    integrationConfig: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    externalIssueLink: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockMessageBusService = { publish: jest.fn() };
  const mockEncryption = {
    encryptJson: (obj: unknown) =>
      `iv:cipher:tag:${JSON.stringify(obj).slice(0, 16)}`,
    decryptJson: (payload: string) => {
      const [_, content] = payload.split(':cipher:tag:');
      void _;
      try {
        return JSON.parse(content ?? '{}');
      } catch {
        return {};
      }
    },
    encrypt: (plaintext: string) => `iv:${plaintext}:tag`,
    decrypt: (payload: string) => payload.split(':')[1] ?? '',
  };

  beforeEach(async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = '12345678901234567890123456789012';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MessageBusService, useValue: mockMessageBusService },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = originalKey;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createIntegrationConfig should throw when project not found', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue(null);

    await expect(
      service.createIntegrationConfig(
        {
          provider: 'github',
          scope: IntegrationScope.PROJECT,
          projectId: 'p-1',
          name: 'GitHub',
          config: { token: 'secret' },
        },
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('getIntegrationConfigs should enforce project membership', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'p-1',
      members: [{ userId: 'another-user' }],
    });

    await expect(
      service.getIntegrationConfigs({ projectId: 'p-1' }, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updateIntegrationConfig should publish update event', async () => {
    mockPrismaService.integrationConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      provider: 'github',
      scope: 'global',
      projectId: null,
    });
    mockPrismaService.integrationConfig.update.mockResolvedValue({
      id: 'cfg-1',
      provider: 'github',
      scope: 'global',
      name: 'GitHub Updated',
      configJson: 'encrypted',
    });

    const result = await service.updateIntegrationConfig(
      'cfg-1',
      { name: 'GitHub Updated' },
      'user-1',
    );

    expect(result.id).toBe('cfg-1');
    expect(mockMessageBusService.publish).toHaveBeenCalledWith(
      'integration.config.updated',
      expect.objectContaining({ id: 'cfg-1', provider: 'github' }),
    );
  });
});

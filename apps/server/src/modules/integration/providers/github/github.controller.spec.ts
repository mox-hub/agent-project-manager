import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../../../core/database/prisma.service';
import { MessageBusService } from '../../../../core/message-bus/message-bus.service';
import { EncryptionService } from '../../../../core/crypto/encryption.service';
import { AccessTokenService } from '../../../auth/access-token.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { IntegrationService } from '../../integration.service';
import { GitHubController } from './github.controller';
import { GitHubSyncService } from './github-sync.service';
import { GitHubSDKService } from './github-sdk.service';

/**
 * P0 收敛性修复（集成接入规范 v0 §2.5 R1/R2）：
 * - R1/B6：test-inline 必须落在 JWT guard 内（匿名代理滥用面清零）
 * - R2/B7/D8：webhook 无 secret 配置一律拒绝（不再"带任意 signature 即放行"）
 */
describe('GitHubController - P0 security (R1/R2)', () => {
  let controller: GitHubController;

  const WEBHOOK_SECRET = 'whsec_test';

  const mockSyncService = {
    testConnection: vi.fn(),
    getSyncLogs: vi.fn(),
    createPullRequest: vi.fn(),
    syncPullRequest: vi.fn(),
    handlePullRequestEvent: vi.fn().mockResolvedValue(undefined),
    handlePullRequestReviewEvent: vi.fn().mockResolvedValue(undefined),
    handleCheckRunEvent: vi.fn().mockResolvedValue(undefined),
  };
  const mockSdkService = { createClient: vi.fn() };
  const mockPrismaService = {
    webhookEventLog: {
      create: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'log-1', ...data }),
        ),
      update: vi.fn().mockResolvedValue({}),
    },
    integrationConfig: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  const mockMessageBusService = { publish: vi.fn() };
  const mockEncryptionService = {
    decryptJson: vi.fn().mockReturnValue({ webhookSecret: WEBHOOK_SECRET }),
  };
  const mockIntegrationService = {
    assertIntegrationAccess: vi.fn().mockResolvedValue({ id: 'cfg-1' }),
  };
  // JwtAuthGuard（test-inline 方法级 guard）的构造依赖，TestingModule 编译时需可解析
  const mockReflector = { getAllAndOverride: vi.fn() };
  const mockAccessTokenService = { validate: vi.fn().mockResolvedValue(null) };

  beforeEach(async () => {
    // 默认：配置解密出 webhookSecret（个别用例自行覆盖为空 secret）
    mockEncryptionService.decryptJson.mockReturnValue({
      webhookSecret: WEBHOOK_SECRET,
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubController],
      providers: [
        { provide: GitHubSyncService, useValue: mockSyncService },
        { provide: GitHubSDKService, useValue: mockSdkService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MessageBusService, useValue: mockMessageBusService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: IntegrationService, useValue: mockIntegrationService },
        { provide: Reflector, useValue: mockReflector },
        { provide: AccessTokenService, useValue: mockAccessTokenService },
      ],
    }).compile();

    controller = module.get<GitHubController>(GitHubController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const makeRawBody = (payload: unknown) =>
    Buffer.from(JSON.stringify(payload));
  const sign = (body: Buffer, secret: string) =>
    `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  const makeReq = (rawBody: Buffer) => ({ rawBody }) as unknown as never;

  describe('R1/B6: test-inline requires JWT auth', () => {
    it('test-inline endpoint is guarded by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        GitHubController.prototype.testInline,
      ) as Array<new (...args: never[]) => unknown>;
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('R2/B7/D8: webhook without secret is always rejected', () => {
    it('rejects with 401 when no enabled github config exists (any signature)', async () => {
      mockPrismaService.integrationConfig.findMany.mockResolvedValue([]);
      const body = makeRawBody({ action: 'opened' });

      await expect(
        controller.webhook(
          'pull_request',
          'delivery-1',
          sign(body, 'attacker-guess'),
          makeReq(body),
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.webhookEventLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ processed: false }),
        }),
      );
      expect(mockSyncService.handlePullRequestEvent).not.toHaveBeenCalled();
    });

    it('rejects with 401 when configs exist but no webhook secret is configured', async () => {
      mockPrismaService.integrationConfig.findMany.mockResolvedValue([
        { id: 'cfg-1', configJson: 'encrypted' },
      ]);
      mockEncryptionService.decryptJson.mockReturnValue({});
      const body = makeRawBody({ action: 'opened' });

      await expect(
        controller.webhook(
          'pull_request',
          'delivery-2',
          sign(body, WEBHOOK_SECRET),
          makeReq(body),
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.webhookEventLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            processed: false,
            errorMessage: 'No webhook secret configured',
          }),
        }),
      );
      expect(mockSyncService.handlePullRequestEvent).not.toHaveBeenCalled();
    });

    it('rejects with 401 on signature mismatch', async () => {
      mockPrismaService.integrationConfig.findMany.mockResolvedValue([
        { id: 'cfg-1', configJson: 'encrypted' },
      ]);
      const body = makeRawBody({ action: 'opened' });

      await expect(
        controller.webhook(
          'pull_request',
          'delivery-3',
          sign(body, 'wrong-secret'),
          makeReq(body),
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockSyncService.handlePullRequestEvent).not.toHaveBeenCalled();
    });

    it('accepts a correctly signed event when a secret is configured', async () => {
      mockPrismaService.integrationConfig.findMany.mockResolvedValue([
        { id: 'cfg-1', configJson: 'encrypted' },
      ]);
      const body = makeRawBody({
        action: 'opened',
        pull_request: { number: 1 },
      });

      const res = await controller.webhook(
        'pull_request',
        'delivery-4',
        sign(body, WEBHOOK_SECRET),
        makeReq(body),
      );

      expect(res).toEqual({ ok: true });
      expect(mockSyncService.handlePullRequestEvent).toHaveBeenCalled();
      expect(mockPrismaService.webhookEventLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            processed: true,
            errorMessage: null,
          }),
        }),
      );
    });
  });
});

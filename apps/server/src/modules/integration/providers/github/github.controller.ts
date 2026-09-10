import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  UnauthorizedException,
  Headers,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'node:crypto';
import { Allow } from 'class-validator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../../core/database/prisma.service';
import { MessageBusService } from '../../../../core/message-bus/message-bus.service';
import { EncryptionService } from '../../../../core/crypto/encryption.service';
import { IntegrationService } from '../../integration.service';
import { GitHubSyncService } from './github-sync.service';
import { GitHubSDKService } from './github-sdk.service';
import { GitHubApiError } from './github-client';
import {
  GitHubCreatePrResponseDto,
  GitHubPullRequestDto,
  GitHubSyncLogDto,
  GitHubSyncSummaryDto,
  GitHubTestConnectionResponseDto,
  GitHubTestInlineResponseDto,
} from './dto/github-response.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

/**
 * /test-inline 的最小 DTO（@Allow 让 ValidationPipe 不剥字段）
 */
class TestInlineDto {
  @ApiPropertyOptional({
    description: 'GitHub PAT（inline 凭据，可选 webhookSecret 二选一）',
  })
  @Allow()
  token?: string;

  @ApiPropertyOptional({
    description: 'Webhook 密钥（与 token 配合校验连通性）',
  })
  @Allow()
  webhookSecret?: string;
}

/**
 * GitHub Controller
 * - 大部分端点需要登录（read 操作）
 * - test-inline 用未保存凭据试连（Connect 流校验步骤），同样受 JWT 保护（规范 §2.5 R1 / D7）
 * - webhook 端点（POST /webhook）公开访问，靠 HMAC 签名校验；未配置 secret 一律拒绝（§2.5 R2 / D8）
 */
@ApiTags('Integration / GitHub')
@Controller('integrations/github')
export class GitHubController {
  private readonly logger = new Logger(GitHubController.name);

  constructor(
    private readonly sync: GitHubSyncService,
    private readonly sdk: GitHubSDKService,
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly encryption: EncryptionService,
    private readonly integrationService: IntegrationService,
  ) {}

  // ========== 受保护端点：未保存凭据试连（Connect 流校验步骤） ==========
  @Post('test-inline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Test github connection with raw token' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitHubTestInlineResponseDto,
    description: 'ok=true 时含 viewer/scopes/sampleRepo；ok=false 时含 error',
  })
  async testInline(@Body() body: TestInlineDto) {
    if (!body?.token?.trim()) {
      throw new BadRequestException('token is required');
    }
    const client = this.sdk.createClient(body.token.trim());
    try {
      const viewer = await client.fetchViewer();
      // 顺便取一个仓库列表首项（校验至少有一个仓库权限）
      let sampleRepo: {
        name: string;
        fullName: string;
        defaultBranch: string;
      } | null = null;
      try {
        const repos = await client.raw().rest.repos.listForAuthenticatedUser({
          per_page: 1,
          sort: 'pushed',
        });
        const first = repos.data?.[0];
        if (first) {
          sampleRepo = {
            name: first.name,
            fullName: first.full_name,
            defaultBranch: first.default_branch,
          };
        }
      } catch {
        // 忽略：没有 repo 读权限也不致命
      }
      return {
        ok: true,
        viewer: {
          login: viewer.login,
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          avatarUrl: viewer.avatarUrl,
        },
        scopes: viewer.scopes ?? [],
        sampleRepo,
      };
    } catch (err) {
      const msg =
        err instanceof GitHubApiError ? err.message : (err as Error).message;
      return { ok: false, error: msg };
    }
  }

  // ========== 鉴权端点 ==========
  @Get('test/:integrationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Test connection with stored config' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitHubTestConnectionResponseDto,
    description: 'ok=true 时含 viewer；ok=false 时含 error',
  })
  async test(
    @Param('integrationId') integrationId: string,
    @Req() req: Request,
  ) {
    await this.integrationService.assertIntegrationAccess(
      integrationId,
      (req.user as { id: string }).id,
    );
    return this.sync.testConnection(integrationId);
  }

  @Get(':integrationId/sync-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List sync logs' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitHubSyncLogDto,
    isArray: true,
    description: '同步日志列表（按时间倒序）',
  })
  async listLogs(
    @Param('integrationId') integrationId: string,
    @Query('limit') limit: string | undefined,
    @Req() req: Request,
  ) {
    await this.integrationService.assertIntegrationAccess(
      integrationId,
      (req.user as { id: string }).id,
    );
    const parsedLimit = limit ? parseInt(limit, 10) || 50 : 50;
    return this.sync.getSyncLogs(integrationId, parsedLimit);
  }

  @Get(':integrationId/pulls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List PRs (latest 30 by default)' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitHubPullRequestDto,
    isArray: true,
    description: 'PR 列表',
  })
  async listPullRequests(
    @Param('integrationId') integrationId: string,
    @Query('repo') repo: string,
    @Query('state') state: 'open' | 'closed' | 'all' = 'open',
    @Req() req: Request,
  ) {
    await this.integrationService.assertIntegrationAccess(
      integrationId,
      (req.user as { id: string }).id,
    );
    if (!repo)
      throw new BadRequestException(
        'repo query param required, e.g. ?repo=owner/repo',
      );
    const client = await this.sdk.getClientForIntegration(integrationId);
    const [owner, name] = repo.split('/');
    if (!owner || !name)
      throw new BadRequestException('repo must be owner/name');
    return client.listPullRequests(owner, name, state);
  }

  @Post(':integrationId/pulls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a PR (high-level dispatch helper)' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: GitHubCreatePrResponseDto,
    description: '返回 { ok, pr }',
  })
  async createPullRequest(
    @Param('integrationId') integrationId: string,
    @Body()
    body: {
      owner: string;
      repo: string;
      title: string;
      head: string;
      base: string;
      body?: string;
      draft?: boolean;
      acceptanceId?: string;
      executionRunId?: string;
    },
    @Req() req: Request,
  ) {
    await this.integrationService.assertIntegrationAccess(
      integrationId,
      (req.user as { id: string }).id,
    );
    return this.sync.createPullRequest(integrationId, {
      owner: body.owner,
      repo: body.repo,
      title: body.title,
      head: body.head,
      base: body.base,
      body: body.body,
      draft: body.draft,
      acceptanceId: body.acceptanceId,
      executionRunId: body.executionRunId,
    });
  }

  @Post(':integrationId/sync/pull')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Manually sync a single PR (fallback when webhook missed)',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitHubSyncSummaryDto,
    description: '同步摘要',
  })
  async syncPull(
    @Param('integrationId') integrationId: string,
    @Body() body: { repo: string; number: number },
    @Req() req: Request,
  ) {
    await this.integrationService.assertIntegrationAccess(
      integrationId,
      (req.user as { id: string }).id,
    );
    return this.sync.syncPullRequest(integrationId, body.repo, body.number);
  }

  // ========== Webhook 端点（无需登录） ==========
  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'GitHub webhook receiver (HMAC signed)',
    deprecated: false,
  })
  async webhook(
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: Request,
  ) {
    // 1. 读取 raw body（不能用 JSON 解析，否则签名比对会失败）
    const rawBody: Buffer = this.getRawBody(req);
    const eventRecord = await this.prisma.webhookEventLog.create({
      data: {
        provider: 'github',
        eventType: event ?? 'unknown',
        payload: this.safeParseJson(rawBody) as object,
        signature: signature ?? null,
        processed: false,
      },
    });

    // 2. 校验签名（无配置 / 未配置 secret / 签名不匹配一律拒绝，§2.5 R2）
    const verdict = await this.verifyWebhookSignature(rawBody, signature);
    if (!verdict.ok) {
      this.logger.warn(
        `GitHub webhook rejected (event=${event} delivery=${deliveryId}): ${verdict.reason}`,
      );
      await this.prisma.webhookEventLog.update({
        where: { id: eventRecord.id },
        data: {
          processed: false,
          errorMessage: verdict.reason,
        },
      });
      throw new UnauthorizedException(verdict.reason);
    }

    // 3. 分发事件
    try {
      if (event === 'pull_request') {
        const payload = JSON.parse(rawBody.toString('utf8'));
        await this.sync.handlePullRequestEvent(payload);
      } else if (event === 'pull_request_review') {
        const payload = JSON.parse(rawBody.toString('utf8'));
        await this.sync.handlePullRequestReviewEvent(payload);
      } else if (event === 'check_run') {
        const payload = JSON.parse(rawBody.toString('utf8'));
        await this.sync.handleCheckRunEvent(payload);
      } else {
        this.logger.debug(`GitHub webhook event ${event} not handled`);
      }
      await this.prisma.webhookEventLog.update({
        where: { id: eventRecord.id },
        data: { processed: true, errorMessage: null },
      });
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(
        `GitHub webhook handler failed: ${msg}`,
        (err as Error).stack,
      );
      await this.prisma.webhookEventLog.update({
        where: { id: eventRecord.id },
        data: { processed: false, errorMessage: msg },
      });
      throw err;
    }

    return { ok: true };
  }

  // ============= 私有 =============

  /**
   * 获取 raw body (Express 的 req.body 在被 JSON parse 后无法再用原始字节校验签名)
   * NestJS 默认使用 body-parser；如果配置了 rawBody 选项，可以从 req.rawBody 读取。
   * 这里做一个安全 fallback：优先 req.rawBody，否则用 stream 重新读。
   */
  private getRawBody(req: Request): Buffer {
    const anyReq = req as unknown as { rawBody?: Buffer | string };
    if (anyReq.rawBody) {
      return Buffer.isBuffer(anyReq.rawBody)
        ? anyReq.rawBody
        : Buffer.from(anyReq.rawBody, 'utf8');
    }
    // 兜底：若 body 已被解析为对象，提示错误（webhook 必须用 raw）
    if (req.body && typeof req.body === 'object') {
      throw new BadRequestException(
        'GitHub webhook requires raw body. Ensure NestJS body parser is configured to retain rawBody on the /integrations/github/webhook path.',
      );
    }
    return Buffer.from('', 'utf8');
  }

  /**
   * Webhook 签名校验（规范 §2.5 R2 / D8）：
   * - 无任何 enabled github 配置 → 拒绝（webhook 不开放）
   * - 有配置但未配置 webhook secret → 一律拒绝（绝不因"带任意 signature"放行）
   * - 已配置 secret → HMAC-SHA256 必须匹配其一
   * @returns 校验结果与拒绝原因（写入 WebhookEventLog 审计）
   */
  private async verifyWebhookSignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ ok: boolean; reason: string | null }> {
    // 查找任一 enabled github integration 上的 webhook secret
    const configs = await this.prisma.integrationConfig.findMany({
      where: { provider: 'github', enabled: true },
    });
    if (configs.length === 0) {
      return { ok: false, reason: 'No enabled GitHub integration config' };
    }
    const expectedSecrets: string[] = [];
    for (const cfg of configs) {
      try {
        const decrypted = this.decryptSecretFromConfig(cfg.configJson);
        if (decrypted) expectedSecrets.push(decrypted);
      } catch {
        // skip
      }
    }
    if (expectedSecrets.length === 0) {
      // 未配置 secret 的配置不该收 webhook：一律拒绝
      return { ok: false, reason: 'No webhook secret configured' };
    }
    if (!signature) return { ok: false, reason: 'Missing signature' };
    for (const secret of expectedSecrets) {
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      const expected = `sha256=${hmac}`;
      if (this.safeEqual(expected, signature))
        return { ok: true, reason: null };
    }
    return { ok: false, reason: 'Invalid signature' };
  }

  private decryptSecretFromConfig(configJson: unknown): string | null {
    if (!configJson) return null;
    if (typeof configJson === 'object') {
      const obj = configJson as { webhookSecret?: string };
      return obj.webhookSecret ?? null;
    }
    if (typeof configJson === 'string') {
      try {
        const obj = this.encryption.decryptJson<{ webhookSecret?: string }>(
          configJson,
        );
        return obj.webhookSecret ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  }

  private safeParseJson(buf: Buffer): unknown {
    try {
      return JSON.parse(buf.toString('utf8'));
    } catch {
      return { __raw: buf.toString('utf8').slice(0, 1024) };
    }
  }
}

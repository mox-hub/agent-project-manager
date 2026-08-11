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
  NotFoundException,
  Headers,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'node:crypto';
import { Allow } from 'class-validator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../../core/database/prisma.service';
import { MessageBusService } from '../../../../core/message-bus/message-bus.service';
import { EncryptionService } from '../../../../core/crypto/encryption.service';
import { GitHubSyncService } from './github-sync.service';
import { GitHubSDKService } from './github-sdk.service';
import { GitHubClient, GitHubApiError } from './github-client';
import { Public } from '../../../../common/decorators/public.decorator';

/**
 * /test-inline 的最小 DTO（@Allow 让 ValidationPipe 不剥字段）
 */
class TestInlineDto {
  @Allow()
  token?: string;

  @Allow()
  webhookSecret?: string;
}

/**
 * GitHub Controller
 * - 大部分端点需要登录（read 操作）
 * - webhook 端点（POST /webhook）公开访问，靠 HMAC 签名校验
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
  ) {}

  // ========== 公开端点：测试连接 (代理到集成内部) ==========
  @Post('test-inline')
  @ApiOperation({ summary: 'Test github connection with raw token' })
  async testInline(@Body() body: TestInlineDto) {
    if (!body?.token?.trim()) {
      throw new BadRequestException('token is required');
    }
    const client = this.sdk.createClient(body.token.trim());
    try {
      const viewer = await client.fetchViewer();
      // 顺便取一个仓库列表首项（校验至少有一个仓库权限）
      let sampleRepo: { name: string; fullName: string; defaultBranch: string } | null = null;
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
      const msg = err instanceof GitHubApiError ? err.message : (err as Error).message;
      return { ok: false, error: msg };
    }
  }

  // ========== 鉴权端点 ==========
  @Get('test/:integrationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Test connection with stored config' })
  async test(
    @Param('integrationId') integrationId: string,
    @Req() req: Request,
  ) {
    await this.assertIntegrationAccess(integrationId, (req.user as { id: string }).id);
    return this.sync.testConnection(integrationId);
  }

  @Get(':integrationId/sync-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List sync logs' })
  async listLogs(
    @Param('integrationId') integrationId: string,
    @Query('limit') limit: string | undefined,
    @Req() req: Request,
  ) {
    await this.assertIntegrationAccess(integrationId, (req.user as { id: string }).id);
    const parsedLimit = limit ? parseInt(limit, 10) || 50 : 50;
    return this.sync.getSyncLogs(integrationId, parsedLimit);
  }

  @Get(':integrationId/pulls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List PRs (latest 30 by default)' })
  async listPullRequests(
    @Param('integrationId') integrationId: string,
    @Query('repo') repo: string,
    @Query('state') state: 'open' | 'closed' | 'all' = 'open',
    @Req() req: Request,
  ) {
    await this.assertIntegrationAccess(integrationId, (req.user as { id: string }).id);
    if (!repo) throw new BadRequestException('repo query param required, e.g. ?repo=owner/repo');
    const client = await this.sdk.getClientForIntegration(integrationId);
    const [owner, name] = repo.split('/');
    if (!owner || !name) throw new BadRequestException('repo must be owner/name');
    return client.listPullRequests(owner, name, state);
  }

  @Post(':integrationId/pulls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a PR (high-level dispatch helper)' })
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
    },
    @Req() req: Request,
  ) {
    await this.assertIntegrationAccess(integrationId, (req.user as { id: string }).id);
    return this.sync.createPullRequest(integrationId, {
      owner: body.owner,
      repo: body.repo,
      title: body.title,
      head: body.head,
      base: body.base,
      body: body.body,
      draft: body.draft,
    });
  }

  @Post(':integrationId/sync/pull')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manually sync a single PR (fallback when webhook missed)' })
  async syncPull(
    @Param('integrationId') integrationId: string,
    @Body() body: { repo: string; number: number },
    @Req() req: Request,
  ) {
    await this.assertIntegrationAccess(integrationId, (req.user as { id: string }).id);
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

    // 2. 校验签名（如果有 webhook secret）
    const valid = await this.verifySignature(rawBody, signature);
    if (!valid) {
      this.logger.warn(
        `GitHub webhook signature mismatch (event=${event} delivery=${deliveryId})`,
      );
      await this.prisma.webhookEventLog.update({
        where: { id: eventRecord.id },
        data: {
          processed: false,
          errorMessage: 'Invalid signature',
        },
      });
      throw new BadRequestException('Invalid webhook signature');
    }

    // 3. 分发事件
    try {
      if (event === 'pull_request') {
        const payload = JSON.parse(rawBody.toString('utf8'));
        await this.sync.handlePullRequestEvent(payload);
      } else if (event === 'pull_request_review') {
        const payload = JSON.parse(rawBody.toString('utf8'));
        await this.sync.handlePullRequestReviewEvent(payload);
      } else {
        this.logger.debug(`GitHub webhook event ${event} not handled`);
      }
      await this.prisma.webhookEventLog.update({
        where: { id: eventRecord.id },
        data: { processed: true, errorMessage: null },
      });
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`GitHub webhook handler failed: ${msg}`, (err as Error).stack);
      await this.prisma.webhookEventLog.update({
        where: { id: eventRecord.id },
        data: { processed: false, errorMessage: msg },
      });
      throw err;
    }

    return { ok: true };
  }

  // ============= 私有 =============

  private async assertIntegrationAccess(integrationId: string, userId: string) {
    const ic = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });
    if (!ic) throw new NotFoundException(`Integration ${integrationId} not found`);
    if (ic.scope === 'project' && ic.projectId) {
      const proj = await this.prisma.project.findUnique({
        where: { id: ic.projectId },
        include: { members: true },
      });
      if (!proj || !proj.members.some((m) => m.userId === userId)) {
        throw new BadRequestException('You do not have access to this integration');
      }
    }
  }

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

  private async verifySignature(rawBody: Buffer, signature: string | undefined): Promise<boolean> {
    // 查找任一 enabled github integration 上的 webhook secret
    const configs = await this.prisma.integrationConfig.findMany({
      where: { provider: 'github', enabled: true },
    });
    if (configs.length === 0) {
      // 没有任何 github integration 配置 → 视为不开放 webhook
      return signature === undefined;
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
      // 没 secret 配置：只要任意 signature 通过（或者没有 signature 也接受，简单 demo）
      // 这里我们保守：必须提供 signature 才放行
      return signature !== undefined;
    }
    if (!signature) return false;
    for (const secret of expectedSecrets) {
      const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const expected = `sha256=${hmac}`;
      if (this.safeEqual(expected, signature)) return true;
    }
    return false;
  }

  private decryptSecretFromConfig(configJson: unknown): string | null {
    if (!configJson) return null;
    if (typeof configJson === 'object') {
      const obj = configJson as { webhookSecret?: string };
      return obj.webhookSecret ?? null;
    }
    if (typeof configJson === 'string') {
      try {
        const obj = this.encryption.decryptJson<{ webhookSecret?: string }>(configJson);
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

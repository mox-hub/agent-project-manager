/**
 * CLI Provider Service
 *
 * 业务服务：管理 CliProviderConfig 持久化 + 与 CliProviderRegistry 联动
 *
 * - listProviders()   合并内置 adapter 默认值 + DB 配置 + 实时状态
 * - configureProvider(id, dto)  upsert DB 配置
 * - deleteProvider(id)          删除 DB 配置（恢复内置默认）
 * - detectAll()                 触发全量重新探测（不修改 DB）
 * - healthCheck(id)             单个 provider 实时探测
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { CliProviderRegistry } from '@/modules/cli-dispatch/cli-provider.registry';
import { ProviderId } from '@/modules/cli-dispatch/adapters/cli-adapter.interface';
import {
  ConfigureCliProviderDto,
  CliProviderId,
} from './dto/configure-cli-provider.dto';

export interface CliProviderStatus {
  providerId: CliProviderId;
  available: boolean;
  version?: string;
  error?: string;
  commandPath: string;
  configuredPath?: string;
  model?: string;
  env?: Record<string, string>;
  allowedTools?: string[];
  enabled: boolean;
  lastDetectedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CliProvidersResponse {
  providers: CliProviderStatus[];
  defaultProvider: CliProviderId | null;
}

@Injectable()
export class CliProviderService {
  private readonly logger = new Logger(CliProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly registry: CliProviderRegistry,
  ) {}

  /**
   * 列出全部 provider：合并内置 adapter 状态 + DB 配置
   */
  async listProviders(): Promise<CliProvidersResponse> {
    const configs = await this.prisma.cliProviderConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.providerId, c]));

    const providerIds: ProviderId[] = ['claude-code', 'codex', 'zcode'];
    const providers: CliProviderStatus[] = providerIds.map((pid) => {
      const info = this.registry.getAdapter(pid)
        ? {
            available: this.registry.isAvailable(pid),
            version: this.registry.getVersion(pid),
          }
        : { available: false };
      const cfg = configMap.get(pid);

      return {
        providerId: pid as CliProviderId,
        available: info.available && (cfg?.enabled ?? true),
        version: info.version ?? cfg?.version ?? undefined,
        error: !info.available ? 'binary not detected' : undefined,
        commandPath: cfg?.commandPath ?? pid,
        configuredPath: cfg?.commandPath ?? undefined,
        model: cfg?.model ?? undefined,
        env: cfg?.env as Record<string, string> | undefined,
        allowedTools: cfg?.allowedTools as string[] | undefined,
        enabled: cfg?.enabled ?? true,
        lastDetectedAt: cfg?.lastDetectedAt?.toISOString() ?? undefined,
        metadata: cfg?.metadata as Record<string, unknown> | undefined,
      };
    });

    const defaultProvider = this.registry.isAvailable('claude-code')
      ? 'claude-code'
      : this.registry.isAvailable('codex')
        ? 'codex'
        : null;

    return {
      providers,
      defaultProvider: defaultProvider as CliProviderId | null,
    };
  }

  /**
   * Upsert 单个 provider 配置
   */
  async configureProvider(
    id: string,
    dto: ConfigureCliProviderDto,
  ): Promise<CliProviderStatus> {
    if (id !== dto.providerId) {
      throw new BadRequestException(
        `Path id "${id}" does not match body providerId "${dto.providerId}"`,
      );
    }

    const existing = await this.prisma.cliProviderConfig.findUnique({
      where: { providerId: id },
    });

    const data = {
      providerId: dto.providerId,
      displayName: dto.displayName ?? null,
      commandPath: dto.commandPath ?? null,
      model: dto.model ?? null,
      env: (dto.env ?? null) as any,
      allowedTools: (dto.allowedTools ?? null) as any,
      enabled: dto.enabled ?? true,
    };

    if (existing) {
      await this.prisma.cliProviderConfig.update({
        where: { providerId: id },
        data: { ...data, updatedAt: new Date() },
      });
    } else {
      await this.prisma.cliProviderConfig.create({
        data: { ...data },
      });
    }

    this.messageBus.publish('cli.provider.config.updated', {
      providerId: dto.providerId,
      action: existing ? 'updated' : 'created',
    });

    const all = await this.listProviders();
    const updated = all.providers.find((p) => p.providerId === id);
    if (!updated) {
      throw new NotFoundException(`Provider ${id} disappeared after upsert`);
    }
    return updated;
  }

  /**
   * 删除 provider 配置（恢复内置默认值）
   */
  async deleteProvider(id: string): Promise<void> {
    const existing = await this.prisma.cliProviderConfig.findUnique({
      where: { providerId: id },
    });
    if (!existing) {
      throw new NotFoundException(`CLI Provider config not found: ${id}`);
    }

    await this.prisma.cliProviderConfig.delete({
      where: { providerId: id },
    });

    this.messageBus.publish('cli.provider.config.updated', {
      providerId: id,
      action: 'deleted',
    });
  }

  /**
   * 触发全量重新探测，返回最新的检测结果
   * 注意：这里复用 CliProviderRegistry 的探测能力，但配置信息（commandPath 等）
   * 不会立即生效（registry 在 OnModuleInit 时合并配置）。
   * 重启服务后才会应用最新配置覆盖。
   */
  async detectAll(): Promise<CliProviderStatus[]> {
    await this.registry.detectAllProviders();

    // 将探测到的 version / lastDetectedAt 写回 DB
    const providerIds: ProviderId[] = ['claude-code', 'codex', 'zcode'];
    const now = new Date();
    for (const pid of providerIds) {
      const version = this.registry.getVersion(pid) ?? null;
      await this.prisma.cliProviderConfig.upsert({
        where: { providerId: pid },
        create: {
          providerId: pid,
          version,
          lastDetectedAt: now,
          enabled: true,
        },
        update: {
          version,
          lastDetectedAt: now,
        },
      });
    }

    const all = await this.listProviders();
    return all.providers;
  }

  /**
   * 单个 provider 健康检查
   */
  async healthCheck(id: string): Promise<CliProviderStatus> {
    const start = Date.now();
    const available = this.registry.isAvailable(id as ProviderId);
    const version = this.registry.getVersion(id as ProviderId);

    // 触发全量探测以确保状态最新
    await this.registry.detectAllProviders();
    const freshAvailable = this.registry.isAvailable(id as ProviderId);
    const freshVersion = this.registry.getVersion(id as ProviderId);

    const all = await this.listProviders();
    const provider = all.providers.find((p) => p.providerId === id);
    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    return {
      ...provider,
      available: freshAvailable ?? available,
      version: freshVersion ?? version,
      metadata: {
        ...provider.metadata,
        lastHealthCheck: {
          elapsedMs: Date.now() - start,
          checkedAt: new Date().toISOString(),
        },
      },
    };
  }
}

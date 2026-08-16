/**
 * CLI Provider Registry
 * OnModuleInit 时遍历所有 adapter 调 detect()，记录本机可用 provider
 *
 * Phase 2 (V3 Addon)：合并 CliProviderConfig 表中的 DB 配置
 * - DB 配置覆盖内置 adapter 的默认 cmd / env / model / allowedTools
 * - DB enabled=false 时，isAvailable() 返回 false
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { CliAdapter, ProviderId } from './adapters/cli-adapter.interface';

export interface ProviderInfo {
  providerId: ProviderId;
  available: boolean;
  version?: string;
  error?: string;
  detectedAt: Date;
}

export interface CliProviderOverride {
  commandPath?: string;
  model?: string;
  env?: Record<string, string>;
  allowedTools?: string[];
  enabled: boolean;
}

@Injectable()
export class CliProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(CliProviderRegistry.name);
  private readonly providers = new Map<ProviderId, ProviderInfo>();
  private readonly adapters = new Map<ProviderId, CliAdapter>();
  private readonly overrides = new Map<ProviderId, CliProviderOverride>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  async onModuleInit() {
    // Load DB overrides eagerly
    await this.applyDbOverrides();
    // Adapters will be registered via registerAdapter() called from module
  }

  registerAdapter(adapter: CliAdapter) {
    const providerId = adapter.getProviderId();
    this.adapters.set(providerId, adapter);
    this.logger.log(`Registered CLI adapter: ${providerId}`);
  }

  /**
   * 从 CliProviderConfig 表加载所有覆盖，缓存到内存
   */
  async applyDbOverrides(): Promise<void> {
    try {
      const configs = await this.prisma.cliProviderConfig.findMany();
      this.overrides.clear();
      for (const cfg of configs) {
        const pid = cfg.providerId as ProviderId;
        if (!['claude-code', 'codex', 'zcode'].includes(pid)) continue;
        this.overrides.set(pid, {
          commandPath: cfg.commandPath ?? undefined,
          model: cfg.model ?? undefined,
          env: (cfg.env as Record<string, string> | null) ?? undefined,
          allowedTools: (cfg.allowedTools as string[] | null) ?? undefined,
          enabled: cfg.enabled,
        });
      }
      this.logger.log(
        `Applied ${this.overrides.size} CLI provider DB override(s)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to apply CLI provider DB overrides (table may not exist yet): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 获取某个 provider 的 DB 覆盖；没有则返回 null
   */
  getOverrideConfig(providerId: ProviderId): CliProviderOverride | null {
    return this.overrides.get(providerId) ?? null;
  }

  async detectAllProviders(): Promise<ProviderInfo[]> {
    // 先刷新 DB 覆盖，确保最新的配置参与本次探测的"可用性"判定
    await this.applyDbOverrides();

    const detectPromises = Array.from(this.adapters.entries()).map(
      async ([providerId, adapter]) => {
        const startTime = Date.now();
        const result = await adapter.detect();
        const info: ProviderInfo = {
          providerId,
          available: result.available,
          version: result.version,
          error: result.error,
          detectedAt: new Date(),
        };

        this.providers.set(providerId, info);
        this.logger.log(
          `Provider ${providerId}: ${result.available ? 'available' : 'unavailable'} (${Date.now() - startTime}ms)`,
        );

        return info;
      },
    );

    const results = await Promise.all(detectPromises);

    // Write to RuntimeCapabilitySnapshot
    await this.writeCapabilitySnapshot(results);

    return results;
  }

  private async writeCapabilitySnapshot(providers: ProviderInfo[]) {
    try {
      // Find or create a system runtime session for capability reporting
      // This creates a "server" runtime for local CLI capabilities
      let serverRuntime = await this.prisma.runtime.findFirst({
        where: {
          userId: 'system',
          deviceId: 'server-local',
        },
      });

      if (!serverRuntime) {
        serverRuntime = await this.prisma.runtime.create({
          data: {
            userId: 'system',
            deviceId: 'server-local',
            displayName: 'Server Local CLI',
            hostPlatform: process.platform,
            runtimeVersion: process.version,
            status: 'online',
            lastSeenAt: new Date(),
          },
        });
      }

      let runtimeSession = await this.prisma.runtimeSession.findFirst({
        where: {
          runtimeId: serverRuntime.id,
          connectionMode: 'cli',
        },
      });

      if (!runtimeSession) {
        runtimeSession = await this.prisma.runtimeSession.create({
          data: {
            runtimeId: serverRuntime.id,
            sessionTokenHash: 'local-capability',
            status: 'active',
            connectionMode: 'cli',
          },
        });
      }

      // Write capability snapshot
      const availableProviders = providers
        .filter((p) => p.available)
        .map((p) => ({
          providerId: p.providerId,
          version: p.version,
        }));

      await this.prisma.runtimeCapabilitySnapshot.upsert({
        where: {
          id: `caps-${serverRuntime.id}-${runtimeSession.id}`,
        },
        create: {
          id: `caps-${serverRuntime.id}-${runtimeSession.id}`,
          runtimeSessionId: runtimeSession.id,
          cliProviders: availableProviders,
          capabilityFlags: {
            supportsStreamJson: true,
            supportsResumableSessions: true,
          },
        },
        update: {
          cliProviders: availableProviders,
          capabilityFlags: {
            supportsStreamJson: true,
            supportsResumableSessions: true,
          },
          reportedAt: new Date(),
        },
      });

      this.logger.log(
        `Capability snapshot written: ${availableProviders.length} providers available`,
      );
    } catch (error) {
      this.logger.error(`Failed to write capability snapshot: ${error}`);
    }
  }

  getAdapter(providerId: ProviderId): CliAdapter | undefined {
    return this.adapters.get(providerId);
  }

  listAvailable(): ProviderInfo[] {
    return Array.from(this.providers.values()).filter((p) => p.available);
  }

  listAll(): ProviderInfo[] {
    return Array.from(this.providers.values());
  }

  isAvailable(providerId: ProviderId): boolean {
    const ov = this.overrides.get(providerId);
    if (ov && !ov.enabled) return false;
    return this.providers.get(providerId)?.available ?? false;
  }

  getVersion(providerId: ProviderId): string | undefined {
    return this.providers.get(providerId)?.version;
  }
}

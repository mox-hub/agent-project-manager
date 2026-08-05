/**
 * CLI Provider Registry
 * OnModuleInit 时遍历所有 adapter 调 detect()，记录本机可用 provider
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

@Injectable()
export class CliProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(CliProviderRegistry.name);
  private readonly providers = new Map<ProviderId, ProviderInfo>();
  private readonly adapters = new Map<ProviderId, CliAdapter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  onModuleInit() {
    // Adapters will be registered via registerAdapter() called from module
  }

  registerAdapter(adapter: CliAdapter) {
    const providerId = adapter.getProviderId();
    this.adapters.set(providerId, adapter);
    this.logger.log(`Registered CLI adapter: ${providerId}`);
  }

  async detectAllProviders(): Promise<ProviderInfo[]> {
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
    return this.providers.get(providerId)?.available ?? false;
  }

  getVersion(providerId: ProviderId): string | undefined {
    return this.providers.get(providerId)?.version;
  }
}

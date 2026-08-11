import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { EncryptionService } from '@/core/crypto/encryption.service';
import { GitHubClient } from './github-client';
import type { GitHubViewerInfo } from './github.types';

/**
 * SDK Service — 集中管理 GitHubClient 生命周期
 * - decrypt 集成配置 → 创建 client
 * - 维护一个 in-memory client cache（按 integrationId）
 */
@Injectable()
export class GitHubSDKService {
  private readonly logger = new Logger(GitHubSDKService.name);
  private readonly clientCache = new Map<string, GitHubClient>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /** 用裸 token 创建 client（用于 setup wizard 阶段试连接） */
  createClient(token: string): GitHubClient {
    return new GitHubClient(token);
  }

  /** 取 viewer（用于试连接） */
  async fetchViewer(client: GitHubClient): Promise<GitHubViewerInfo> {
    return client.fetchViewer();
  }

  /**
   * 取集成配置关联的 client（带缓存）
   * 若配置缺失或 token 无效抛错
   */
  async getClientForIntegration(integrationId: string): Promise<GitHubClient> {
    const cached = this.clientCache.get(integrationId);
    if (cached) return cached;

    const config = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });
    if (!config) {
      throw new Error(`IntegrationConfig ${integrationId} not found`);
    }
    if (config.provider !== 'github') {
      throw new Error(`Integration ${integrationId} is not a github provider`);
    }

    const decrypted = this.decryptToken(config.configJson);
    const client = new GitHubClient(decrypted);
    this.clientCache.set(integrationId, client);
    return client;
  }

  /**
   * 取项目作用域 GitHub client（若项目下有多个 integration，取第一个 enabled 的）
   * 若项目无绑定的 github integration 抛错
   */
  async getClientForProject(projectId: string): Promise<{ client: GitHubClient; integrationId: string }> {
    const config = await this.prisma.integrationConfig.findFirst({
      where: {
        provider: 'github',
        enabled: true,
        OR: [{ scope: 'global' }, { scope: 'project', projectId }],
      },
      orderBy: [{ scope: 'desc' }], // 'project' > 'global' alphabetically, but anyway
    });
    if (!config) {
      throw new Error(`No github integration for project ${projectId}`);
    }
    const client = await this.getClientForIntegration(config.id);
    return { client, integrationId: config.id };
  }

  /** 手动失效（更新或删除配置后调用） */
  invalidate(integrationId?: string): void {
    if (integrationId) {
      this.clientCache.delete(integrationId);
      return;
    }
    this.clientCache.clear();
  }

  private decryptToken(configJson: unknown): string {
    if (!configJson) {
      throw new Error('Integration config missing');
    }
    if (typeof configJson === 'object') {
      // 旧格式（明文 JSON）
      const obj = configJson as { token?: string; accessToken?: string };
      const token = obj.token ?? obj.accessToken;
      if (!token) throw new Error('Integration config missing token');
      return token;
    }
    if (typeof configJson === 'string') {
      try {
        const json = this.encryption.decryptJson<{ token?: string }>(configJson);
        if (!json?.token) throw new Error('Decrypted config missing token');
        return json.token;
      } catch (err) {
        throw new Error(
          `Failed to decrypt token: ${(err as Error).message}`,
        );
      }
    }
    throw new Error('Unsupported integration config format');
  }
}

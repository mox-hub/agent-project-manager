import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';

export interface ConfigValue {
  [key: string]: any;
}

export interface GetConfigQuery {
  scope: 'global' | 'project' | 'user';
  projectId?: string;
  userId?: string;
  keys?: string[];
}

export interface SetConfigDto {
  scope: 'global' | 'project' | 'user';
  projectId?: string;
  userId?: string;
  config: Record<string, any>;
}

@Injectable()
export class ConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ConfigService');
  }

  /**
   * Get configuration values
   * Priority: User > Project > Global
   */
  async getConfig(
    query: GetConfigQuery,
    currentUserId: string,
  ): Promise<Record<string, any>> {
    const { scope, projectId, userId, keys } = query;
    const effectiveUserId = userId || currentUserId;

    // Build where clause
    const where: any = { scope };

    if (scope === 'project' && projectId) {
      where.projectId = projectId;
    } else if (scope === 'user' && effectiveUserId) {
      where.userId = effectiveUserId;
    }

    // If specific keys are requested, filter by key prefix
    if (keys && keys.length > 0) {
      where.OR = keys.map((key) => ({
        key: { startsWith: key },
      }));
    }

    const configs = await this.prisma.appConfig.findMany({
      where,
      orderBy: { key: 'asc' },
    });

    // Merge configs into a single object
    const result: Record<string, any> = {};
    for (const config of configs) {
      const key = config.key;
      const value = config.value as any;
      result[key] = value;
    }

    return result;
  }

  /**
   * Set configuration values
   */
  async setConfig(
    dto: SetConfigDto,
    currentUserId: string,
  ): Promise<Record<string, any>> {
    const { scope, projectId, userId, config } = dto;
    const effectiveUserId = userId || currentUserId;

    // Validate scope-specific requirements
    if (scope === 'project' && !projectId) {
      throw new BadRequestException('projectId is required for project scope');
    }
    if (scope === 'user' && !effectiveUserId) {
      throw new BadRequestException('userId is required for user scope');
    }

    // If project scope, verify project access
    if (scope === 'project' && projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          members: {
            some: {
              userId: currentUserId,
            },
          },
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found or access denied');
      }
    }

    const results: Record<string, any> = {};

    // Upsert each config key
    for (const [key, value] of Object.entries(config)) {
      const existing = await this.prisma.appConfig.findFirst({
        where: {
          key,
          scope,
          projectId: scope === 'project' ? projectId : null,
          userId: scope === 'user' ? effectiveUserId : null,
        },
      });

      if (existing) {
        const updated = await this.prisma.appConfig.update({
          where: { id: existing.id },
          data: {
            value: value as any,
            updatedBy: currentUserId,
            updatedAt: new Date(),
          },
        });
        results[key] = updated.value;
      } else {
        const created = await this.prisma.appConfig.create({
          data: {
            key,
            value: value as any,
            scope,
            projectId: scope === 'project' ? projectId : null,
            userId: scope === 'user' ? effectiveUserId : null,
            createdBy: currentUserId,
            updatedBy: currentUserId,
            description: this.getConfigDescription(key),
          },
        });
        results[key] = created.value;
      }
    }

    return results;
  }

  /**
   * Delete configuration keys
   */
  async deleteConfig(
    scope: 'global' | 'project' | 'user',
    keys: string[],
    projectId?: string,
    userId?: string,
    currentUserId?: string,
  ): Promise<void> {
    const effectiveUserId = userId || currentUserId;

    const where: any = {
      scope,
      key: { in: keys },
    };

    if (scope === 'project' && projectId) {
      where.projectId = projectId;
    } else if (scope === 'user' && effectiveUserId) {
      where.userId = effectiveUserId;
    }

    await this.prisma.appConfig.deleteMany({ where });
  }

  /**
   * Get default description for config keys
   */
  private getConfigDescription(key: string): string {
    const descriptions: Record<string, string> = {
      'git.defaultProvider':
        'Default Git provider (github, gitlab, gitea, local)',
      'git.defaultBranch': 'Default branch name (main, master, etc.)',
      'git.user.name': 'Git user name',
      'git.user.email': 'Git user email',
      'git.sshKeyPath': 'Path to SSH key for Git authentication',
      'git.autoSync': 'Enable automatic Git sync',
      'git.diff.showWhitespace': 'Show whitespace changes in diff',
      'terminal.defaultShell': 'Default shell (pwsh, bash, zsh, etc.)',
      'terminal.defaultCwd': 'Default working directory',
      'terminal.theme': 'Terminal theme/color scheme',
      'terminal.historySize': 'Command history size',
      'terminal.autoSaveOutput': 'Automatically save command output',
      'terminal.aiDiagnostics': 'Enable AI diagnostics for terminal errors',
      'project.git.defaultBranch': 'Project default Git branch',
      'project.git.commitTemplate': 'Commit message template',
      'project.git.branchNaming': 'Branch naming convention',
      'project.terminal.defaultCwd': 'Project default working directory',
      'project.terminal.defaultShell': 'Project default shell',
      'project.terminal.env': 'Project environment variables',
    };

    return descriptions[key] || `Configuration for ${key}`;
  }
}

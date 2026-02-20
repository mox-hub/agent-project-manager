import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../../core/logger/logger.service';
import { PrismaService } from '../../core/database/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface GitToolInfo {
  available: boolean;
  version?: string;
  path?: string;
  config?: Record<string, string>;
  error?: string;
  suggestion?: string;
}

@Injectable()
export class GitToolService {
  private cachedGitPath: string | null = null;
  private cachedGitInfo: GitToolInfo | null = null;
  private lastCheckedAt: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext('GitToolService');
  }

  /**
   * Check if Git tool is available
   */
  async checkGitAvailability(): Promise<GitToolInfo> {
    // Return cached result if still valid
    if (
      this.cachedGitInfo &&
      this.lastCheckedAt &&
      Date.now() - this.lastCheckedAt.getTime() < this.CACHE_TTL
    ) {
      return this.cachedGitInfo;
    }

    try {
      // Try to get Git path from config first
      const config = await this.getGitToolConfig();
      const gitPath = config?.gitPath || 'git';

      // Check version
      const { stdout: versionOutput } = await execAsync(
        `"${gitPath}" --version`,
        {
          timeout: 5000,
        } as any,
      );

      const versionStr = versionOutput.toString();
      const versionMatch = versionStr.match(/git version ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : versionStr;

      // Get Git config
      const configObj: Record<string, string> = {};
      try {
        const { stdout: configOutput } = await execAsync(
          `"${gitPath}" config --global --list`,
          { timeout: 5000 } as any,
        );
        configOutput
          .toString()
          .split('\n')
          .forEach((line) => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              configObj[key.trim()] = valueParts.join('=').trim();
            }
          });
      } catch (error) {
        this.logger.warn('Failed to read Git global config', error);
      }

      // Resolve full path
      let resolvedPath = gitPath;
      if (gitPath === 'git') {
        try {
          const { stdout: whichOutput } = await execAsync('where git', {
            shell: true,
            timeout: 3000,
          } as any);
          resolvedPath =
            whichOutput.toString().split('\n')[0]?.trim() || gitPath;
        } catch (error) {
          // Try 'which' for Unix-like systems
          try {
            const { stdout: whichOutput } = await execAsync('which git', {
              timeout: 3000,
            } as any);
            resolvedPath = whichOutput.toString().trim() || gitPath;
          } catch (e) {
            // Keep original path
          }
        }
      }

      const info: GitToolInfo = {
        available: true,
        version,
        path: resolvedPath,
        config: configObj,
      };

      // Cache result
      this.cachedGitInfo = info;
      this.cachedGitPath = resolvedPath;
      this.lastCheckedAt = new Date();

      return info;
    } catch (error: any) {
      const info: GitToolInfo = {
        available: false,
        error: error.message || 'Git not found',
        suggestion:
          'Please install Git from https://git-scm.com/ or specify the Git executable path in settings',
      };

      // Cache negative result too (shorter TTL)
      this.cachedGitInfo = info;
      this.lastCheckedAt = new Date();

      return info;
    }
  }

  /**
   * Get Git version
   */
  async getGitVersion(): Promise<string> {
    const info = await this.checkGitAvailability();
    if (!info.available || !info.version) {
      throw new BadRequestException('Git is not available');
    }
    return info.version;
  }

  /**
   * Get Git config (global or local)
   */
  async getGitConfig(
    scope: 'global' | 'local' = 'global',
    repoPath?: string,
  ): Promise<Record<string, string>> {
    const info = await this.checkGitAvailability();
    if (!info.available) {
      throw new BadRequestException('Git is not available');
    }

    const gitPath = this.cachedGitPath || info.path || 'git';
    const args = `config --${scope} --list`;

    try {
      const { stdout } = await execAsync(`"${gitPath}" ${args}`, {
        cwd: repoPath,
        timeout: 5000,
      } as any);

      const config: Record<string, string> = {};
      stdout
        .toString()
        .split('\n')
        .forEach((line) => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            config[key.trim()] = valueParts.join('=').trim();
          }
        });

      return config;
    } catch (error: any) {
      this.logger.warn(`Failed to read Git ${scope} config`, error);
      return {};
    }
  }

  /**
   * Set Git executable path
   */
  async setGitPath(gitPath: string): Promise<void> {
    // Validate path
    if (!fs.existsSync(gitPath)) {
      throw new BadRequestException('Git executable path does not exist');
    }

    // Test if it's a valid Git executable
    try {
      await execAsync(`"${gitPath}" --version`, { timeout: 5000 } as any);
    } catch (error) {
      throw new BadRequestException('Invalid Git executable');
    }

    // Save to config
    await this.saveGitToolConfig({ gitPath });

    // Clear cache
    this.cachedGitPath = gitPath;
    this.cachedGitInfo = null;
    this.lastCheckedAt = null;
  }

  /**
   * Get Git tool config from database
   */
  private async getGitToolConfig(): Promise<{ gitPath?: string } | null> {
    try {
      const config = await this.prisma.appConfig.findFirst({
        where: {
          key: 'git.tool.path',
          scope: 'global',
        },
      });

      if (
        config &&
        config.value &&
        typeof config.value === 'object' &&
        'gitPath' in config.value
      ) {
        return config.value as { gitPath: string };
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to read Git tool config from database', error);
      return null;
    }
  }

  /**
   * Save Git tool config to database
   */
  private async saveGitToolConfig(config: { gitPath: string }): Promise<void> {
    try {
      const existingConfig = await this.prisma.appConfig.findFirst({
        where: {
          key: 'git.tool.path',
          scope: 'global',
        },
      });

      if (existingConfig) {
        await this.prisma.appConfig.update({
          where: { id: existingConfig.id },
          data: {
            value: config,
            updatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.appConfig.create({
          data: {
            key: 'git.tool.path',
            scope: 'global',
            value: config,
            description: 'Git executable path',
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to save Git tool config to database', error);
      throw new BadRequestException('Failed to save Git tool configuration');
    }
  }

  /**
   * Get Git executable path (cached or from config)
   */
  getGitExecutablePath(): string {
    if (this.cachedGitPath) {
      return this.cachedGitPath;
    }
    return 'git'; // Default to PATH lookup
  }
}

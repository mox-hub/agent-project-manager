import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { GitToolService } from './git-tool.service';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WorkspaceValidationResult {
  valid: boolean;
  status: 'valid' | 'invalid' | 'unknown';
  error?: string;
  suggestion?: string;
  gitRepoDetected?: boolean;
}

@Injectable()
export class ProjectWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly gitTool: GitToolService,
  ) {
    this.logger.setContext('ProjectWorkspaceService');
  }

  /**
   * Get workspace configuration for a project
   */
  async getWorkspace(projectId: string, userId: string) {
    // Verify user has access to project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    let workspace = await this.prisma.projectWorkspace.findUnique({
      where: { projectId },
    });

    if (!workspace) {
      // Create default workspace if not exists
      workspace = await this.prisma.projectWorkspace.create({
        data: {
          projectId,
          validationStatus: 'unknown',
        },
      });
    }

    return workspace;
  }

  /**
   * Set workspace configuration for a project
   */
  async setWorkspace(
    projectId: string,
    userId: string,
    dto: {
      localPath?: string;
      remoteUrl?: string;
      autoClone?: boolean;
    },
  ) {
    // Verify user has access to project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
            role: { in: ['owner', 'maintainer'] }, // Only owners/maintainers can set workspace
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Validate local path if provided
    if (dto.localPath) {
      const resolvedPath = path.resolve(dto.localPath);
      if (!fs.existsSync(resolvedPath)) {
        throw new BadRequestException('Local path does not exist');
      }

      if (!fs.statSync(resolvedPath).isDirectory()) {
        throw new BadRequestException('Local path is not a directory');
      }
    }

    // Validate remote URL if provided
    if (dto.remoteUrl) {
      if (
        !this.isValidGitUrl(dto.remoteUrl) &&
        !this.isValidSshUrl(dto.remoteUrl)
      ) {
        throw new BadRequestException('Invalid Git repository URL');
      }
    }

    // Create or update workspace
    const workspace = await this.prisma.projectWorkspace.upsert({
      where: { projectId },
      create: {
        projectId,
        localPath: dto.localPath ? path.resolve(dto.localPath) : null,
        remoteUrl: dto.remoteUrl,
        autoClone: dto.autoClone || false,
        validationStatus: 'unknown',
      },
      update: {
        localPath: dto.localPath ? path.resolve(dto.localPath) : undefined,
        remoteUrl: dto.remoteUrl,
        autoClone: dto.autoClone,
        validationStatus: 'unknown', // Reset validation status
        validationError: null,
      },
    });

    // Auto-validate if local path is provided
    if (dto.localPath) {
      await this.validateWorkspace(projectId, userId);
    }

    // Auto-clone if remote URL and autoClone is enabled
    if (dto.remoteUrl && dto.autoClone && dto.localPath) {
      try {
        await this.cloneRepository(projectId, userId, {
          remoteUrl: dto.remoteUrl,
          localPath: dto.localPath,
        });
      } catch (error) {
        this.logger.error('Failed to auto-clone repository', error);
        // Don't throw, just log the error
      }
    }

    return workspace;
  }

  /**
   * Validate workspace and .git directory
   */
  async validateWorkspace(
    projectId: string,
    userId: string,
  ): Promise<WorkspaceValidationResult> {
    const workspace = await this.getWorkspace(projectId, userId);

    if (!workspace.localPath) {
      const result: WorkspaceValidationResult = {
        valid: false,
        status: 'invalid',
        error: 'No local path configured',
        suggestion: 'Please configure a local workspace path',
      };

      await this.updateValidationStatus(projectId, result);
      return result;
    }

    const localPath = workspace.localPath;

    // Check if path exists
    if (!fs.existsSync(localPath)) {
      const result: WorkspaceValidationResult = {
        valid: false,
        status: 'invalid',
        error: 'Local path does not exist',
        suggestion: 'Please verify the path or update the workspace configuration',
      };

      await this.updateValidationStatus(projectId, result);
      return result;
    }

    // Check if path is accessible
    try {
      fs.accessSync(localPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      const result: WorkspaceValidationResult = {
        valid: false,
        status: 'invalid',
        error: 'Local path is not accessible',
        suggestion: 'Please check file permissions',
      };

      await this.updateValidationStatus(projectId, result);
      return result;
    }

    // Check if .git directory exists
    const gitPath = path.join(localPath, '.git');
    const gitRepoDetected = fs.existsSync(gitPath);

    if (!gitRepoDetected) {
      const result: WorkspaceValidationResult = {
        valid: false,
        status: 'invalid',
        error: '.git directory not found',
        suggestion:
          'This directory is not a Git repository. Run "git init" or clone a repository.',
        gitRepoDetected: false,
      };

      await this.updateValidationStatus(projectId, result);
      return result;
    }

    // Validate .git directory structure
    try {
      const headPath = path.join(gitPath, 'HEAD');
      const configPath = path.join(gitPath, 'config');

      if (!fs.existsSync(headPath) || !fs.existsSync(configPath)) {
        const result: WorkspaceValidationResult = {
          valid: false,
          status: 'invalid',
          error: '.git directory is corrupted',
          suggestion:
            'The .git directory appears to be corrupted. Consider re-initializing or re-cloning the repository.',
          gitRepoDetected: true,
        };

        await this.updateValidationStatus(projectId, result);
        return result;
      }
    } catch (error) {
      const result: WorkspaceValidationResult = {
        valid: false,
        status: 'invalid',
        error: 'Failed to validate .git directory',
        suggestion: 'Please check the repository integrity',
        gitRepoDetected: true,
      };

      await this.updateValidationStatus(projectId, result);
      return result;
    }

    // All checks passed
    const result: WorkspaceValidationResult = {
      valid: true,
      status: 'valid',
      gitRepoDetected: true,
    };

    await this.updateValidationStatus(projectId, result);
    return result;
  }

  /**
   * Clone repository to local path
   */
  async cloneRepository(
    projectId: string,
    userId: string,
    dto: { remoteUrl: string; localPath: string },
  ) {
    // Verify user has access
    await this.getWorkspace(projectId, userId);

    // Check if Git is available
    const gitInfo = await this.gitTool.checkGitAvailability();
    if (!gitInfo.available) {
      throw new BadRequestException('Git tool is not available');
    }

    // Check if local path exists and is empty
    if (fs.existsSync(dto.localPath)) {
      const files = fs.readdirSync(dto.localPath);
      if (files.length > 0) {
        throw new BadRequestException(
          'Local path is not empty. Cannot clone into non-empty directory.',
        );
      }
    } else {
      // Create directory
      fs.mkdirSync(dto.localPath, { recursive: true });
    }

    try {
      // Execute git clone
      const gitPath = this.gitTool.getGitExecutablePath();
      const parentDir = path.dirname(dto.localPath);
      const repoName = path.basename(dto.localPath);
      const command = `"${gitPath}" clone "${dto.remoteUrl}" "${repoName}"`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: parentDir,
        timeout: 300000, // 5 minutes for clone
      });

      // Update workspace configuration
      await this.setWorkspace(projectId, userId, {
        localPath: dto.localPath,
        remoteUrl: dto.remoteUrl,
        autoClone: false,
      });

      // Validate after clone
      await this.validateWorkspace(projectId, userId);

      return {
        success: true,
        message: 'Repository cloned successfully',
        stdout: stdout || '',
        stderr: stderr || '',
      };
    } catch (error: any) {
      this.logger.error('Failed to clone repository', error);
      throw new BadRequestException(
        `Failed to clone repository: ${error.message}`,
      );
    }
  }

  /**
   * Auto-detect Git repositories in workspace
   */
  async detectGitRepository(projectId: string, userId: string) {
    const workspace = await this.getWorkspace(projectId, userId);

    if (!workspace.localPath || !fs.existsSync(workspace.localPath)) {
      return null;
    }

    const gitPath = path.join(workspace.localPath, '.git');
    if (!fs.existsSync(gitPath)) {
      return null;
    }

    // Read .git/config to get remote URL
    try {
      const configPath = path.join(gitPath, 'config');
      const configContent = fs.readFileSync(configPath, 'utf-8');

      // Parse remote URL (simplified)
      const remoteMatch = configContent.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/);
      const remoteUrl = remoteMatch ? remoteMatch[1].trim() : null;

      // Get default branch from HEAD or config
      let defaultBranch = 'main';
      try {
        const headPath = path.join(gitPath, 'HEAD');
        const headContent = fs.readFileSync(headPath, 'utf-8');
        const branchMatch = headContent.match(/ref: refs\/heads\/(.+)/);
        if (branchMatch) {
          defaultBranch = branchMatch[1].trim();
        }
      } catch (error) {
        // Use default
      }

      return {
        localPath: workspace.localPath,
        remoteUrl: remoteUrl || workspace.remoteUrl,
        defaultBranch,
        gitConfig: configContent,
      };
    } catch (error) {
      this.logger.warn('Failed to read Git config', error);
      return {
        localPath: workspace.localPath,
        remoteUrl: workspace.remoteUrl,
        defaultBranch: 'main',
      };
    }
  }

  /**
   * Update validation status in database
   */
  private async updateValidationStatus(
    projectId: string,
    result: WorkspaceValidationResult,
  ) {
    await this.prisma.projectWorkspace.update({
      where: { projectId },
      data: {
        validationStatus: result.status,
        validationError: result.error || null,
        validatedAt: new Date(),
      },
    });
  }

  /**
   * Validate Git URL format
   */
  private isValidGitUrl(url: string): boolean {
    const httpsPattern = /^https?:\/\/.+/;
    return httpsPattern.test(url);
  }

  /**
   * Validate SSH URL format
   */
  private isValidSshUrl(url: string): boolean {
    const sshPattern = /^(git@|ssh:\/\/).+/;
    return sshPattern.test(url);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { GitToolService } from './git-tool.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface GitCommandOptions {
  timeout?: number;
  allowDangerous?: boolean;
}

export interface GitCommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: string;
  errorCode?: string;
  errorMessage?: string;
  suggestion?: string;
}

// Dangerous commands that require extra confirmation
const DANGEROUS_COMMANDS = [
  'reset --hard',
  'push --force',
  'push -f',
  'branch -D',
  'clean -fd',
  'checkout --force',
];

@Injectable()
export class GitCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly gitTool: GitToolService,
  ) {
    this.logger.setContext('GitCommandService');
  }

  /**
   * Execute Git command
   */
  async executeCommand(
    localPath: string,
    dto: {
      command: string;
      args?: string[];
      options?: GitCommandOptions;
    },
  ): Promise<GitCommandResult> {
    const startTime = Date.now();

    // Check Git tool availability
    const gitInfo = await this.gitTool.checkGitAvailability();
    if (!gitInfo.available) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        duration: Date.now() - startTime,
        error: 'GIT_TOOL_NOT_FOUND',
        errorMessage: 'Git tool is not available',
        suggestion: gitInfo.suggestion,
      };
    }

    // Validate local path
    if (!localPath) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        duration: Date.now() - startTime,
        error: 'WORKSPACE_NOT_FOUND',
        errorMessage: 'No local path provided',
        suggestion: 'Please provide a valid workspace path',
      };
    }

    if (!fs.existsSync(localPath)) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        duration: Date.now() - startTime,
        error: 'WORKSPACE_NOT_FOUND',
        errorMessage: 'Local path does not exist',
        suggestion: 'Please verify the path is correct',
      };
    }

    // Check for dangerous commands
    const fullCommand = `${dto.command} ${(dto.args || []).join(' ')}`;
    const isDangerous = DANGEROUS_COMMANDS.some((dangerous) =>
      fullCommand.includes(dangerous),
    );

    if (isDangerous && !dto.options?.allowDangerous) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        duration: Date.now() - startTime,
        error: 'GIT_DANGEROUS_COMMAND',
        errorMessage: `Dangerous command detected: ${fullCommand}`,
        suggestion:
          'This command may cause data loss. Set allowDangerous=true to proceed.',
      };
    }

    // Execute command
    const gitPath = this.gitTool.getGitExecutablePath();
    const args = [dto.command, ...(dto.args || [])].map((arg) =>
      arg.includes(' ') ? `"${arg}"` : arg,
    );
    const command = `"${gitPath}" ${args.join(' ')}`;
    const timeout = dto.options?.timeout || 30000; // Default 30 seconds

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: localPath,
        timeout,
      } as any);
      const exitCode = 0;

      const duration = Date.now() - startTime;
      const stdoutStr = stdout ? stdout.toString() : '';
      const stderrStr = stderr ? stderr.toString() : '';

      return {
        success: true,
        exitCode: 0,
        stdout: stdoutStr,
        stderr: stderrStr,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const exitCode = error.code || -1;
      const stderrRaw = error.stderr || error.message || String(error);
      const stdoutRaw = error.stdout || '';
      const stderr = stderrRaw.toString();
      const stdout = stdoutRaw.toString();

      // Parse error from stderr
      const errorInfo = this.parseGitError(stderr);

      return {
        success: false,
        exitCode,
        stdout,
        stderr,
        duration,
        error: errorInfo.errorCode,
        errorMessage: errorInfo.errorMessage,
        suggestion: errorInfo.suggestion,
      };
    }
  }

  /**
   * Get command execution history
   */
  async getCommandHistory(
    repoId: string,
    userId: string,
    limit: number = 50,
  ) {
    // Verify user has access to repository
    const repo = await this.prisma.repository.findFirst({
      where: {
        id: repoId,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found or access denied');
    }

    return this.prisma.gitCommandExecution.findMany({
      where: {
        repoId,
        userId,
      },
      orderBy: {
        executedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Convenience methods for common Git commands
   */
  async clone(
    localPath: string,
    remoteUrl: string,
  ) {
    // git clone needs to run in parent directory
    const parentDir = path.dirname(localPath);
    const repoName = path.basename(localPath);
    return this.executeCommand(parentDir, {
      command: 'clone',
      args: [remoteUrl, repoName],
      options: { timeout: 300000 }, // 5 minutes
    });
  }

  async pull(localPath: string, remote: string = 'origin', branch?: string) {
    const args = [remote];
    if (branch) {
      args.push(branch);
    }
    return this.executeCommand(localPath, {
      command: 'pull',
      args,
    });
  }

  async push(
    localPath: string,
    remote: string = 'origin',
    branch?: string,
    force: boolean = false,
  ) {
    const args = [remote];
    if (branch) {
      args.push(branch);
    }
    if (force) {
      args.push('--force');
    }
    return this.executeCommand(localPath, {
      command: 'push',
      args,
      options: { allowDangerous: force },
    });
  }

  async fetch(localPath: string, remote?: string) {
    const args = remote ? [remote] : [];
    return this.executeCommand(localPath, {
      command: 'fetch',
      args,
    });
  }

  async status(localPath: string) {
    return this.executeCommand(localPath, {
      command: 'status',
      args: ['--porcelain'],
    });
  }

  async add(localPath: string, files: string[] = ['.']) {
    return this.executeCommand(localPath, {
      command: 'add',
      args: files,
    });
  }

  async commit(
    localPath: string,
    message: string,
    options?: { allowEmpty?: boolean },
  ) {
    const args = ['-m', message];
    if (options?.allowEmpty) {
      args.push('--allow-empty');
    }
    return this.executeCommand(localPath, {
      command: 'commit',
      args,
    });
  }

  async checkout(
    localPath: string,
    branch: string,
    create: boolean = false,
  ) {
    const args = create ? ['-b', branch] : [branch];
    return this.executeCommand(localPath, {
      command: 'checkout',
      args,
    });
  }

  async branch(
    localPath: string,
    branchName?: string,
    options?: { delete?: boolean; force?: boolean },
  ) {
    const args: string[] = [];
    if (options?.delete) {
      args.push('-d');
      if (options.force) {
        args.push('-D');
      }
    }
    if (branchName) {
      args.push(branchName);
    }
    return this.executeCommand(localPath, {
      command: 'branch',
      args,
      options: { allowDangerous: options?.force },
    });
  }

  async merge(
    localPath: string,
    branch: string,
    options?: { noff?: boolean },
  ) {
    const args = [branch];
    if (options?.noff) {
      args.push('--no-ff');
    }
    return this.executeCommand(localPath, {
      command: 'merge',
      args,
    });
  }

  /**
   * Parse Git error from stderr
   */
  private parseGitError(stderr: string): {
    errorCode: string;
    errorMessage: string;
    suggestion?: string;
  } {
    const stderrLower = stderr.toLowerCase();

    if (stderrLower.includes('not a git repository')) {
      return {
        errorCode: 'GIT_REPO_NOT_FOUND',
        errorMessage: 'Not a Git repository',
        suggestion: 'Please verify the repository path or run "git init"',
      };
    }

    if (stderrLower.includes('permission denied')) {
      return {
        errorCode: 'GIT_PERMISSION_DENIED',
        errorMessage: 'Permission denied',
        suggestion: 'Please check file permissions or remote access credentials',
      };
    }

    if (stderrLower.includes('merge conflict')) {
      return {
        errorCode: 'GIT_MERGE_CONFLICT',
        errorMessage: 'Merge conflict detected',
        suggestion: 'Please resolve conflicts and try again',
      };
    }

    if (stderrLower.includes('network') || stderrLower.includes('connection')) {
      return {
        errorCode: 'GIT_NETWORK_ERROR',
        errorMessage: 'Network error',
        suggestion: 'Please check your network connection and try again',
      };
    }

    return {
      errorCode: 'GIT_COMMAND_FAILED',
      errorMessage: stderr || 'Command execution failed',
      suggestion: 'Please check the command syntax and try again',
    };
  }
}

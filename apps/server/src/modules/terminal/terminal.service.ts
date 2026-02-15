import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateTerminalSessionDto } from './dto/create-terminal-session.dto';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

interface TerminalSessionProcess {
  process: ChildProcess;
  sessionId: string;
}

@Injectable()
export class TerminalService {
  private activeSessions = new Map<string, TerminalSessionProcess>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly messageBus: MessageBusService,
  ) {
    this.logger.setContext('TerminalService');
  }

  private getDefaultShell(): string {
    const platform = os.platform();
    if (platform === 'win32') {
      return 'pwsh'; // PowerShell
    }
    return process.env.SHELL || '/bin/bash';
  }

  private async getDefaultCwd(
    projectId?: string,
    repoId?: string,
  ): Promise<string> {
    if (repoId) {
      // Try to get repo local path
      const repo = await this.prisma.repository.findUnique({
        where: { id: repoId },
        select: { localPath: true },
      });
      return repo?.localPath || process.cwd();
    }
    if (projectId) {
      // Could get project path from config, for now use cwd
      return process.cwd();
    }
    return process.cwd();
  }

  async createSession(dto: CreateTerminalSessionDto, userId: string) {
    // Validate project/repo access if provided
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: dto.projectId,
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
    }

    if (dto.repoId) {
      const repo = await this.prisma.repository.findFirst({
        where: {
          id: dto.repoId,
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
    }

    const shell = dto.shell || this.getDefaultShell();
    const cwd = dto.cwd || (await this.getDefaultCwd(dto.projectId, dto.repoId));

    // Validate cwd exists
    if (cwd && !fs.existsSync(cwd)) {
      throw new BadRequestException('Working directory does not exist');
    }

    const session = await this.prisma.terminalSession.create({
      data: {
        projectId: dto.projectId,
        repoId: dto.repoId,
        name: dto.name || `Terminal ${new Date().toLocaleTimeString()}`,
        shell,
        cwd,
        createdBy: userId,
        status: 'active',
      },
    });

    // Start shell process
    this.startShellProcess(session.id, shell, cwd);

    this.messageBus.publish('terminal.session.created', {
      sessionId: session.id,
      projectId: session.projectId,
    });

    return session;
  }

  private startShellProcess(sessionId: string, shell: string, cwd?: string) {
    const isWindows = os.platform() === 'win32';
    const shellCommand = isWindows ? shell : shell.split('/').pop() || 'bash';
    const shellArgs = isWindows ? [] : ['-l']; // Login shell for Unix

    const childProcess = spawn(shellCommand, shellArgs, {
      cwd: cwd || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      this.messageBus.publish('terminal.output', {
        sessionId,
        chunk,
        isError: false,
        isEnd: false,
      });
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      this.messageBus.publish('terminal.output', {
        sessionId,
        chunk,
        isError: true,
        isEnd: false,
      });
    });

    // Handle process exit
    childProcess.on('exit', (code: number | null) => {
      this.messageBus.publish('terminal.output', {
        sessionId,
        chunk: `\n[Process exited with code ${code}]\n`,
        isError: code !== 0,
        isEnd: true,
      });

      this.activeSessions.delete(sessionId);
      this.prisma.terminalSession
        .update({
          where: { id: sessionId },
          data: {
            status: 'closed',
            closedAt: new Date(),
          },
        })
        .catch((error) => {
          this.logger.error('Failed to update session status', error);
        });
    });

    // Handle errors
    childProcess.on('error', (error: Error) => {
      this.logger.error(`Terminal process error for session ${sessionId}: ${error.message}`, error.stack);
      this.messageBus.publish('terminal.output', {
        sessionId,
        chunk: `\n[Error: ${error.message}]\n`,
        isError: true,
        isEnd: true,
      });
    });

    this.activeSessions.set(sessionId, { process: childProcess, sessionId });
  }

  async getSessions(projectId?: string, status?: string, userId?: string) {
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.createdBy = userId;
    }

    return this.prisma.terminalSession.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        repo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSessionById(sessionId: string, userId: string) {
    const session = await this.prisma.terminalSession.findUnique({
      where: { id: sessionId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            members: {
              where: {
                userId,
              },
            },
          },
        },
        repo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Terminal session not found');
    }

    // Check access
    if (session.projectId && session.project && session.project.members.length === 0) {
      throw new NotFoundException('Terminal session access denied');
    }

    if (session.createdBy !== userId) {
      throw new NotFoundException('Terminal session access denied');
    }

    return session;
  }

  async updateSession(
    sessionId: string,
    dto: { name?: string },
    userId: string,
  ) {
    await this.getSessionById(sessionId, userId);

    return this.prisma.terminalSession.update({
      where: { id: sessionId },
      data: {
        name: dto.name,
      },
    });
  }

  async closeSession(sessionId: string, userId: string) {
    await this.getSessionById(sessionId, userId);

    const sessionProcess = this.activeSessions.get(sessionId);
    if (sessionProcess) {
      sessionProcess.process.kill();
      this.activeSessions.delete(sessionId);
    }

    return this.prisma.terminalSession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });
  }

  async executeCommand(
    sessionId: string,
    dto: ExecuteCommandDto,
    userId: string,
  ) {
    const session = await this.getSessionById(sessionId, userId);

    if (session.status !== 'active') {
      throw new BadRequestException('Session is not active');
    }

    const sessionProcess = this.activeSessions.get(sessionId);
    if (!sessionProcess) {
      throw new BadRequestException('Session process not found');
    }

    // Create command execution record
    const commandExecution = await this.prisma.commandExecution.create({
      data: {
        sessionId,
        command: dto.command,
        args: dto.args || [],
        env: dto.env || {},
        status: 'running',
      },
    });

    // Send command to process stdin
    const fullCommand = dto.args
      ? `${dto.command} ${dto.args.join(' ')}\n`
      : `${dto.command}\n`;

    sessionProcess.process.stdin?.write(fullCommand);

    // Update command execution when process output indicates completion
    // Note: In a real implementation, we'd need to track command completion more accurately
    // For now, we'll update status after a delay or when we detect command completion

    this.messageBus.publish('terminal.command.executed', {
      sessionId,
      commandId: commandExecution.id,
      command: dto.command,
    });

    return commandExecution;
  }

  async getCommandExecutions(sessionId: string, userId: string) {
    await this.getSessionById(sessionId, userId);

    return this.prisma.commandExecution.findMany({
      where: { sessionId },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async getCommandExecutionById(commandId: string, userId: string) {
    const command = await this.prisma.commandExecution.findUnique({
      where: { id: commandId },
      include: {
        session: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                members: {
                  where: {
                    userId,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!command) {
      throw new NotFoundException('Command execution not found');
    }

    if (
      command.session.projectId &&
      command.session.project &&
      command.session.project.members.length === 0
    ) {
      throw new NotFoundException('Command execution access denied');
    }

    return command;
  }
}

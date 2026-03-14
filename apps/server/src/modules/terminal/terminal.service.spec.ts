import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { TerminalService } from './terminal.service';

describe('TerminalService', () => {
  let service: TerminalService;

  const mockPrismaService = {
    project: { findFirst: jest.fn() },
    repository: { findFirst: jest.fn(), findUnique: jest.fn() },
    terminalSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    commandExecution: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockLoggerService = {
    setContext: jest.fn(),
    error: jest.fn(),
  };

  const mockMessageBusService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TerminalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: MessageBusService, useValue: mockMessageBusService },
      ],
    }).compile();

    service = module.get<TerminalService>(TerminalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getSessionById should throw NotFoundException when session missing', async () => {
    mockPrismaService.terminalSession.findUnique.mockResolvedValue(null);

    await expect(service.getSessionById('s-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('createSession should create and emit event', async () => {
    mockPrismaService.project.findFirst.mockResolvedValue({ id: 'p-1' });
    mockPrismaService.terminalSession.create.mockResolvedValue({
      id: 's-1',
      projectId: 'p-1',
      repoId: null,
      status: 'active',
    });
    const startShellProcessSpy = jest
      .spyOn(service as any, 'startShellProcess')
      .mockImplementation(() => undefined);

    const result = await service.createSession(
      { projectId: 'p-1', cwd: process.cwd(), shell: 'pwsh', name: 'Test' },
      'user-1',
    );

    expect(result.id).toBe('s-1');
    expect(startShellProcessSpy).toHaveBeenCalledWith(
      's-1',
      'pwsh',
      process.cwd(),
    );
    expect(mockMessageBusService.publish).toHaveBeenCalledWith(
      'terminal.session.created',
      expect.objectContaining({ sessionId: 's-1', projectId: 'p-1' }),
    );
  });

  it('executeCommand should reject non-active session', async () => {
    mockPrismaService.terminalSession.findUnique.mockResolvedValue({
      id: 's-1',
      status: 'closed',
      createdBy: 'user-1',
      projectId: null,
      project: null,
      repo: null,
    });

    await expect(
      service.executeCommand('s-1', { command: 'echo' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('getCommandExecutionById should reject inaccessible project command', async () => {
    mockPrismaService.commandExecution.findUnique.mockResolvedValue({
      id: 'cmd-1',
      session: {
        projectId: 'p-1',
        project: {
          members: [],
        },
      },
    });

    await expect(
      service.getCommandExecutionById('cmd-1', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});

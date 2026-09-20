import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  PrismaService,
  createWorkspaceAwarePrismaService,
} from './prisma.service';
import { LoggerService } from '../logger/logger.service';
import { PrismaClient } from '@prisma/client';
import { workspaceALS } from './workspace-context';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockLoggerService = {
    setContext: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    verbose: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set logger context', () => {
    expect(mockLoggerService.setContext).toHaveBeenCalledWith('Prisma');
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      const connectSpy = vi.spyOn(PrismaClient.prototype, '$connect');
      connectSpy.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith('Database connected');
    }, 15_000);
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = vi.spyOn(PrismaClient.prototype, '$disconnect');
      disconnectSpy.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Database disconnected',
      );
    }, 15_000);
  });

  describe('createWorkspaceAwarePrismaService（工作区路由 + P0-7 止血）', () => {
    let tmpDir: string;
    let prevRegistryPath: string | undefined;
    let proxy: PrismaService;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-prisma-ws-'));
      fs.mkdirSync(path.join(tmpDir, 'data'), { recursive: true });
      // 空 db 文件即可：客户端仅构造、不连接
      fs.writeFileSync(path.join(tmpDir, 'data', 'apm.db'), '');
      const registryFile = path.join(tmpDir, 'workspaces.json');
      fs.writeFileSync(
        registryFile,
        JSON.stringify([
          {
            id: 'ws-registered',
            name: 'registered',
            path: tmpDir,
            createdAt: new Date().toISOString(),
          },
        ]),
      );
      prevRegistryPath = process.env.WORKSPACE_REGISTRY_PATH;
      process.env.WORKSPACE_REGISTRY_PATH = registryFile;
      proxy = createWorkspaceAwarePrismaService(mockLoggerService as any);
    });

    afterEach(async () => {
      process.env.WORKSPACE_REGISTRY_PATH = prevRegistryPath;
      await proxy.onModuleDestroy();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    const inWs = <T>(workspaceId: string | null, fn: () => T): T =>
      workspaceALS.run({ workspaceId }, fn);

    it('无头与显式 default 走默认库，不抛错', () => {
      expect(inWs(null, () => proxy.issue)).toBeDefined();
      expect(inWs('default', () => proxy.issue)).toBeDefined();
    });

    it('已注册且库文件存在的工作区正常路由', () => {
      expect(inWs('ws-registered', () => proxy.issue)).toBeDefined();
    });

    it('未注册的工作区抛 404 WORKSPACE_NOT_FOUND（不再回落默认库）', () => {
      expect(() => inWs('ws-no-such', () => proxy.issue)).toThrowError(
        NotFoundException,
      );
      try {
        inWs('ws-no-such', () => proxy.issue);
      } catch (e) {
        const response = (e as NotFoundException).getResponse() as {
          code?: string;
          message?: string;
        };
        expect(response.code).toBe('WORKSPACE_NOT_FOUND');
        expect(response.message).toBe('工作区不存在或未注册');
      }
    });

    it('已注册但库文件缺失的工作区同样拒绝（不回落默认库）', () => {
      const registryFile = process.env.WORKSPACE_REGISTRY_PATH!;
      fs.writeFileSync(
        registryFile,
        JSON.stringify([
          {
            id: 'ws-registered',
            name: 'registered',
            path: tmpDir,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'ws-missing-db',
            name: 'missing db',
            path: path.join(tmpDir, 'gone'),
            createdAt: new Date().toISOString(),
          },
        ]),
      );
      expect(() => inWs('ws-missing-db', () => proxy.issue)).toThrowError(
        NotFoundException,
      );
    });
  });
});

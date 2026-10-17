import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ProjectWorkspaceService } from './project-workspace.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { GitToolService } from './git-tool.service';

describe('ProjectWorkspaceService（CAP-A-28 路径保障）', () => {
  let service: ProjectWorkspaceService;
  let tmpRoot: string;

  const mockPrismaService = {
    project: {
      findFirst: vi.fn(),
    },
    projectWorkspace: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockLoggerService = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    setContext: vi.fn(),
  };

  const mockGitToolService = {
    checkGitAvailability: vi.fn(),
    getGitExecutablePath: vi.fn(),
  };

  /** 授权链桩：项目可见 + 工作区记录按需 */
  const grantProject = () =>
    mockPrismaService.project.findFirst.mockResolvedValue({ id: 'p1' });
  const stubWorkspace = (localPath: string | null) => {
    mockPrismaService.projectWorkspace.findUnique.mockResolvedValue({
      projectId: 'p1',
      localPath,
      validationStatus: 'unknown',
    });
    mockPrismaService.projectWorkspace.update.mockResolvedValue({});
  };

  /** 造一个伪 git 仓库目录（.git/HEAD + .git/config） */
  const makeGitDir = (name: string): string => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, name));
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/main');
    fs.writeFileSync(path.join(dir, '.git', 'config'), '[core]');
    return dir;
  };

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ordo-pws-'));
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectWorkspaceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: GitToolService, useValue: mockGitToolService },
      ],
    }).compile();

    service = module.get<ProjectWorkspaceService>(ProjectWorkspaceService);
  });

  describe('ensureDirectory（创建目录动作）', () => {
    it('项目不可见（无权限）→ NotFoundException，不碰文件系统', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);
      await expect(
        service.ensureDirectory('p1', 'u1', 'D:/somewhere/new-dir'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('空 localPath → BadRequestException', async () => {
      grantProject();
      await expect(
        service.ensureDirectory('p1', 'u1', '   '),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('缺失目录 mkdir -p 递归创建，返回实测检验结果（新建目录必无 .git）', async () => {
      grantProject();
      const target = path.join(tmpRoot, 'ensure-a', 'ensure-b', 'project');
      const result = await service.ensureDirectory('p1', 'u1', target);

      expect(fs.existsSync(target)).toBe(true);
      expect(fs.statSync(target).isDirectory()).toBe(true);
      expect(result.status).toBe('invalid');
      expect(result.gitRepoDetected).toBe(false);
      expect(result.missing).toBeUndefined();
    });

    it('已存在目录幂等——不重复创建直接回检', async () => {
      grantProject();
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'ensure-exists-'));
      const result = await service.ensureDirectory('p1', 'u1', dir);
      expect(fs.readdirSync(dir).filter((f) => f !== '.git')).toEqual([]);
      expect(result.status).toBe('invalid');
    });

    it('路径已被文件占用 → BadRequestException（保底报错不静默）', async () => {
      grantProject();
      const file = path.join(tmpRoot, 'occupied.txt');
      fs.writeFileSync(file, 'x');
      await expect(
        service.ensureDirectory('p1', 'u1', file),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('checkPathDirect（直验输入值，不落库）', () => {
    it('目录不存在 → missing:true（驱动前端「创建目录」动作）', () => {
      const result = service.checkPathDirect(
        path.join(tmpRoot, 'nope', 'missing'),
      );
      expect(result.valid).toBe(false);
      expect(result.missing).toBe(true);
    });

    it('存在但非 Git 仓库 → invalid + gitRepoDetected:false、不带 missing', () => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'plain-'));
      const result = service.checkPathDirect(dir);
      expect(result.status).toBe('invalid');
      expect(result.gitRepoDetected).toBe(false);
      expect(result.missing).toBeUndefined();
    });

    it('伪 .git（HEAD+config 齐全）→ valid', () => {
      const dir = makeGitDir('valid-');
      expect(service.checkPathDirect(dir).valid).toBe(true);
    });

    it('相对路径按 resolve 解析不抛错，结论仍为结构化结果', () => {
      const result = service.checkPathDirect('relative/nonexistent-path');
      expect(result.status).toBe('invalid');
      expect(result.missing).toBe(true);
    });
  });

  describe('validateWorkspace（已存配置验证，落库回显）', () => {
    it('有效仓库 → status valid 且落库', async () => {
      grantProject();
      const dir = makeGitDir('ws-valid-');
      stubWorkspace(dir);
      const result = await service.validateWorkspace('p1', 'u1');

      expect(result.valid).toBe(true);
      expect(mockPrismaService.projectWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'p1' },
          data: expect.objectContaining({ validationStatus: 'valid' }),
        }),
      );
    });

    it('未配置 localPath → invalid + 引导建议', async () => {
      grantProject();
      stubWorkspace(null);
      const result = await service.validateWorkspace('p1', 'u1');
      expect(result.status).toBe('invalid');
      expect(result.suggestion).toContain('local workspace path');
    });

    it('目录已被删 → invalid + missing:true + 落库', async () => {
      grantProject();
      stubWorkspace(path.join(tmpRoot, 'vanished'));
      const result = await service.validateWorkspace('p1', 'u1');
      expect(result.missing).toBe(true);
      expect(mockPrismaService.projectWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ validationStatus: 'invalid' }),
        }),
      );
    });
  });
});

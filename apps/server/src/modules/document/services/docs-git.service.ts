// docs-git.service.ts
//
// 把文档快照同步到本地 Git 仓库 (DB DocumentVersion 仍为主路径, Git 作为冗余/可移植资产)。
//
// 启动时检测 git 二进制可用性, 缺失时降级为只使用 DB 版本表。

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);

export interface GitCommitInput {
  projectId: string;
  documentId: string;
  fileName: string; // 相对仓库根, 例如 "APM/abc123_intro.md"
  content: string;
  message: string;
  author: { name: string; email: string };
}

export interface GitCommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
}

@Injectable()
export class DocsGitService {
  private readonly logger = new Logger(DocsGitService.name);
  private gitAvailable: boolean | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async isGitAvailable(): Promise<boolean> {
    if (this.gitAvailable !== null) return this.gitAvailable;
    try {
      const { stdout } = await execFileP('git', ['--version']);
      this.gitAvailable = /^git version /m.test(stdout);
    } catch (err) {
      this.logger.warn(
        `git binary not available, version sync to git will be skipped: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      this.gitAvailable = false;
    }
    return this.gitAvailable;
  }

  /**
   * 获取或创建项目对应的 Git 仓库, 返回仓库根路径。
   * 路径: ${Project.documentsRepoPath | <default>} / ${projectCode}/
   */
  async ensureRepo(projectId: string): Promise<string | null> {
    if (!(await this.isGitAvailable())) return null;

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      this.logger.warn(`Project ${projectId} not found, skip git ensure`);
      return null;
    }

    const basePath = (project as any).documentsRepoPath as string | null | undefined;
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    const root = basePath && String(basePath).trim().length > 0
      ? String(basePath)
      : path.join(home, 'agent-project-manager', 'docs');
    const projectCode = project.projectCode || `project-${projectId}`;
    const repoDir = path.join(root, projectCode);

    await fs.ensureDir(repoDir);
    const gitDir = path.join(repoDir, '.git');
    if (!(await fs.pathExists(gitDir))) {
      await execFileP('git', ['init'], { cwd: repoDir });
      const gitignorePath = path.join(repoDir, '.gitignore');
      if (!(await fs.pathExists(gitignorePath))) {
        await fs.writeFile(gitignorePath, '.apm-tmp/\n', 'utf8');
      }
      this.logger.log(`Initialized git repo at ${repoDir}`);
    }
    return repoDir;
  }

  /**
   * 把文档内容 commit 到 Git。
   * 缺失 git 时返回 null; 内容未变化时不创建 commit。
   */
  async commitFile(input: GitCommitInput): Promise<GitCommitInfo | null> {
    const repoDir = await this.ensureRepo(input.projectId);
    if (!repoDir) return null;

    const fullPath = path.join(repoDir, input.fileName);
    await fs.ensureDir(path.dirname(fullPath));

    const existing = (await fs.pathExists(fullPath)) ? await fs.readFile(fullPath, 'utf8') : null;
    if (existing === input.content) {
      return null;
    }

    await fs.writeFile(fullPath, input.content, 'utf8');

    // 始终显式 add 这个文件, 避免依赖 .gitignore 默认行为
    await execFileP('git', ['add', '--', input.fileName], { cwd: repoDir });

    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: input.author.name,
      GIT_AUTHOR_EMAIL: input.author.email,
      GIT_COMMITTER_NAME: input.author.name,
      GIT_COMMITTER_EMAIL: input.author.email,
    };
    await execFileP('git', ['commit', '-m', input.message, '--', input.fileName], {
      cwd: repoDir,
      env,
      maxBuffer: 8 * 1024 * 1024,
    });

    const { stdout } = await execFileP('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
    const sha = stdout.trim();
    if (!sha) return null;

    return {
      sha,
      message: input.message,
      date: new Date().toISOString(),
      author: `${input.author.name} <${input.author.email}>`,
    };
  }

  /**
   * 列出某文档文件的提交历史。
   */
  async listCommits(projectId: string, fileName: string): Promise<GitCommitInfo[]> {
    const repoDir = await this.ensureRepo(projectId);
    if (!repoDir) return [];

    try {
      const { stdout } = await execFileP(
        'git',
        ['log', '--follow', '--pretty=format:%H%x1f%s%x1f%aI%x1f%an <%ae>', '--', fileName],
        { cwd: repoDir, maxBuffer: 8 * 1024 * 1024 },
      );
      if (!stdout.trim()) return [];
      return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [sha, message, date, author] = line.split('\x1f');
          return { sha, message, date, author };
        });
    } catch (err) {
      this.logger.warn(
        `Failed to list git log for ${fileName}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /**
   * 读取某次提交时的文件内容。
   */
  async readFileAt(projectId: string, fileName: string, sha: string): Promise<string | null> {
    const repoDir = await this.ensureRepo(projectId);
    if (!repoDir) return null;
    try {
      const { stdout } = await execFileP('git', ['show', `${sha}:${fileName}`], {
        cwd: repoDir,
        maxBuffer: 8 * 1024 * 1024,
      });
      return stdout;
    } catch (err) {
      this.logger.warn(
        `Failed to read ${fileName}@${sha}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * 检测 git 环境状态。
   */
  async testConnection(projectId: string): Promise<{ ok: boolean; path?: string; message: string }> {
    const available = await this.isGitAvailable();
    if (!available) {
      return { ok: false, message: '未检测到 git 可执行文件, 请先安装 Git' };
    }
    const repoDir = await this.ensureRepo(projectId);
    if (!repoDir) {
      return { ok: false, message: '项目不存在' };
    }
    return { ok: true, path: repoDir, message: 'Git 仓库可访问' };
  }
}

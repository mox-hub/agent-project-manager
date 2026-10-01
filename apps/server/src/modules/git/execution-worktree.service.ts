/**
 * ExecutionWorktreeService —— G5-b 执行隔离与成果合入的受控 git 封装（ADR-017）。
 *
 * 设计稿：docs/design/设计-G5执行隔离与合入-2026-10-01.md §5.1。
 *
 * 定位：**白名单受控通道**。与 GitCommandService（API 层任意命令 + 危险命令
 * 黑名单）不同，本服务的命令集全部由程序内构造（executionId/分支名/路径均为
 * 服务端生成的受控值），走独立 execFile 通道——不经过用户输入黑名单，也不把
 * 任何调用方拼接的命令文本送进 shell。
 *
 * 六个设计稿方法 + 少量 applier 辅助：
 * - prepareWorktree   派发前隔离准备（worktree add + 幂等补 .gitignore）
 * - collectChanges    执行完成后成果收集（未提交变更补快照 commit + diff 统计）
 * - detectConflicts   merge-tree --write-tree 无副作用冲突预检（git ≥ 2.38）
 * - integrate         主工作区 merge --no-ff 真合入
 * - cleanup           worktree remove + 分支删除（**硬编码只删 apm/exec/ 前缀**）
 * - inspect           巡检：worktree list --porcelain + prune（reconcile 挂钩）
 *
 * Windows 兼容：路径一律 path.join；execFile 不经 shell，无引号转义问题
 * （与 docs-git.service.ts 同先例）。
 *
 * 依赖边界（重要）：本服务**零 DI 依赖**（git 走 PATH 解析，git 二进制探测
 * 自包含 + 5min 缓存）。曾有注入 GitToolService 的版本，但其所在 GitModule
 * 的模块链（GitHub → Integration → Linear → Issue）与 decision/execution
 * 消费方构成 TS 级模块环（contract-export 启动即崩），故解耦为独立零依赖
 * 模块 ExecutionWorktreeModule——代价是不读用户自配 git 路径（git.tool.path），
 * 与 docs-git.service.ts 的 PATH 先例一致。
 */
import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileP = promisify(execFile);

/** 隔离分支命名空间——cleanup 的删除硬约束：此前缀之外的分支一律拒删 */
export const WORKTREE_BRANCH_PREFIX = 'apm/exec/';

/** worktree 落点（项目根相对路径）：同盘符、用户可见可清理、删项目即全清 */
export const WORKTREE_DIR_RELATIVE = path.join('.apm', 'worktrees');

/** merge-tree --write-tree 需要的最低 git 版本（设计稿 §七 风险表） */
export const MIN_GIT_VERSION = '2.38.0';

/** git 命令超时：worktree add/remove 大仓库也可能数秒，统一 60s 上限 */
const GIT_TIMEOUT_MS = 60_000;

/** git 单命令输出上限（diff --stat 大仓库膨胀保护） */
const GIT_MAX_BUFFER = 16 * 1024 * 1024;

/** 卡内文件清单上限（设计稿 §5.4：top 20 + 溢出计数） */
export const INTEGRATION_FILES_TOP = 20;

/** 快照 commit 的 author 兜底（设计稿 §七 开放问题裁决口径） */
export const EXECUTION_AUTHOR_EMAIL = 'execution@apm.local';
export const EXECUTION_AUTHOR_NAME = 'APM Execution';

export interface CommitAuthor {
  name: string;
  email: string;
}

/** prepareWorktree 产出（Execution.metadata.isolation 的 worktree 分支来源） */
export interface WorktreePreparation {
  worktreePath: string;
  branch: string;
  baseRef: string;
}

/** Execution.metadata.isolation（派发注入写入，前端徽标消费） */
export type ExecutionIsolationMetadata =
  | {
      mode: 'worktree';
      worktreePath: string;
      branch: string;
      baseRef: string;
      projectRoot: string;
      preparedAt: string;
      /** reconcile TTL 清理 / 取消即时清理后回填 */
      cleanedAt?: string;
    }
  | {
      mode: 'shared-root';
      reason:
        'not-git-repo' | 'worktree-add-failed' | 'disabled' | 'git-too-old';
      /** worktree-add-failed / git-too-old 的原始错误或版本摘要 */
      detail?: string;
    };

/** collectChanges 产出（设计稿 §5.4 收集口径） */
export interface WorktreeChangeSet {
  /** baseRef..HEAD 之间存在任何提交 */
  hasChanges: boolean;
  commitCount: number;
  /** git diff --stat 原文（末行 summary） */
  diffStat: string;
  insertions: number;
  deletions: number;
  /** 变更文件相对路径全量（卡侧自行截 top N） */
  files: string[];
  headRef: string;
}

/** detectConflicts 产出 */
export interface ConflictCheck {
  clean: boolean;
  files: string[];
}

/** inspect 产出（reconcile 巡检） */
export interface WorktreeInspectResult {
  worktrees: Array<{ path: string; branch?: string; bare?: boolean }>;
  pruned: boolean;
}

/** git 命令失败（非零退出码），带可读 stderr */
export class GitCommandError extends Error {
  constructor(
    readonly args: string[],
    readonly exitCode: number,
    readonly stderr: string,
    readonly stdout: string,
  ) {
    super(
      `git ${args.join(' ')} failed (exit ${exitCode}): ${stderr.trim() || 'no stderr'}`,
    );
    this.name = 'GitCommandError';
  }
}

export interface ExecutionWorktreeInitOptions {
  /** 快照 commit 信息（collectChanges 未提交变更落快照时使用） */
  message: string;
  author?: CommitAuthor;
}

@Injectable()
export class ExecutionWorktreeService {
  private readonly logger = new Logger(ExecutionWorktreeService.name);
  /** git 二进制版本探测缓存（5min，与 GitToolService 缓存口径一致） */
  private cachedVersion: { version?: string; at: number } | null = null;
  private static readonly VERSION_CACHE_TTL_MS = 5 * 60_000;

  constructor() {}

  // ------------------------------------------------------------------ 基础通道

  /**
   * 受控 git 通道：execFile 直启（不经 shell），参数全部程序内构造。
   * 非零零退出码抛 GitCommandError（调用方按语义决定吞还是抛）。
   */
  private async git(
    cwd: string,
    args: string[],
    opts?: { env?: NodeJS.ProcessEnv; allowFailure?: number[] },
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    try {
      const { stdout } = await execFileP(
        'git',
        ['--no-pager', '-c', 'core.quotepath=false', ...args],
        {
          cwd,
          timeout: GIT_TIMEOUT_MS,
          maxBuffer: GIT_MAX_BUFFER,
          windowsHide: true,
          env: opts?.env ? { ...process.env, ...opts.env } : process.env,
        },
      );
      return { code: 0, stdout: stdout ?? '', stderr: '' };
    } catch (err) {
      const e = err as NodeJS.ErrnoException & {
        code?: number | string;
        stdout?: string;
        stderr?: string;
        killed?: boolean;
      };
      const exitCode = typeof e.code === 'number' ? e.code : -1;
      if (opts?.allowFailure?.includes(exitCode)) {
        return {
          code: exitCode,
          stdout: e.stdout ?? '',
          stderr: e.stderr ?? '',
        };
      }
      throw new GitCommandError(
        args,
        exitCode,
        e.stderr ?? e.message ?? String(err),
        e.stdout ?? '',
      );
    }
  }

  /** 解析 HEAD/分支指向的提交 sha（不存在/非法时抛错） */
  private parseRevParse(stdout: string): string {
    const sha = stdout.trim().split(/\r?\n/)[0] ?? '';
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
      throw new GitCommandError(
        ['rev-parse'],
        -1,
        `unexpected output: ${stdout}`,
        stdout,
      );
    }
    return sha;
  }

  // ------------------------------------------------------------------ 探测

  /** 目录是否为 git 工作树（rev-parse --is-inside-work-tree） */
  async isGitRepository(dir: string): Promise<boolean> {
    try {
      const { stdout } = await this.git(dir, [
        'rev-parse',
        '--is-inside-work-tree',
      ]);
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * git 可用性与 merge-tree 能力探测（设计稿：git < 2.38 视同降级 git-too-old）。
   * 自包含探测（execFile 'git --version'，5min 缓存）——不依赖 GitToolService
   *（模块环约束见文件头）。
   */
  async checkMergeTreeSupport(): Promise<{
    ready: boolean;
    version?: string;
    reason?: 'git-unavailable' | 'git-too-old';
  }> {
    let version = this.cachedVersion?.version;
    if (
      !this.cachedVersion ||
      Date.now() - this.cachedVersion.at >
        ExecutionWorktreeService.VERSION_CACHE_TTL_MS
    ) {
      try {
        const { stdout } = await execFileP('git', ['--version'], {
          timeout: 5000,
          windowsHide: true,
        });
        version = /git version ([\d.]+)/.exec(stdout)?.[1] ?? stdout.trim();
        this.cachedVersion = { version, at: Date.now() };
      } catch {
        this.cachedVersion = { version: undefined, at: Date.now() };
        return { ready: false, reason: 'git-unavailable' };
      }
    }
    if (!version) {
      return { ready: false, reason: 'git-unavailable' };
    }
    return {
      ready: compareGitVersion(version, MIN_GIT_VERSION) >= 0,
      version,
      reason: 'git-too-old',
    };
  }

  // ------------------------------------------------------------------ 六方法

  /**
   * 派发前隔离准备：worktree add -b apm/exec/<shortId> <path> HEAD。
   * - shortId = executionId 后 8 位；baseRef = 准备时刻的主仓 HEAD；
   * - 幂等补 .gitignore（.apm/ 条目不存在才追加；文件只读锁定时静默跳过，
   *   worktree 目录变 untracked 可接受——设计稿 §七 开放问题裁决）；
   * - **重派语义**：同 executionId 重派时旧分支/worktree 仍在（失败现场保留），
   *   此处先清旧场再建新场，保证派发永不因陈旧现场降级共享根。
   */
  async prepareWorktree(
    projectRoot: string,
    executionId: string,
  ): Promise<WorktreePreparation> {
    const shortId = executionId.slice(-8);
    const branch = `${WORKTREE_BRANCH_PREFIX}${shortId}`;
    const worktreePath = path.join(projectRoot, WORKTREE_DIR_RELATIVE, shortId);

    const baseRef = this.parseRevParse(
      (await this.git(projectRoot, ['rev-parse', 'HEAD'])).stdout,
    );

    // 陈旧现场清理（同 executionId 重派）：分支存在即先拆场删支
    const existing = await this.git(
      projectRoot,
      ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`],
      { allowFailure: [1] },
    );
    if (existing.code === 0) {
      this.logger.warn(
        `Stale worktree scene for ${executionId} (${branch}), recreating`,
      );
      await this.removeWorktree(projectRoot, worktreePath, true);
      await this.git(projectRoot, ['branch', '-D', branch]);
    }

    await this.ensureGitignoreEntry(projectRoot);
    // worktree add 对已存在的空目录会拒绝，先确保目录不存在（git 自建）
    await fs.promises.rm(worktreePath, { recursive: true, force: true });
    await this.git(projectRoot, [
      'worktree',
      'add',
      '-b',
      branch,
      worktreePath,
      baseRef,
    ]);

    return { worktreePath, branch, baseRef };
  }

  /**
   * 成果收集（在 worktree 内执行）：
   * - 未提交变更非空 → add -A + 受控快照 commit（author 缺省 execution@apm.local）；
   * - diff --stat / --name-only <baseRef>..HEAD + rev-list --count；
   * - 无任何提交 → hasChanges=false（调用方直接清理 + no-changes 记账）。
   */
  async collectChanges(
    worktreePath: string,
    baseRef: string,
    snapshot?: ExecutionWorktreeInitOptions,
  ): Promise<WorktreeChangeSet> {
    const status = await this.git(worktreePath, ['status', '--porcelain']);
    if (status.stdout.trim() && snapshot) {
      const author = snapshot.author ?? {
        name: EXECUTION_AUTHOR_NAME,
        email: EXECUTION_AUTHOR_EMAIL,
      };
      const authorEnv = {
        GIT_AUTHOR_NAME: author.name,
        GIT_AUTHOR_EMAIL: author.email,
        GIT_COMMITTER_NAME: author.name,
        GIT_COMMITTER_EMAIL: author.email,
      };
      await this.git(worktreePath, ['add', '-A']);
      // 大写 A --author 与 env 双保险：无全局 user.name/email 的裸机也可提交
      await this.git(
        worktreePath,
        [
          'commit',
          '-m',
          snapshot.message,
          '--author',
          `${author.name} <${author.email}>`,
          '--no-verify',
        ],
        { env: authorEnv },
      );
    }

    const headRef = this.parseRevParse(
      (await this.git(worktreePath, ['rev-parse', 'HEAD'])).stdout,
    );
    const count = await this.git(worktreePath, [
      'rev-list',
      '--count',
      `${baseRef}..HEAD`,
    ]);
    const commitCount = Number.parseInt(count.stdout.trim(), 10) || 0;
    if (commitCount === 0) {
      return {
        hasChanges: false,
        commitCount: 0,
        diffStat: '',
        insertions: 0,
        deletions: 0,
        files: [],
        headRef,
      };
    }

    const diffStat = (
      await this.git(worktreePath, ['diff', '--stat', `${baseRef}..HEAD`])
    ).stdout.trim();
    const { insertions, deletions } = parseDiffStatSummary(diffStat);
    const files = (
      await this.git(worktreePath, ['diff', '--name-only', `${baseRef}..HEAD`])
    ).stdout
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean);

    return {
      hasChanges: true,
      commitCount,
      diffStat,
      insertions,
      deletions,
      files,
      headRef,
    };
  }

  /**
   * 冲突预检（无副作用）：git merge-tree --write-tree --name-only HEAD <branch>。
   * 退出码 0=干净；1=冲突（stdout 首行为 tree oid，其余为冲突文件清单）。
   */
  async detectConflicts(
    projectRoot: string,
    branch: string,
  ): Promise<ConflictCheck> {
    const { code, stdout } = await this.git(
      projectRoot,
      ['merge-tree', '--write-tree', '--name-only', 'HEAD', branch],
      { allowFailure: [1] },
    );
    if (code === 0) return { clean: true, files: [] };
    const lines = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    // 首行是 write-tree 产出的 tree oid，其后是冲突文件名
    return { clean: false, files: lines.slice(1) };
  }

  /** 真合入：主工作区 merge --no-ff <branch> -m <message>，返回 merge commit sha */
  async integrate(
    projectRoot: string,
    branch: string,
    message: string,
  ): Promise<{ mergeCommit: string }> {
    await this.git(projectRoot, ['merge', '--no-ff', branch, '-m', message]);
    const mergeCommit = this.parseRevParse(
      (await this.git(projectRoot, ['rev-parse', 'HEAD'])).stdout,
    );
    return { mergeCommit };
  }

  /**
   * 清理：worktree remove [--force] + branch -D。
   * **硬约束**：分支名必须以 apm/exec/ 开头（前缀校验硬编码），其余一律拒删。
   * 幂等容错：worktree 目录已不存在时跳过 remove；分支已不存在时跳过删除
   * （reject / reconcile TTL / 外部手删三类入口都要求重复清理不报错）。
   */
  async cleanup(
    projectRoot: string,
    worktreePath: string,
    branch: string,
    opts?: { force?: boolean },
  ): Promise<void> {
    if (!branch.startsWith(WORKTREE_BRANCH_PREFIX)) {
      throw new GitCommandError(
        ['branch', '-D', branch],
        -1,
        `refuse to delete branch outside ${WORKTREE_BRANCH_PREFIX} prefix`,
        '',
      );
    }
    await this.removeWorktree(projectRoot, worktreePath, opts?.force ?? false);
    const deleted = await this.git(projectRoot, ['branch', '-D', branch], {
      allowFailure: [1],
    });
    if (deleted.code !== 0) {
      this.logger.warn(
        `worktree branch ${branch} already gone (skip): ${deleted.stderr.trim()}`,
      );
    }
  }

  /** 巡检：worktree prune（悬挂元数据收敛）+ worktree list --porcelain（prune 后快照） */
  async inspect(projectRoot: string): Promise<WorktreeInspectResult> {
    // 先 prune 再 list：返回的是收敛后的真实状态（悬挂条目不误导巡检消费方）
    await this.git(projectRoot, ['worktree', 'prune']);
    const { stdout } = await this.git(projectRoot, [
      'worktree',
      'list',
      '--porcelain',
    ]);
    const worktrees: WorktreeInspectResult['worktrees'] = [];
    let current: WorktreeInspectResult['worktrees'][number] | null = null;
    for (const line of stdout.split(/\r?\n/)) {
      if (line.startsWith('worktree ')) {
        current = { path: line.slice('worktree '.length) };
        worktrees.push(current);
      } else if (current && line.startsWith('branch ')) {
        current.branch = line
          .slice('branch '.length)
          .replace('refs/heads/', '');
      } else if (current && line === 'bare') {
        current.bare = true;
      }
    }
    return { worktrees, pruned: true };
  }

  // ------------------------------------------------------------------ applier 辅助

  /** 分支当前 HEAD（applier 指纹复核用）；分支不存在时抛 GitCommandError */
  async getBranchHead(projectRoot: string, branch: string): Promise<string> {
    const { stdout } = await this.git(projectRoot, [
      'rev-parse',
      '--verify',
      `refs/heads/${branch}`,
    ]);
    return this.parseRevParse(stdout);
  }

  /** 主工作区 HEAD sha（幂等恢复时补 mergeCommit 记账用） */
  async getHead(projectRoot: string): Promise<string> {
    return this.parseRevParse(
      (await this.git(projectRoot, ['rev-parse', 'HEAD'])).stdout,
    );
  }

  /** 分支是否已并入主工作区 HEAD（merge-base --is-ancestor，退出码语义） */
  async isBranchMerged(projectRoot: string, branch: string): Promise<boolean> {
    const { code } = await this.git(
      projectRoot,
      ['merge-base', '--is-ancestor', branch, 'HEAD'],
      { allowFailure: [1] },
    );
    return code === 0;
  }

  /** 主工作区未提交变更清单（porcelain 原行；applier 决策时刻复核用） */
  async mainWorkspaceDirtyFiles(projectRoot: string): Promise<string[]> {
    const { stdout } = await this.git(projectRoot, ['status', '--porcelain']);
    return stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  // ------------------------------------------------------------------ 内部

  /** worktree remove（目录已不存在直接跳过；失败且 force 时回退 fs.rm + prune） */
  private async removeWorktree(
    projectRoot: string,
    worktreePath: string,
    force: boolean,
  ): Promise<void> {
    if (!fs.existsSync(worktreePath)) return;
    const args = ['worktree', 'remove'];
    if (force) args.push('--force');
    args.push(worktreePath);
    try {
      await this.git(projectRoot, args);
    } catch (err) {
      if (!force) throw err;
      // force 语义：目录被进程占用（Windows 文件锁）等场景下保证现场不残留
      this.logger.warn(
        `worktree remove --force failed, fallback to fs.rm: ${(err as Error).message}`,
      );
      await fs.promises.rm(worktreePath, { recursive: true, force: true });
      await this.git(projectRoot, ['worktree', 'prune']).catch(() => undefined);
    }
  }

  /** 幂等补 .gitignore：.apm/ 条目不存在才追加；只读锁定静默跳过 */
  private async ensureGitignoreEntry(projectRoot: string): Promise<void> {
    try {
      const gitignorePath = path.join(projectRoot, '.gitignore');
      let content = '';
      try {
        content = await fs.promises.readFile(gitignorePath, 'utf8');
      } catch {
        // 文件不存在则新建
      }
      const hasEntry = content
        .split(/\r?\n/)
        .some((line) => line.trim() === '.apm' || line.trim() === '.apm/');
      if (hasEntry) return;
      const next = `${content}${content && !content.endsWith('\n') ? '\n' : ''}.apm/\n`;
      await fs.promises.writeFile(gitignorePath, next, 'utf8');
    } catch (err) {
      this.logger.warn(`.gitignore append skipped: ${(err as Error).message}`);
    }
  }
}

/** 语义化版本比较：a>=b 返回 >=0（解析失败视为最低版本） */
export function compareGitVersion(a?: string, b = MIN_GIT_VERSION): number {
  const parse = (v?: string): number[] =>
    (v ?? '')
      .trim()
      .split('.')
      .map((n) => Number.parseInt(n, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** git diff --stat 末行 summary 解析：「 3 files changed, 10 insertions(+), 2 deletions(-)」 */
export function parseDiffStatSummary(diffStat: string): {
  insertions: number;
  deletions: number;
} {
  const insertions = /(\d+) insertions?\(/.exec(diffStat)?.[1];
  const deletions = /(\d+) deletions?\(/.exec(diffStat)?.[1];
  return {
    insertions: insertions ? Number.parseInt(insertions, 10) : 0,
    deletions: deletions ? Number.parseInt(deletions, 10) : 0,
  };
}

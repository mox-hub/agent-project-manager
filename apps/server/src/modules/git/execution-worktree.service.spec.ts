/**
 * ExecutionWorktreeService 单测（G5-b）。
 *
 * fixture 红线：临时目录建**真 git 仓库**（git init + 初始 commit），
 * 不 spawn 任何 CLI/LLM——git 命令本身即被测对象。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ExecutionWorktreeService,
  WORKTREE_BRANCH_PREFIX,
  compareGitVersion,
  parseDiffStatSummary,
} from './execution-worktree.service';
import { GitToolService } from './git-tool.service';

let repoRoot: string;
let service: ExecutionWorktreeService;

const loggerMock = {
  setContext: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

/** GitToolService 直构造：prisma 无自配 git 路径（findVO 返回 null），走 PATH 上的 git */
function buildWorktreeService(): ExecutionWorktreeService {
  const gitTool = new GitToolService(
    loggerMock as never,
    {
      appConfig: { findFirst: async () => null },
    } as never,
  );
  return new ExecutionWorktreeService(gitTool);
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(execFile)('git', args, {
    cwd,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

/** Windows 路径归一化比较（git porcelain 输出正斜杠 + 大小写/短名差异） */
function samePath(a: string, b: string): boolean {
  const norm = (p: string) => {
    try {
      return fs.realpathSync.native(path.resolve(p)).replace(/[\\/]+$/, '');
    } catch {
      return path.resolve(p).replace(/[\\/]+$/, '');
    }
  };
  return norm(a).toLowerCase() === norm(b).toLowerCase();
}

/** 建真仓库 fixture：git init + user 配置 + 首提交 */
async function initRepo(dir: string): Promise<string> {
  await fs.promises.mkdir(dir, { recursive: true });
  await git(dir, ['init']);
  await git(dir, ['config', 'user.name', 'fixture']);
  await git(dir, ['config', 'user.email', 'fixture@apm.test']);
  await fs.promises.writeFile(path.join(dir, 'a.txt'), 'line1\nline2\nline3\n');
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-m', 'init']);
  return git(dir, ['rev-parse', 'HEAD']);
}

/** 在 worktree 内做一次带内容的提交 */
async function commitIn(
  dir: string,
  file: string,
  content: string,
  message: string,
): Promise<void> {
  await fs.promises.writeFile(path.join(dir, file), content);
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-m', message]);
}

beforeAll(async () => {
  repoRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'apm-wt-spec-'));
  await initRepo(repoRoot);
  service = buildWorktreeService();
});

afterAll(async () => {
  await fs.promises.rm(repoRoot, {
    recursive: true,
    force: true,
  });
});

describe('ExecutionWorktreeService', () => {
  it('prepareWorktree：建隔离 worktree + apm/exec 分支 + 幂等补 .gitignore', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_abcd1234');

    expect(prep.branch).toBe(`${WORKTREE_BRANCH_PREFIX}abcd1234`);
    expect(prep.worktreePath).toContain(
      path.join('.apm', 'worktrees', 'abcd1234'),
    );
    expect(fs.existsSync(prep.worktreePath)).toBe(true);
    // baseRef = 主仓 HEAD
    expect(prep.baseRef).toBe(await git(repoRoot, ['rev-parse', 'HEAD']));
    // 分支存在
    expect(
      await git(repoRoot, [
        'rev-parse',
        '--verify',
        `refs/heads/${prep.branch}`,
      ]),
    ).toBeTruthy();
    // .gitignore 幂等补了 .apm/
    const gitignore = await fs.promises.readFile(
      path.join(repoRoot, '.gitignore'),
      'utf8',
    );
    expect(gitignore.split(/\r?\n/)).toContain('.apm/');

    // 再次 prepare（另一执行）不重复追加条目
    await service.prepareWorktree(repoRoot, 'exec_effe5678');
    const gitignore2 = await fs.promises.readFile(
      path.join(repoRoot, '.gitignore'),
      'utf8',
    );
    expect(
      gitignore2.split(/\r?\n/).filter((l) => l.trim() === '.apm/'),
    ).toHaveLength(1);
  });

  it('prepareWorktree：非 git 目录抛错', async () => {
    const plain = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'apm-wt-plain-'),
    );
    try {
      await expect(
        service.prepareWorktree(plain, 'exec_xxx12345'),
      ).rejects.toThrow();
    } finally {
      await fs.promises.rm(plain, { recursive: true, force: true });
    }
  });

  it('prepareWorktree：分支已存在（重派）→ 拆旧场重建，不留陈旧提交', async () => {
    const executionId = 'exec_stale001';
    const first = await service.prepareWorktree(repoRoot, executionId);
    // 旧现场留一个提交
    await commitIn(
      first.worktreePath,
      'stale.txt',
      'stale\n',
      'stale scene commit',
    );

    const second = await service.prepareWorktree(repoRoot, executionId);
    expect(second.worktreePath).toBe(first.worktreePath);
    expect(second.branch).toBe(first.branch);
    // 新场无陈旧提交（status 干净且与 baseRef 无差）
    const status = await git(second.worktreePath, ['status', '--porcelain']);
    expect(status.trim()).toBe('');
    const changes = await service.collectChanges(
      second.worktreePath,
      second.baseRef,
    );
    expect(changes.hasChanges).toBe(false);
  });

  it('collectChanges：空变更 → hasChanges=false', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_empty0001');
    const changes = await service.collectChanges(
      prep.worktreePath,
      prep.baseRef,
    );
    expect(changes.hasChanges).toBe(false);
    expect(changes.commitCount).toBe(0);
    expect(changes.files).toEqual([]);
  });

  it('collectChanges：仅未提交变更 → 补快照 commit（author 兜底）', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_uncomm001');
    await fs.promises.writeFile(
      path.join(prep.worktreePath, 'new.txt'),
      'hello\n',
    );
    const changes = await service.collectChanges(
      prep.worktreePath,
      prep.baseRef,
      {
        message: 'chore(apm): execution uncomm001 snapshot',
        author: { name: 'APM Execution', email: 'execution@apm.local' },
      },
    );
    expect(changes.hasChanges).toBe(true);
    expect(changes.commitCount).toBe(1);
    expect(changes.files).toContain('new.txt');
    expect(changes.insertions).toBe(1);
    // 快照 author 落痕
    const authorLine = await git(prep.worktreePath, [
      'log',
      '-1',
      '--pretty=%ae',
    ]);
    expect(authorLine.trim()).toBe('execution@apm.local');
    // 快照后工作树干净
    const status = await git(prep.worktreePath, ['status', '--porcelain']);
    expect(status.trim()).toBe('');
  });

  it('collectChanges：仅 commits / 混合 → 计数与文件清单正确', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_mixed0001');
    await commitIn(prep.worktreePath, 'c1.txt', 'c1\n', 'worktree commit');
    await fs.promises.writeFile(path.join(prep.worktreePath, 'c2.txt'), 'c2\n');
    const changes = await service.collectChanges(
      prep.worktreePath,
      prep.baseRef,
      { message: 'snapshot' },
    );
    expect(changes.hasChanges).toBe(true);
    // 1 个手工提交 + 1 个快照提交
    expect(changes.commitCount).toBe(2);
    expect(changes.files).toEqual(expect.arrayContaining(['c1.txt', 'c2.txt']));
    expect(changes.headRef).toBe(
      await git(prep.worktreePath, ['rev-parse', 'HEAD']),
    );
  });

  it('detectConflicts：无冲突 clean=true；同文件分叉 clean=false 附冲突文件', async () => {
    const support = await service.checkMergeTreeSupport();
    if (!support.ready) {
      // 环境 git < 2.38 时跳过（CI ubuntu git 均 ≥ 2.40）
      return;
    }
    // 无冲突：worktree 独立文件
    const cleanPrep = await service.prepareWorktree(repoRoot, 'exec_cfcln001');
    await commitIn(cleanPrep.worktreePath, 'own.txt', 'own\n', 'own change');
    const clean = await service.detectConflicts(repoRoot, cleanPrep.branch);
    expect(clean.clean).toBe(true);
    expect(clean.files).toEqual([]);

    // 冲突：主仓与 worktree 各改 a.txt 同一行
    const conflictPrep = await service.prepareWorktree(
      repoRoot,
      'exec_cfcfl001',
    );
    await commitIn(repoRoot, 'a.txt', 'line1\nMAIN\nline3\n', 'main change');
    await commitIn(
      conflictPrep.worktreePath,
      'a.txt',
      'line1\nWORKTREE\nline3\n',
      'worktree change',
    );
    const conflicted = await service.detectConflicts(
      repoRoot,
      conflictPrep.branch,
    );
    expect(conflicted.clean).toBe(false);
    expect(conflicted.files).toContain('a.txt');
  });

  it('integrate：ff 可达场景仍产 --no-ff merge commit（双亲）', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_mrgf0001');
    await commitIn(prep.worktreePath, 'f.txt', 'f\n', 'feature change');
    const { mergeCommit } = await service.integrate(
      repoRoot,
      prep.branch,
      'merge: exec_mrgf0001',
    );
    expect(mergeCommit).toBe(await git(repoRoot, ['rev-parse', 'HEAD']));
    // 双亲 = 真 merge commit（--no-ff 生效）
    const parents = await git(repoRoot, [
      'rev-list',
      '--parents',
      '-n',
      '1',
      'HEAD',
    ]);
    expect(parents.trim().split(/\s+/)).toHaveLength(3);
  });

  it('cleanup：删除 worktree 与分支；非 apm/exec/ 前缀分支拒删；幂等可重入', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_cln00001');
    await expect(
      service.cleanup(repoRoot, prep.worktreePath, 'main', { force: true }),
    ).rejects.toThrow(/prefix/i);

    await service.cleanup(repoRoot, prep.worktreePath, prep.branch, {
      force: true,
    });
    expect(fs.existsSync(prep.worktreePath)).toBe(false);
    const branchGone = await git(repoRoot, [
      'rev-parse',
      '--verify',
      '--quiet',
      `refs/heads/${prep.branch}`,
    ]).catch(() => null);
    expect(branchGone).toBeNull();

    // 幂等：重复清理不抛
    await expect(
      service.cleanup(repoRoot, prep.worktreePath, prep.branch, {
        force: true,
      }),
    ).resolves.toBeUndefined();
  });

  it('inspect：列出现存 worktree 并 prune 成功', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_insp0001');
    const result = await service.inspect(repoRoot);
    expect(result.pruned).toBe(true);
    expect(
      result.worktrees.some((w) => samePath(w.path, prep.worktreePath)),
    ).toBe(true);
    // 悬挂：手动删目录后 prune 收敛 admin 记录
    await fs.promises.rm(prep.worktreePath, { recursive: true, force: true });
    const after = await service.inspect(repoRoot);
    expect(
      after.worktrees.some((w) => samePath(w.path, prep.worktreePath)),
    ).toBe(false);
  });

  it('isBranchMerged：未并入 false，integrate 后 true', async () => {
    const prep = await service.prepareWorktree(repoRoot, 'exec_anc00001');
    await commitIn(prep.worktreePath, 'anc.txt', 'anc\n', 'anc change');
    expect(await service.isBranchMerged(repoRoot, prep.branch)).toBe(false);
    await service.integrate(repoRoot, prep.branch, 'merge anc');
    expect(await service.isBranchMerged(repoRoot, prep.branch)).toBe(true);
  });
});

describe('纯函数', () => {
  it('compareGitVersion：语义化比较', () => {
    expect(compareGitVersion('2.45.1', '2.38.0')).toBeGreaterThan(0);
    expect(compareGitVersion('2.38.0', '2.38.0')).toBe(0);
    expect(compareGitVersion('2.37.3', '2.38.0')).toBeLessThan(0);
    expect(compareGitVersion(undefined, '2.38.0')).toBeLessThan(0);
    expect(compareGitVersion('2.45', '2.38.0')).toBeGreaterThan(0);
  });

  it('parseDiffStatSummary：提取增删行数（缺省 0）', () => {
    expect(
      parseDiffStatSummary(' a.txt | 3 +++\n 1 file changed, 3 insertions(+)'),
    ).toEqual({ insertions: 3, deletions: 0 });
    expect(
      parseDiffStatSummary(
        ' a.txt | 12 +++++++-----\n 1 file changed, 7 insertions(+), 5 deletions(-)',
      ),
    ).toEqual({ insertions: 7, deletions: 5 });
    expect(parseDiffStatSummary('')).toEqual({ insertions: 0, deletions: 0 });
  });
});

import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from 'octokit';
import {
  GITHUB_API_BASE,
  GITHUB_RETRY_MAX,
  GITHUB_BACKOFF_BASE_MS,
  GITHUB_BACKOFF_MAX_MS,
} from './github.constants';
import type {
  GitHubViewerInfo,
  GitHubRepository,
  GitHubPullRequest,
  GitHubCreatePrInput,
  GitHubMergePrInput,
  GitHubBranch,
  GitHubPullRequestReview,
} from './github.types';

/**
 * GitHub API 调用错误（统一封装）
 */
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
    public readonly url?: string,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  retry?: number;
}

/**
 * GitHub API Client
 * - 封装 octokit 使用 PAT 或 GitHub App token
 * - 自动处理 5xx/429 限流（指数退避）
 * - 401/403/404 抛出明确异常，不会重试
 * - 与 LinearClient 接口风格保持一致
 */
@Injectable()
export class GitHubClient {
  private readonly logger = new Logger(GitHubClient.name);
  private readonly octokit: Octokit;

  constructor(token: string) {
    if (!token || !token.trim()) {
      throw new GitHubApiError('GitHub token is required');
    }
    this.octokit = new Octokit({
      auth: token.trim(),
      baseUrl: GITHUB_API_BASE,
      userAgent: 'apm-agent-project-manager/1.0',
      request: { timeout: 30_000 },
    });
  }

  /** 暴露底层 octokit（供高级操作，如 paginate / GraphQL） */
  raw(): Octokit {
    return this.octokit;
  }

  // =================== 高层业务方法 ===================

  /**
   * 测试连接：获取认证用户的 viewer 信息
   * 同时尝试列出可访问的一个仓库以验证 scope
   */
  async fetchViewer(): Promise<GitHubViewerInfo> {
    try {
      const res = (await this.withRetry(() =>
        this.octokit.rest.users.getAuthenticated(),
      )) as {
        data: {
          login: string;
          id: number;
          name: string | null;
          email: string | null;
          avatar_url: string;
        };
        headers: Record<string, string>;
      };
      const headers = res.headers ?? {};
      return {
        login: res.data.login,
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        avatarUrl: res.data.avatar_url,
        scopes: this.parseScopes(headers['x-oauth-scopes']),
      };
    } catch (err) {
      throw new GitHubApiError(
        `fetchViewer failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  /**
   * 列出某个仓库信息（验证仓库存在 + 权限）
   */
  async fetchRepository(
    owner: string,
    repo: string,
  ): Promise<GitHubRepository> {
    try {
      const res = (await this.withRetry(() =>
        this.octokit.rest.repos.get({ owner, repo }),
      )) as { data: Parameters<typeof this.normalizeRepository>[0] };
      return this.normalizeRepository(
        res.data as Parameters<typeof this.normalizeRepository>[0],
      );
    } catch (err) {
      throw new GitHubApiError(
        `fetchRepository failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
        undefined,
        `${owner}/${repo}`,
      );
    }
  }

  /**
   * 列出仓库 branches
   */
  async listBranches(
    owner: string,
    repo: string,
    perPage = 100,
  ): Promise<GitHubBranch[]> {
    try {
      const res = await this.withRetry(() =>
        this.octokit.paginate(this.octokit.rest.repos.listBranches, {
          owner,
          repo,
          per_page: perPage,
        }),
      );
      return (
        res as Array<{
          name: string;
          commit: { sha: string };
          protected: boolean;
        }>
      ).map((b) => ({
        name: b.name,
        sha: b.commit.sha,
        protected: b.protected ?? false,
      }));
    } catch (err) {
      throw new GitHubApiError(
        `listBranches failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  /**
   * 取得默认分支 sha
   */
  async getDefaultBranchSha(owner: string, repo: string): Promise<string> {
    const repoInfo = await this.fetchRepository(owner, repo);
    return repoInfo.defaultBranch;
  }

  /**
   * 创建 Pull Request
   */
  async createPullRequest(
    input: GitHubCreatePrInput,
  ): Promise<GitHubPullRequest> {
    try {
      const res = (await this.withRetry(() =>
        this.octokit.rest.pulls.create({
          owner: input.owner,
          repo: input.repo,
          title: input.title,
          head: input.head,
          base: input.base,
          body: input.body,
          draft: input.draft,
        }),
      )) as { data: Parameters<typeof this.normalizePullRequest>[0] };
      return this.normalizePullRequest(
        res.data as Parameters<typeof this.normalizePullRequest>[0],
      );
    } catch (err) {
      throw new GitHubApiError(
        `createPullRequest failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  /**
   * 查询单个 PR
   */
  async fetchPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<GitHubPullRequest> {
    try {
      const res = (await this.withRetry(() =>
        this.octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: pullNumber,
        }),
      )) as { data: Parameters<typeof this.normalizePullRequest>[0] };
      return this.normalizePullRequest(
        res.data as Parameters<typeof this.normalizePullRequest>[0],
      );
    } catch (err) {
      throw new GitHubApiError(
        `fetchPullRequest failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  /**
   * 列出 PRs (open | closed | all)
   */
  async listPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
    perPage = 30,
  ): Promise<GitHubPullRequest[]> {
    try {
      const res = await this.withRetry(() =>
        this.octokit.paginate(this.octokit.rest.pulls.list, {
          owner,
          repo,
          state,
          per_page: perPage,
        }),
      );
      return (res as Parameters<typeof this.normalizePullRequest>[0][]).map(
        (p) => this.normalizePullRequest(p),
      );
    } catch (err) {
      throw new GitHubApiError(
        `listPullRequests failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  /**
   * 列出 PR 的 reviews
   */
  async listReviews(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<GitHubPullRequestReview[]> {
    try {
      const res = await this.withRetry(() =>
        this.octokit.paginate(this.octokit.rest.pulls.listReviews, {
          owner,
          repo,
          pull_number: pullNumber,
        }),
      );
      return (
        res as Array<{
          id: number;
          user: { login: string; id: number };
          state: string;
          body: string | null;
          submitted_at: string;
        }>
      ).map((r) => ({
        id: r.id,
        user: r.user,
        state: r.state as GitHubPullRequestReview['state'],
        body: r.body,
        submittedAt: r.submitted_at,
      }));
    } catch (err) {
      throw new GitHubApiError(
        `listReviews failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  /**
   * 合并 PR
   */
  async mergePullRequest(
    input: GitHubMergePrInput,
  ): Promise<{ merged: boolean; sha: string; message: string }> {
    try {
      const res = (await this.withRetry(() =>
        this.octokit.rest.pulls.merge({
          owner: input.owner,
          repo: input.repo,
          pull_number: input.pullNumber,
          commit_message: input.commitMessage,
          merge_method: input.mergeMethod ?? 'squash',
        }),
      )) as { data: { merged: boolean; sha: string; message: string } };
      return {
        merged: res.data.merged,
        sha: res.data.sha,
        message: res.data.message,
      };
    } catch (err) {
      throw new GitHubApiError(
        `mergePullRequest failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  /**
   * 将文件内容 push 到指定分支（封装 git-data：创建 blob → tree → commit → update ref）
   * 注意：本方法是高层封装，**仅**在客户端分支尚未 push 时使用。
   * 工作区已有分支时，习惯上 Agent 直接用本地 git push（dispatch 阶段）。
   */
  async pushFilesToBranch(opts: {
    owner: string;
    repo: string;
    branch: string;
    files: Array<{ path: string; content: string }>;
    commitMessage: string;
  }): Promise<{ commitSha: string }> {
    const { owner, repo, branch, files, commitMessage } = opts;
    try {
      // 1. 找到 ref
      const ref = (await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      })) as {
        data: { object: { sha: string } };
      };
      const parentSha = ref.data.object.sha;

      // 2. 找到 base tree
      const baseCommit = (await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: parentSha,
      })) as {
        data: { tree: { sha: string } };
      };

      // 3. 创建 blobs
      const blobs = await Promise.all(
        files.map((f) =>
          this.octokit.rest.git.createBlob({
            owner,
            repo,
            content: Buffer.from(f.content, 'utf8').toString('base64'),
            encoding: 'base64',
          }),
        ),
      );

      // 4. 创建 tree
      const tree = (await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: baseCommit.data.tree.sha,
        tree: files.map((f, i) => ({
          path: f.path,
          mode: '100644',
          type: 'blob',
          sha: (blobs[i] as { data: { sha: string } }).data.sha,
        })),
      })) as { data: { sha: string } };

      // 5. 创建 commit
      const commit = (await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: tree.data.sha,
        parents: [parentSha],
      })) as { data: { sha: string } };

      // 6. 更新 ref
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.data.sha,
      });

      return { commitSha: commit.data.sha };
    } catch (err) {
      throw new GitHubApiError(
        `pushFilesToBranch failed: ${(err as Error).message}`,
        (err as { status?: number }).status,
      );
    }
  }

  // =================== 内部 ===================

  private static readonly NON_RETRYABLE_STATUS = new Set([
    400, 401, 403, 404, 422,
  ]);

  /**
   * 包装 octokit rest 调用，带 5xx/429 退避重试
   * 返回类型由调用方断言（octokit 类型推导在此项目 tsconfig 下不够严格）
   */
  protected async withRetry(
    fn: () => Promise<unknown>,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const { signal, retry = GITHUB_RETRY_MAX } = options;
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= retry) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        const status = (err as { status?: number }).status;
        if (status && GitHubClient.NON_RETRYABLE_STATUS.has(status)) {
          throw err;
        }
        if (attempt >= retry) break;
        const backoffMs = this.computeBackoff(attempt);
        this.logger.warn(
          `GitHub request failed (status=${status ?? 'n/a'} attempt=${attempt + 1}/${retry + 1}); retrying in ${backoffMs}ms`,
        );
        await this.sleep(backoffMs, signal);
        attempt += 1;
      }
    }

    if (lastError instanceof Error) throw lastError;
    throw new GitHubApiError('GitHub request failed after retries');
  }

  private computeBackoff(attempt: number): number {
    const exp = Math.min(
      GITHUB_BACKOFF_BASE_MS * 2 ** attempt,
      GITHUB_BACKOFF_MAX_MS,
    );
    const jitter = Math.round(exp * (Math.random() * 0.4 - 0.2));
    return Math.max(GITHUB_BACKOFF_BASE_MS, exp + jitter);
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      if (signal) {
        const onAbort = () => {
          clearTimeout(t);
          reject(new GitHubApiError('Aborted'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  private parseScopes(raw?: string): string[] | undefined {
    if (!raw) return undefined;
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private normalizeRepository(r: {
    id: number;
    node_id?: string;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    default_branch: string;
    description: string | null;
    owner: { login: string; id: number; avatar_url?: string };
    permissions?: { admin: boolean; push: boolean; pull: boolean };
  }): GitHubRepository {
    return {
      id: r.id,
      nodeId: r.node_id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch,
      description: r.description,
      owner: {
        login: r.owner.login,
        id: r.owner.id,
        avatarUrl: r.owner.avatar_url,
      },
      permissions: r.permissions,
    };
  }

  private normalizePullRequest(p: {
    id: number;
    number: number;
    node_id?: string;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    merged: boolean;
    merged_at: string | null;
    merge_commit_sha: string | null;
    html_url: string;
    diff_url: string;
    patch_url: string;
    head: {
      ref: string;
      sha: string;
      repo: { full_name: string; default_branch?: string };
    };
    base: {
      ref: string;
      sha: string;
      repo: { full_name: string; default_branch?: string };
    };
    user: { login: string; id: number; avatar_url?: string };
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    additions?: number;
    deletions?: number;
    changed_files?: number;
  }): GitHubPullRequest {
    return {
      id: p.id,
      number: p.number,
      nodeId: p.node_id,
      title: p.title,
      body: p.body,
      state: p.state,
      merged: p.merged,
      mergedAt: p.merged_at,
      mergeCommitSha: p.merge_commit_sha,
      htmlUrl: p.html_url,
      diffUrl: p.diff_url,
      patchUrl: p.patch_url,
      head: {
        ref: p.head.ref,
        sha: p.head.sha,
        repo: {
          fullName: p.head.repo.full_name,
          defaultBranch: p.head.repo.default_branch,
        },
      },
      base: {
        ref: p.base.ref,
        sha: p.base.sha,
        repo: {
          fullName: p.base.repo.full_name,
          defaultBranch: p.base.repo.default_branch,
        },
      },
      user: {
        login: p.user.login,
        id: p.user.id,
        avatarUrl: p.user.avatar_url,
      },
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      closedAt: p.closed_at,
      additions: p.additions,
      deletions: p.deletions,
      changedFiles: p.changed_files,
    };
  }
}

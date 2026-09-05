/**
 * GitHub 类型定义
 * 与 GitHub REST v3 的最小子集（octokit 类型也可直接复用，此文件用于轻量场景）
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatarUrl?: string;
  name?: string | null;
  email?: string | null;
}

/** GitHub Repository 简化版 */
export interface GitHubRepository {
  id: number;
  nodeId?: string;
  name: string;
  fullName: string; // owner/repo
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  description?: string | null;
  owner: { login: string; id: number; avatarUrl?: string };
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

/** GitHub Pull Request 简化版 */
export interface GitHubPullRequest {
  id: number;
  number: number;
  nodeId?: string;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged: boolean;
  mergedAt: string | null;
  mergeCommitSha: string | null;
  htmlUrl: string;
  diffUrl: string;
  patchUrl: string;
  head: {
    ref: string;
    sha: string;
    repo: { fullName: string; defaultBranch?: string };
  };
  base: {
    ref: string;
    sha: string;
    repo: { fullName: string; defaultBranch?: string };
  };
  user: { login: string; id: number; avatarUrl?: string };
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  /** 与 APM 映射后的最终状态 */
  apmState?: string;
}

/** GitHub Review (简化) */
export interface GitHubPullRequestReview {
  id: number;
  user: { login: string; id: number };
  state:
    'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | 'DISMISSED';
  body: string | null;
  submittedAt: string;
}

/** GitHub Branch */
export interface GitHubBranch {
  name: string;
  sha: string;
  protected: boolean;
}

export interface GitHubCreatePrInput {
  owner: string;
  repo: string;
  title: string;
  head: string; // 分支名
  base: string; // 目标分支（通常 main/dev）
  body?: string;
  draft?: boolean;
}

export interface GitHubMergePrInput {
  owner: string;
  repo: string;
  pullNumber: number;
  commitMessage?: string;
  mergeMethod?: 'merge' | 'squash' | 'rebase';
}

/** 测试连接结果 */
export interface GitHubViewerInfo {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  scopes?: string[];
}

/** webhook payload 顶部 */
export interface GitHubWebhookEnvelope<T = unknown> {
  event: string; // X-GitHub-Event 头
  deliveryId: string;
  payload: T;
}

/** pull_request webhook payload 中的 sender / repository / pull_request 字段 */
export interface GitHubPullRequestWebhookPayload {
  action:
    | 'opened'
    | 'edited'
    | 'closed'
    | 'reopened'
    | 'assigned'
    | 'unassigned'
    | 'review_requested'
    | 'review_request_removed'
    | 'labeled'
    | 'unlabeled'
    | 'synchronize'
    | 'ready_for_review'
    | 'converted_to_draft';
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    merged: boolean;
    merged_at: string | null;
    html_url: string;
    head: { ref: string; sha: string };
    base: { ref: string; sha: string };
    user: { login: string; id: number };
    updated_at: string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
    owner: { login: string; id: number };
  };
  sender: { login: string; id: number };
}

/** pull_request_review webhook payload */
export interface GitHubPullRequestReviewWebhookPayload {
  action: 'submitted' | 'edited' | 'dismissed' | 'deleted' | 'published';
  review: GitHubPullRequestReview & {
    pull_request_url?: string;
    html_url?: string;
  };
  pull_request: {
    number: number;
    id: number;
    state: 'open' | 'closed';
    merged: boolean;
  };
  repository: {
    full_name: string;
    owner: { login: string };
    name: string;
  };
  sender: { login: string; id: number };
}

/** 同步摘要 */
export interface SyncSummary {
  ok: boolean;
  created?: number;
  updated?: number;
  conflicts?: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
}

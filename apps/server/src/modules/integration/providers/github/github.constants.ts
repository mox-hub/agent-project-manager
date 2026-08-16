export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
export const GITHUB_API_VERSION = '2022-11-28';

export const GITHUB_RETRY_MAX = 3;
export const GITHUB_BACKOFF_BASE_MS = 1000;
export const GITHUB_BACKOFF_MAX_MS = 30_000;

/** V3 阶段2：PR 状态后端存储的合法状态 */
export const GITHUB_PR_STATES = [
  'open',
  'merged',
  'closed',
  'changes_requested',
  'merged_with_comments',
] as const;
export type GitHubPrState = (typeof GITHUB_PR_STATES)[number];

/** GitHub webhook event type */
export const GITHUB_WEBHOOK_EVENTS = [
  'pull_request',
  'pull_request_review',
  'push',
  'check_run',
  'check_suite',
] as const;
export type GitHubWebhookEvent = (typeof GITHUB_WEBHOOK_EVENTS)[number];

/** PR 状态转换 → TrustService 输入（PR 通过率作为 correctness 维度补充） */
export const PR_OUTCOME_DELTAS: Record<GitHubPrState, number> = {
  open: 0,
  merged: +8, // 大幅加分
  merged_with_comments: +4, // 勉强通过
  changes_requested: -4, // 被打回：扣分
  closed: -2, // 直接关闭（未合并）：小扣
};

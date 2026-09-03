export const LINEAR_GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql';
export const LINEAR_API_VERSION = '2024-12-01';

export const LINEAR_DEFAULT_PAGE_SIZE = 50;
export const LINEAR_MAX_PAGE_SIZE = 250;
export const LINEAR_RETRY_MAX = 3;
export const LINEAR_BACKOFF_BASE_MS = 1000;
export const LINEAR_BACKOFF_MAX_MS = 30_000;
export const LINEAR_CONFLICT_WINDOW_MS = 2_000;

export const TASK_PROVIDER_LINEAR = 'linear';

export type SyncDirection =
  'pull' | 'push' | 'two-way' | 'force-pull' | 'force-push';
export type SyncStatusValue = 'success' | 'failed' | 'conflict';
export type ProjectSyncStatus = 'synced' | 'pending' | 'error' | 'never_synced';

/**
 * Linear status.type -> APM Project.workflowStatus
 * - backlog|triage -> backlog
 * - unstarted -> planned
 * - started -> in_progress
 * - completed -> completed
 * - canceled|cancelled -> canceled
 */
export const LINEAR_STATE_TYPE_TO_WORKFLOW: Record<string, string> = {
  backlog: 'backlog',
  triage: 'backlog',
  unstarted: 'planned',
  started: 'in_progress',
  completed: 'completed',
  canceled: 'canceled',
  cancelled: 'canceled',
};

/**
 * Linear priority → APM Task.priority (note反转).
 * Linear:
 *   0 = No priority
 *   1 = Urgent
 *   2 = High
 *   3 = Medium
 *   4 = Low
 * APM:
 *   urgent (highest) -> critical
 *   high -> high
 *   medium -> medium
 *   low -> low
 *   no priority -> low
 */
export const LINEAR_PRIORITY_TO_TASK: Record<number, string> = {
  0: 'low',
  1: 'critical',
  2: 'high',
  3: 'medium',
  4: 'low',
};

export const TASK_PRIORITY_TO_LINEAR: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

/**
 * Fields that the integration module cannot modify locally on a Linear-sourced project.
 * 其他字段（如 members、documentsRepoPath、metadata、aiContext、本地进度、风险等级等）仍可本系统编辑。
 */
export const LINEAR_LOCKED_PROJECT_FIELDS = [
  'name',
  'description',
  'icon',
  'color',
  'workflowStatus',
  'priority',
  'healthStatus',
  'targetDate',
  'startDate',
] as const;

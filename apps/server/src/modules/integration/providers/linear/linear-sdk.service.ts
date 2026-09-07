import { Injectable, Logger } from '@nestjs/common';
import {
  LinearClient,
  Team,
  Project,
  Issue,
  WorkflowState,
  IssueLabel,
  User,
  ProjectLabel,
  RatelimitedLinearError,
  NetworkLinearError,
  type LinearError,
} from '@linear/sdk';
import pRetry from 'p-retry';
import {
  LINEAR_RETRY_MAX,
  LINEAR_BACKOFF_BASE_MS,
  LINEAR_BACKOFF_MAX_MS,
} from './linear.constants';

/**
 * Linear API 调用错误（统一封装，原 linear-client 的对外错误类型）
 */
export class LinearApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'LinearApiError';
  }
}

interface LinearRequestOptions {
  signal?: AbortSignal;
  retry?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * LinearSDKService - 使用官方 Linear SDK 的服务
 *
 * 官方文档：https://linear.app/developers/sdk-fetching-and-modifying-data.md
 * - 高层 API（viewer/projects/issues/...）走 SDK 模型
 * - SDK 覆盖不到的查询走 `request()`（底层 GraphQL 逃生舱），
 *   统一带 429/5xx/网络错误退避重试（p-retry，尊重 retry-after）
 */
@Injectable()
export class LinearSDKService {
  private readonly logger = new Logger(LinearSDKService.name);

  /** 这些 GraphQL error type 不值得重试（与原 linear-client 语义一致） */
  private static readonly NON_RETRYABLE_ERROR_TYPES = new Set([
    'invalid_input',
    'forbidden',
    'unauthorized',
    'not_found',
    'authentication',
    'graphql_validation_failed',
  ]);

  /**
   * 原生 GraphQL 逃生舱：SDK 高层 API 覆盖不到的查询用它保形状。
   * 重试语义（与原 LinearClient.request 对齐）：
   * - 最多 retry 次（默认 LINEAR_RETRY_MAX）
   * - 429：尊重 retry-after（封顶 LINEAR_BACKOFF_MAX_MS），再叠加指数退避
   * - 5xx / 网络错误 / 未知 GraphQL 错误：指数退避 + 抖动重试
   * - 4xx（非 429）与 INVALID_INPUT/UNAUTHORIZED 等错误：立即失败
   */
  async request<T>(
    client: LinearClient,
    query: string,
    variables?: Record<string, unknown>,
    options: LinearRequestOptions = {},
  ): Promise<T> {
    const { signal, retry = LINEAR_RETRY_MAX } = options;
    try {
      return await pRetry(
        async () => {
          try {
            if (signal?.aborted) {
              throw new pRetry.AbortError('Aborted');
            }
            // SDK 原生 GraphQL 逃生舱：LinearClient.client (LinearGraphQLClient)
            return (await client.client.request(query, variables)) as T;
          } catch (err) {
            const le = err as LinearError;

            if (le instanceof RatelimitedLinearError) {
              // 429：尊重 retry-after（秒），封顶后先睡再进入退避
              if (le.retryAfter && le.retryAfter > 0) {
                await sleep(
                  Math.min(le.retryAfter * 1000, LINEAR_BACKOFF_MAX_MS),
                );
              }
              throw err;
            }
            if (le instanceof NetworkLinearError) {
              throw err; // 网络错误：重试
            }

            const status = le.status;
            const isRetryableStatus =
              status == null || status >= 500 || status === 429;
            const hasNonRetryableType =
              le.type != null &&
              LinearSDKService.NON_RETRYABLE_ERROR_TYPES.has(le.type);

            if (isRetryableStatus && !hasNonRetryableType) {
              // 5xx / 429 / 无 HTTP 状态的未知错误：重试
              throw err;
            }
            // 4xx（非 429）或已知不可重试的 GraphQL type：立即失败
            throw new pRetry.AbortError(
              new LinearApiError((err as Error).message, status, le.type),
            );
          }
        },
        {
          retries: retry,
          factor: 2,
          minTimeout: LINEAR_BACKOFF_BASE_MS,
          maxTimeout: LINEAR_BACKOFF_MAX_MS,
          randomize: true, // 指数退避 + 随机抖动（近似原 ±20% jitter）
          onFailedAttempt: (error) => {
            this.logger.warn(
              `Linear request failed (attempt ${error.attemptNumber}/${retry + 1}); retries left=${error.retriesLeft}`,
            );
          },
        },
      );
    } catch (err) {
      // 统一错误面：外部调用方拿到的始终是 LinearApiError（或原始 SDK 错误的包装）
      if (err instanceof LinearApiError) {
        throw err;
      }
      throw new LinearApiError((err as Error).message);
    }
  }

  /**
   * 创建 Linear SDK 客户端
   */
  createClient(apiKey: string): LinearClient {
    return new LinearClient({ apiKey });
  }

  /**
   * 获取当前用户信息
   */
  async fetchViewer(client: LinearClient) {
    const viewer = await client.viewer;
    const org = await viewer.organization;
    const teamsResult = await viewer.teams();

    return {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
      organization: org
        ? {
            id: org.id,
            name: org.name,
            urlKey: org.urlKey,
          }
        : null,
      teams: {
        nodes: teamsResult.nodes.map((t: Team) => ({
          id: t.id,
          key: t.key,
          name: t.name,
          description: t.description,
        })),
      },
    };
  }

  /**
   * 获取所有项目（分页）
   */
  async fetchProjects(
    client: LinearClient,
    options: { first?: number; after?: string | null } = {},
  ) {
    const projects = await client.projects({
      first: options.first ?? 50,
      after: options.after ?? undefined,
    });

    return {
      projects: projects.nodes.map((p: Project) => {
        const data = (p as any)._data || {};
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          icon: p.icon,
          color: p.color,
          priority: p.priority,
          priorityLabel: p.priorityLabel,
          progress: p.progress,
          startDate: p.startDate,
          targetDate: p.targetDate,
          state: p.state,
          url: p.url,
          updatedAt:
            (p.updatedAt as Date)?.toString() ?? new Date().toISOString(),
          createdAt:
            (p.createdAt as Date)?.toString() ?? new Date().toISOString(),
          teams: { nodes: [] },
        };
      }),
      hasNextPage: projects.pageInfo.hasNextPage,
      endCursor: projects.pageInfo.endCursor,
    };
  }

  /**
   * 获取指定项目的 Issues（分页）
   */
  async fetchProjectIssues(
    client: LinearClient,
    projectId: string,
    options: { first?: number; after?: string | null } = {},
  ) {
    const project = await client.project(projectId);
    // Linear SDK 的 Project 对象属性直接可访问，不需要 fetch()
    const projectData = {
      id: project.id,
      name: project.name,
    };

    if (!projectData.id) {
      return { project: null, issues: [], hasNextPage: false };
    }

    const issues = await project.issues({
      first: options.first ?? 50,
      after: options.after ?? undefined,
    });

    // 额外获取每个 issue 的 parent 信息
    const mappedIssues = [];
    for (const issue of issues.nodes) {
      const [issueData, parent] = await Promise.all([
        this.fetchIssueBasic(issue),
        this.getIssueParent(issue),
      ]);

      const [state, labels, assignee] = await Promise.all([
        this.getIssueState(issue),
        this.getIssueLabels(issue),
        this.getIssueAssignee(issue),
      ]);

      mappedIssues.push({
        ...issueData,
        state,
        labels,
        assignee,
        project: null,
        parent,
      });
    }

    return {
      project: { id: projectData.id, name: projectData.name },
      issues: mappedIssues,
      hasNextPage: issues.pageInfo.hasNextPage,
      endCursor: issues.pageInfo.endCursor,
    };
  }

  /**
   * 获取 Issue 的基本字段（不包含关联数据）
   */
  private fetchIssueBasic(issue: Issue) {
    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      estimate: issue.estimate,
      url: issue.url,
      createdAt:
        (issue.createdAt as Date)?.toString() ?? new Date().toISOString(),
      updatedAt:
        (issue.updatedAt as Date)?.toString() ?? new Date().toISOString(),
      archivedAt: issue.archivedAt
        ? (issue.archivedAt as Date).toString()
        : null,
      dueDate: issue.dueDate,
      startedAt: issue.startedAt ? (issue.startedAt as Date).toString() : null,
      completedAt: issue.completedAt
        ? (issue.completedAt as Date).toString()
        : null,
    };
  }

  private async getIssueState(issue: Issue) {
    try {
      const workflowState = await issue.state;
      if (!workflowState) return null;
      return {
        id: workflowState.id,
        name: workflowState.name,
        type: workflowState.type,
        color: workflowState.color,
        position: workflowState.position,
      };
    } catch {
      return null;
    }
  }

  private async getIssueLabels(issue: Issue) {
    try {
      const labels = await issue.labels();
      return {
        nodes: labels.nodes.map((l: IssueLabel) => ({
          id: l.id,
          name: l.name,
          color: l.color,
        })),
      };
    } catch {
      return { nodes: [] };
    }
  }

  private async getIssueAssignee(issue: Issue) {
    try {
      const assignee = await issue.assignee;
      if (!assignee) return null;
      return {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email,
      };
    } catch {
      return null;
    }
  }

  private async getIssueParent(issue: Issue) {
    try {
      const parent = await issue.parent;
      if (!parent) return null;
      this.logger.debug(`Found parent for issue ${issue.id}: ${parent.id}`);
      return { id: parent.id };
    } catch (err) {
      this.logger.warn(
        `Failed to get parent for issue ${issue.id}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * 获取单个 Issue
   */
  async fetchIssue(client: LinearClient, issueId: string) {
    try {
      const issue = await client.issue(issueId);
      // Linear SDK 的 Issue 对象属性直接可访问，不需要 fetch()
      const data = {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        priorityLabel: issue.priorityLabel,
        estimate: issue.estimate,
        url: issue.url,
        createdAt:
          (issue.createdAt as Date)?.toString() ?? new Date().toISOString(),
        updatedAt:
          (issue.updatedAt as Date)?.toString() ?? new Date().toISOString(),
        archivedAt: issue.archivedAt
          ? (issue.archivedAt as Date).toString()
          : null,
        dueDate: issue.dueDate,
        startedAt: issue.startedAt
          ? (issue.startedAt as Date).toString()
          : null,
        completedAt: issue.completedAt
          ? (issue.completedAt as Date).toString()
          : null,
      };

      if (!data.id) return null;

      const [state, labels, assignee, parent] = await Promise.all([
        this.getIssueState(issue),
        this.getIssueLabels(issue),
        this.getIssueAssignee(issue),
        this.getIssueParent(issue),
      ]);

      return {
        ...data,
        state,
        labels,
        assignee,
        project: null,
        parent,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch issue ${issueId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * 创建 Issue
   */
  async createIssue(
    client: LinearClient,
    input: {
      title: string;
      description?: string;
      priority?: number;
      teamId?: string;
      projectId?: string;
      parentId?: string;
      labelIds?: string[];
      assigneeId?: string;
    },
  ) {
    const result = await client.createIssue(input as any);
    const success = await result.success;
    if (!success) {
      return { success: false };
    }
    const issue = await result.issue;
    if (!issue) {
      return { success: false };
    }
    return {
      success: true,
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        url: issue.url,
        updatedAt:
          (issue.updatedAt as Date)?.toString() ?? new Date().toISOString(),
      },
    };
  }

  /**
   * 更新 Issue
   */
  async updateIssue(
    client: LinearClient,
    issueId: string,
    input: {
      title?: string;
      description?: string;
      priority?: number;
      stateId?: string;
      assigneeId?: string;
      parentId?: string;
    },
  ) {
    const result = await client.updateIssue(issueId, input as any);
    const success = await result.success;
    if (!success) {
      return { success: false };
    }
    const issue = await result.issue;
    if (!issue) {
      return { success: true };
    }
    return {
      success: true,
      issue: {
        id: issue.id,
        updatedAt:
          (issue.updatedAt as Date)?.toString() ?? new Date().toISOString(),
      },
    };
  }

  /**
   * 获取项目标签
   */
  async fetchProjectLabels(client: LinearClient, projectId: string) {
    try {
      const project = await client.project(projectId);
      const labels = await project.labels();
      return labels.nodes.map((l: ProjectLabel) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      }));
    } catch (error) {
      this.logger.warn(
        `Failed to fetch project labels: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * 获取项目周期（Cycles）
   */
  async fetchProjectCycles(client: LinearClient, projectId: string) {
    return [];
  }
}

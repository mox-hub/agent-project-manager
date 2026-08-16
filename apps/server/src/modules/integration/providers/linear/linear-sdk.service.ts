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
} from '@linear/sdk';

/**
 * LinearSDKService - 使用官方 Linear SDK 的服务
 *
 * 官方文档：https://linear.app/developers/sdk-fetching-and-modifying-data.md
 */
@Injectable()
export class LinearSDKService {
  private readonly logger = new Logger(LinearSDKService.name);

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

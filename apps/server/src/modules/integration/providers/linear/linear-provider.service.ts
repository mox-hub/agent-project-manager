import { Injectable } from '@nestjs/common';
import { LinearClient } from './linear-client';
import type {
  LinearIssue,
  LinearIssueResponse,
  LinearProject,
  LinearProjectsResponse,
  LinearProjectIssuesResponse,
  LinearTeam,
  LinearViewerResponse,
} from './linear.types';

const VIEWER_QUERY = `
  query Viewer {
    viewer {
      id
      name
      email
      organization {
        id
        name
        urlKey
      }
      teams {
        nodes {
          id
          key
          name
          description
        }
      }
    }
  }
`;

const PROJECTS_QUERY = `
  query Projects($first: Int!, $after: String) {
    projects(first: $first, after: $after) {
      nodes {
        id
        name
        url
        state
        updatedAt
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PROJECT_ISSUES_QUERY = `
  query ProjectIssues($projectId: String!, $first: Int!, $after: String) {
    project(id: $projectId) {
      id
      name
      issues(first: $first, after: $after) {
        nodes {
          id
          identifier
          title
          description
          priority
          priorityLabel
          estimate
          url
          createdAt
          updatedAt
          archivedAt
          dueDate
          startedAt
          completedAt
          state { id name type color position }
          labels { nodes { id name color } }
          assignee { id name email }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const ISSUE_CREATE_MUTATION = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier url updatedAt }
    }
  }
`;

const ISSUE_UPDATE_MUTATION = `
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue { id updatedAt }
    }
  }
`;

/**
 * LinearProviderService
 * - 高层 Linear API 封装（基于 LinearClient + 预定义 GraphQL 查询）
 * - 返回强类型结果，向上层屏蔽 GraphQL 细节
 */
@Injectable()
export class LinearProviderService {
  /**
   * 获取当前用户、组织、团队信息（用于初次连接时显示工作区）
   */
  async fetchViewer(client: LinearClient) {
    const data = await client.request<LinearViewerResponse>({
      query: VIEWER_QUERY,
    });
    return data.viewer;
  }

  /**
   * 分页列出 Active 项目
   */
  async fetchProjects(
    client: LinearClient,
    opts: { first?: number; after?: string | null } = {},
  ): Promise<{ projects: LinearProject[]; hasNextPage: boolean; endCursor?: string | null }> {
    const data = await client.request<LinearProjectsResponse>({
      query: PROJECTS_QUERY,
      variables: { first: opts.first ?? 50, after: opts.after ?? null },
    });
    const pageInfo = data.projects.pageInfo ?? { hasNextPage: false };
    return {
      projects: data.projects.nodes ?? [],
      hasNextPage: Boolean(pageInfo.hasNextPage),
      endCursor: pageInfo.endCursor,
    };
  }

  /**
   * 列出指定 Linear project 下的 issue（分页）
   */
  async fetchProjectIssues(
    client: LinearClient,
    projectId: string,
    opts: { first?: number; after?: string | null } = {},
  ): Promise<{
    project: { id: string; name: string } | null;
    issues: LinearIssue[];
    hasNextPage: boolean;
    endCursor?: string | null;
  }> {
    const data = await client.request<LinearProjectIssuesResponse>({
      query: PROJECT_ISSUES_QUERY,
      variables: {
        projectId,
        first: opts.first ?? 50,
        after: opts.after ?? null,
      },
    });
    const issueConn = data.project?.issues ?? { nodes: [], pageInfo: { hasNextPage: false } };
    return {
      project: data.project
        ? { id: data.project.id, name: data.project.name }
        : null,
      issues: issueConn.nodes ?? [],
      hasNextPage: Boolean(issueConn.pageInfo?.hasNextPage),
      endCursor: issueConn.pageInfo?.endCursor,
    };
  }

  /**
   * 创建 Linear issue（在 push 同步中使用）
   */
  async createIssue(
    client: LinearClient,
    input: Record<string, unknown>,
  ) {
    const data = await client.request<LinearIssueResponse>({
      query: ISSUE_CREATE_MUTATION,
      variables: { input },
    });
    return data.issueCreate;
  }

  /**
   * 更新 Linear issue（在 push 同步中使用）
   */
  async updateIssue(
    client: LinearClient,
    issueId: string,
    input: Record<string, unknown>,
  ) {
    const data = await client.request<LinearIssueResponse>({
      query: ISSUE_UPDATE_MUTATION,
      variables: { id: issueId, input },
    });
    return data.issueUpdate;
  }
}

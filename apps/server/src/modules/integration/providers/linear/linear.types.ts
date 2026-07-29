/**
 * Linear GraphQL 响应类型定义（仅包含 we use 的字段）。
 * 完整字段参考 https://studio.apollographql.com/public/Linear-API/schema/reference
 */

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

export interface LinearOrganization {
  id: string;
  name: string;
  urlKey?: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  organizationId?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  priority?: number | null;
  priorityLabel?: string | null;
  progress?: number | null;
  startDate?: string | null;
  targetDate?: string | null;
  state?: string | null;
  url?: string;
  lead?: { id: string; name: string } | null;
  members?: { nodes: { id: string; name: string; email: string }[] };
  teams?: { nodes: LinearTeam[] };
  updatedAt: string;
  createdAt: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: string;
  color?: string;
  position?: number;
}

export interface LinearLabel {
  id: string;
  name: string;
  color?: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  priority?: number | null;
  priorityLabel?: string | null;
  estimate?: number | null;
  url: string;
  state?: LinearWorkflowState | null;
  labels?: { nodes: LinearLabel[] };
  assignee?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  dueDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  project?: { id: string; name: string } | null;
}

export interface LinearGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: { type?: string; code?: string };
  }>;
}

export interface LinearViewerResponse {
  viewer: LinearUser & {
    organization?: LinearOrganization | null;
    teams: { nodes: LinearTeam[] };
  };
}

export interface LinearProjectsResponse {
  projects: {
    nodes: LinearProject[];
    pageInfo?: { hasNextPage: boolean; endCursor?: string | null };
  };
}

export interface LinearProjectIssuesResponse {
  project: {
    id: string;
    name: string;
    issues: {
      nodes: LinearIssue[];
      pageInfo?: { hasNextPage: boolean; endCursor?: string | null };
    };
  } | null;
}

export interface LinearIssueResponse {
  issueCreate?: {
    success: boolean;
    issue?: Pick<LinearIssue, 'id' | 'identifier' | 'url' | 'updatedAt'>;
  };
  issueUpdate?: {
    success: boolean;
    issue?: Pick<LinearIssue, 'id' | 'updatedAt'>;
  };
}

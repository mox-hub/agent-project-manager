/**
 * Linear 类型定义
 * 与 Linear SDK 类型兼容
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
  /** 父任务的 Linear ID（用于子任务同步）- SDK 格式 */
  parent?: { id: string } | null;
}

export interface LinearGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: { type?: string; code?: string };
  }>;
}

export interface LinearViewer {
  id: string;
  name: string;
  email: string;
  organization?: LinearOrganization | null;
  teams: { nodes: LinearTeam[] };
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

/** Linear Cycle */
export interface LinearCycle {
  id: string;
  name: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: string | null;
  progress?: number | null;
  completedAt?: string | null;
  number?: number | null;
  url?: string;
}

/** Linear Project Milestones */
export interface LinearMilestone {
  id: string;
  name: string;
  identifier?: string | null;
  description?: string | null;
  targetDate?: string | null;
  status?: string | null;
  progress?: number | null;
  completedAt?: string | null;
  url?: string;
  projectId?: string;
}

/** Labels response from Linear */
export interface LinearLabelsResponse {
  project: {
    id: string;
    name: string;
    labels: {
      nodes: LinearLabel[];
      pageInfo?: { hasNextPage: boolean; endCursor?: string | null };
    };
  } | null;
}

/** Cycles response from Linear */
export interface LinearCyclesResponse {
  project: {
    id: string;
    name: string;
    cycles: {
      nodes: LinearCycle[];
      pageInfo?: { hasNextPage: boolean; endCursor?: string | null };
    };
  } | null;
}

/** Milestones response from Linear */
export interface LinearMilestonesResponse {
  project: {
    id: string;
    name: string;
    milestones: {
      nodes: LinearMilestone[];
      pageInfo?: { hasNextPage: boolean; endCursor?: string | null };
    };
  } | null;
}

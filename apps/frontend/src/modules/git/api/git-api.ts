import { api, type PaginatedData } from '../../../infrastructure/api-client';

export interface Repository {
  id: string;
  projectId: string;
  name: string;
  localPath?: string;
  remoteUrl?: string;
  role?: string;
  defaultBranch?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryDto {
  projectId: string;
  name: string;
  localPath?: string;
  remoteUrl?: string;
  role?: string;
  defaultBranch?: string;
  provider?: string;
}

export interface UpdateRepositoryDto {
  name?: string;
  localPath?: string;
  remoteUrl?: string;
  role?: string;
  defaultBranch?: string;
  provider?: string;
}

export interface RepositoryStatus {
  clean: boolean;
  ahead: number;
  behind: number;
  changedFiles: Array<{
    path: string;
    status: string;
  }>;
  currentBranch?: string;
  error?: string;
}

export interface Commit {
  id: string;
  repoId: string;
  hash: string;
  authorName: string;
  authorEmail?: string;
  authorDate: string;
  message: string;
  files?: CommitFile[];
}

export interface CommitFile {
  id: string;
  commitId: string;
  path: string;
  status: string;
  additions?: number;
  deletions?: number;
  changes?: number;
}

export interface DiffResult {
  files: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
  totalAdditions: number;
  totalDeletions: number;
  totalChanges: number;
}

export interface PullRequest {
  id: string;
  repoId: string;
  externalId: string;
  title: string;
  description?: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  status: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
}

export interface GitToolStatusData {
  available: boolean;
  version?: string;
  path?: string;
  config?: Record<string, string>;
  error?: string;
  suggestion?: string;
}

export interface Workspace {
  id: string;
  projectId: string;
  localPath?: string;
  remoteUrl?: string;
  autoClone: boolean;
  validatedAt?: string;
  validationStatus?: 'valid' | 'invalid' | 'unknown';
  validationError?: string;
}

export interface WorkspaceValidationResult {
  valid: boolean;
  status: 'valid' | 'invalid' | 'unknown';
  error?: string;
  suggestion?: string;
  gitRepoDetected?: boolean;
}

export interface GitCommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: string;
  errorMessage?: string;
  suggestion?: string;
}

export interface GitCommandRecord {
  id: string;
  repoId: string;
  userId: string;
  command: string;
  args: string[];
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration?: number;
  executedAt: string;
}

export interface BranchListResult {
  local: Array<{
    name: string;
    current: boolean;
    tracking: string | null;
  }>;
  remote: Array<{
    name: string;
    remote: string;
    fullName: string;
  }>;
  current: string | null;
}

export const gitApi = {
  // Repository APIs
  getRepositories: (params?: { projectId?: string; provider?: string }) => {
    return api.get<Repository[]>('/git/repos', { params });
  },

  createRepository: (dto: CreateRepositoryDto) => {
    return api.post<Repository>('/git/repos', dto);
  },

  getRepositoryById: (repoId: string) => {
    return api.get<Repository>(`/git/repos/${repoId}`);
  },

  updateRepository: (repoId: string, dto: UpdateRepositoryDto) => {
    return api.patch<Repository>(`/git/repos/${repoId}`, dto);
  },

  deleteRepository: (repoId: string) => {
    return api.delete<void>(`/git/repos/${repoId}`);
  },

  getRepositoryStatus: (repoId: string) => {
    return api.get<RepositoryStatus>(`/git/repos/${repoId}/status`);
  },

  // Commit APIs
  getCommits: (
    repoId: string,
    params?: {
      from?: string;
      to?: string;
      author?: string;
      path?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    },
  ) => {
    return api.getPaginated<Commit>(`/git/repos/${repoId}/commits`, params);
  },

  getCommitById: (commitId: string) => {
    return api.get<Commit>(`/git/commits/${commitId}`);
  },

  // Diff APIs
  generateDiff: (dto: {
    repoId: string;
    baseRef: string;
    targetRef: string;
    pathFilter?: string[];
  }) => {
    return api.post<DiffResult>('/git/diff', dto);
  },

  getWorkingDiff: (repoId: string) => {
    return api.get<DiffResult>(`/git/repos/${repoId}/diff/working`);
  },

  getStagedDiff: (repoId: string) => {
    return api.get<DiffResult>(`/git/repos/${repoId}/diff/staged`);
  },

  // Pull Request APIs
  getPullRequests: (
    repoId: string,
    params?: { status?: string; author?: string },
  ) => {
    return api.get<PullRequest[]>(`/git/repos/${repoId}/pull-requests`, params);
  },

  getPullRequestById: (prId: string) => {
    return api.get<PullRequest>(`/git/pull-requests/${prId}`);
  },

  createPullRequestReview: (
    prId: string,
    dto: {
      type: string;
      state: string;
      summary?: string;
      comments?: unknown[];
    },
  ) => {
    return api.post(`/git/pull-requests/${prId}/reviews`, dto);
  },

  // Git Tool APIs
  checkGitTool: () => {
    return api.get<GitToolStatusData>('/git/tool/check');
  },

  setGitPath: (gitPath: string) => {
    return api.post('/git/tool/path', { gitPath });
  },

  // Workspace APIs
  getWorkspace: (projectId: string) => {
    return api.get<Workspace>(`/git/projects/${projectId}/workspace`);
  },

  setWorkspace: (
    projectId: string,
    dto: {
      localPath?: string;
      remoteUrl?: string;
      autoClone?: boolean;
    },
  ) => {
    return api.put(`/git/projects/${projectId}/workspace`, dto);
  },

  validateWorkspace: (projectId: string) => {
    return api.post<WorkspaceValidationResult>(`/git/projects/${projectId}/workspace/validate`, );
  },

  cloneRepository: (
    projectId: string,
    dto: { remoteUrl: string; localPath: string },) => {
    return api.post(`/git/projects/${projectId}/workspace/clone`, dto,);
  },

  // Git Command APIs
  executeCommand: (
    repoId: string,
    dto: {
      command: string;
      args?: string[];
      options?: { timeout?: number; allowDangerous?: boolean };
    },
  ) => {
    return api.post<GitCommandResult>(`/git/repos/${repoId}/commands/execute`, dto,);
  },

  getCommandHistory: (repoId: string, limit?: number) => {
    return api.get<GitCommandRecord[]>(`/git/repos/${repoId}/commands/history`, {
      params: limit ? { limit } : undefined,
    });
  },

  // Branch APIs
  getBranches: (repoId: string, includeRemote?: boolean) => {
    return api.get<BranchListResult>(`/git/repos/${repoId}/branches`, {
      params: includeRemote ? { includeRemote: true } : undefined,
    });
  },

  createBranch: (
    repoId: string,
    dto: { name: string; from?: string; checkout?: boolean },
  ) => {
    return api.post(`/git/repos/${repoId}/branches`, dto);
  },

  deleteBranch: (repoId: string, branchName: string, force?: boolean) => {
    return api.delete(`/git/repos/${repoId}/branches/${branchName}`, {
      params: force ? { force: true } : undefined,
    });
  },

  checkoutBranch: (
    repoId: string,
    branchName: string,
    dto?: { create?: boolean; from?: string },
  ) => {
    return api.post(`/git/repos/${repoId}/branches/${branchName}/checkout`, dto,);
  },
};

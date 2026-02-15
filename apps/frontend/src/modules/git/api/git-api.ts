import { apiClient } from '../../../infrastructure/api-client';

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

export const gitApi = {
  getRepositories: (params?: { projectId?: string; provider?: string }) => {
    return apiClient.get<Repository[]>('/_api/git/repos', { params });
  },

  createRepository: (dto: CreateRepositoryDto) => {
    return apiClient.post<Repository>('/_api/git/repos', dto);
  },

  getRepositoryById: (repoId: string) => {
    return apiClient.get<Repository>(`/_api/git/repos/${repoId}`);
  },

  getRepositoryStatus: (repoId: string) => {
    return apiClient.get<RepositoryStatus>(`/_api/git/repos/${repoId}/status`);
  },

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
    return apiClient.get<{
      data: Commit[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/_api/git/repos/${repoId}/commits`, { params });
  },

  getCommitById: (commitId: string) => {
    return apiClient.get<Commit>(`/_api/git/commits/${commitId}`);
  },

  generateDiff: (dto: {
    repoId: string;
    baseRef: string;
    targetRef: string;
    pathFilter?: string[];
  }) => {
    return apiClient.post<DiffResult>('/_api/git/diff', dto);
  },

  getPullRequests: (
    repoId: string,
    params?: { status?: string; author?: string },
  ) => {
    return apiClient.get<PullRequest[]>(
      `/_api/git/repos/${repoId}/pull-requests`,
      { params },
    );
  },

  getPullRequestById: (prId: string) => {
    return apiClient.get<PullRequest>(`/_api/git/pull-requests/${prId}`);
  },

  createPullRequestReview: (
    prId: string,
    dto: {
      type: string;
      state: string;
      summary?: string;
      comments?: any[];
    },
  ) => {
    return apiClient.post(
      `/_api/git/pull-requests/${prId}/reviews`,
      dto,
    );
  },
};

// Explicit re-export for type-only imports
export type { CreateRepositoryDto };

// #region agent log
if (typeof window !== 'undefined') {
  const checkExports = () => {
    try {
      const moduleExports: any = {};
      // Check if CreateRepositoryDto exists as a value (it shouldn't)
      const hasCreateRepositoryDtoValue = typeof (globalThis as any).CreateRepositoryDto !== 'undefined';
      const hasGitApiValue = typeof gitApi !== 'undefined';
      const gitApiKeys = gitApi ? Object.keys(gitApi) : [];
      fetch('http://127.0.0.1:7242/ingest/359cd667-d83e-4a1f-b9bd-24efc6dd110b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'git-api.ts:170',message:'Module loaded - checking exports',data:{hasCreateRepositoryDtoValue,hasGitApiValue,gitApiKeys,interfaceDefined:true,typeReExportExists:true},timestamp:Date.now(),runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    } catch (e) {
      fetch('http://127.0.0.1:7242/ingest/359cd667-d83e-4a1f-b9bd-24efc6dd110b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'git-api.ts:170',message:'Module load check error',data:{error:String(e)},timestamp:Date.now(),runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    }
  };
  checkExports();
}
// #endregion
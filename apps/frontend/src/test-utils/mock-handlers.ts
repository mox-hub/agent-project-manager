import { http, HttpResponse } from 'msw';

function ok<T>(data: T) {
  return HttpResponse.json({
    status: 200,
    success: true,
    description: '操作成功',
    data,
    timestamp: new Date().toISOString(),
    requestId: 'req-mock',
  });
}

function paginated<T>(items: T[], page = 1, pageSize = 20, total?: number) {
  return ok({
    items,
    total: total ?? items.length,
    page,
    pageSize,
  });
}

function bad(status: number, code: string, message: string) {
  return HttpResponse.json(
    {
      status,
      success: false,
      description: message,
      data: null,
      error: { code, message },
      timestamp: new Date().toISOString(),
      requestId: 'req-mock',
    },
    { status },
  );
}

/**
 * Auth API MSW 处理程序
 */
export const authHandlers = [
  // 登录
  http.post('/_api/auth/login', () => {
    return ok({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
      },
    });
  }),

  // 登出
  http.post('/_api/auth/logout', () => {
    return ok({ message: 'Logged out successfully' });
  }),

  // 获取当前用户
  http.get('/_api/auth/me', () => {
    return ok({
      id: '1',
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
    });
  }),

  // 获取 OAuth2 提供商
  http.get('/_api/auth/oauth2/providers', () => {
    return ok([
      { id: 'github', name: 'GitHub', icon: 'github' },
      { id: 'gitlab', name: 'GitLab', icon: 'gitlab' },
    ]);
  }),
];

/**
 * Project API MSW 处理程序
 */
export const projectHandlers = [
  // 获取项目列表
  http.get('/_api/projects', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 20;

    return paginated(
      [
        {
          id: '1',
          name: 'Test Project 1',
          description: 'A test project',
          type: 'personal',
          visibility: 'private',
          status: 'active',
          healthScore: 85,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Test Project 2',
          description: 'Another test project',
          type: 'team',
          visibility: 'internal',
          status: 'active',
          healthScore: 92,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      page,
      pageSize,
      2,
    );
  }),

  // 获取项目详情
  http.get('/_api/projects/:id', ({ params }) => {
    return ok({
      id: params.id,
      name: 'Test Project',
      description: 'A test project',
      type: 'personal',
      visibility: 'private',
      status: 'active',
      healthScore: 85,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  // 创建项目
  http.post('/_api/projects', async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      type?: string;
      visibility?: string;
    };
    return ok({
      id: 'new-project-id',
      name: body.name ?? '',
      description: body.description ?? '',
      type: body.type ?? 'web',
      visibility: body.visibility ?? 'private',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // 更新项目
  http.patch('/_api/projects/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      id: params.id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // 获取外部链接
  http.get('/_api/projects/:projectId/external-links', () => {
    return ok([]);
  }),

  // 添加外部链接
  http.post('/_api/projects/:projectId/external-links', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      id: 'new-link-id',
      ...body,
      syncStatus: 'active' as const,
      createdAt: new Date().toISOString(),
    });
  }),

  // 获取文档链接
  http.get('/_api/projects/:projectId/doc-links', () => {
    return ok([]);
  }),

  // 添加文档链接
  http.post('/_api/projects/:projectId/doc-links', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      id: 'new-doc-link-id',
      ...body,
      aiIndexed: false,
      createdAt: new Date().toISOString(),
    });
  }),

  // 获取 API 文档链接
  http.get('/_api/projects/:projectId/api-doc-links', () => {
    return ok([]);
  }),

  // 添加 API 文档链接
  http.post('/_api/projects/:projectId/api-doc-links', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      id: 'new-api-doc-link-id',
      ...body,
      aiIndexed: false,
      createdAt: new Date().toISOString(),
    });
  }),

  // 获取健康快照
  http.get('/_api/projects/:projectId/health-snapshots', () => {
    return ok([
      {
        id: '1',
        date: '2024-01-01T00:00:00Z',
        healthScore: 85,
        breakdown: {
          iterationCompletionRate: 90,
          overdueTaskRatio: 5,
          ciSuccessRate: 95,
          commitActivity: 80,
          blockedTaskRatio: 2,
        },
      },
    ]);
  }),

  // 获取 AI 上下文
  http.get('/_api/projects/:projectId/ai-context', ({ params }) => {
    return ok({
      id: params.projectId,
      techStack: ['React', 'TypeScript'],
      languages: ['TypeScript', 'JavaScript'],
      frameworks: ['React', 'Vite'],
      domainTags: ['web', 'frontend'],
      teamSizeCategory: 'small',
      lifecyclePhase: 'development',
      complexityLevel: 'medium',
      riskIndicators: {
        overdueTaskRatio: 5,
        blockedTaskCount: 1,
        velocityTrend: 'stable',
        ciFailureRate: 5,
      },
      healthScore: 85,
      autoSummary: 'Project is in good health with stable velocity.',
      lastComputedAt: new Date().toISOString(),
    });
  }),

  // 刷新 AI 上下文
  http.post('/_api/projects/:projectId/ai-context/refresh', ({ params }) => {
    return ok({
      id: params.projectId,
      techStack: ['React', 'TypeScript'],
      languages: ['TypeScript'],
      frameworks: ['React'],
      domainTags: ['web'],
      teamSizeCategory: 'small',
      lifecyclePhase: 'development',
      complexityLevel: 'medium',
      riskIndicators: {
        overdueTaskRatio: 0,
        blockedTaskCount: 0,
        velocityTrend: 'stable',
        ciFailureRate: 0,
      },
      healthScore: 90,
      autoSummary: 'AI context refreshed successfully.',
      lastComputedAt: new Date().toISOString(),
    });
  }),
];

/**
 * Git API MSW 处理程序
 */
export const gitHandlers = [
  // 获取仓库列表
  http.get('/_api/git/repos', () => {
    return ok([
      {
        id: 'repo-1',
        projectId: 'p1',
        name: 'Core API',
        provider: 'github',
        localPath: 'E:/core-api',
        remoteUrl: 'git@github.com:team/core-api.git',
        defaultBranch: 'main',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-21T00:00:00Z',
      },
      {
        id: 'repo-2',
        projectId: 'p1',
        name: 'Mirror Service',
        provider: 'gitlab',
        localPath: 'E:/mirror-service',
        remoteUrl: 'git@gitlab.com:team/mirror-service.git',
        defaultBranch: 'develop',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-21T00:00:00Z',
      },
    ]);
  }),

  // 获取仓库详情
  http.get('/_api/git/repos/:repoId', ({ params }) => {
    return ok({
      id: params.repoId,
      projectId: 'p1',
      name: `Repository ${params.repoId}`,
      provider: 'github',
      localPath: 'E:/test-repo',
      remoteUrl: 'git@github.com:team/test-repo.git',
      defaultBranch: 'main',
      createdAt: '2026-03-20T00:00:00Z',
      updatedAt: '2026-03-21T00:00:00Z',
    });
  }),

  // 获取仓库状态
  http.get('/_api/git/repos/:repoId/status', () => {
    return ok({
      clean: true,
      ahead: 0,
      behind: 0,
      changedFiles: [],
      currentBranch: 'main',
    });
  }),

  // 获取分支列表
  http.get('/_api/git/repos/:repoId/branches', () => {
    return ok({
      local: [
        { name: 'main', current: true, tracking: 'origin/main' },
        { name: 'feature/test', current: false, tracking: null },
      ],
      remote: [{ name: 'main', remote: 'origin', fullName: 'origin/main' }],
      current: 'main',
    });
  }),

  // 获取提交列表
  http.get('/_api/git/repos/:repoId/commits', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 20;
    return paginated(
      [
        {
          id: 'commit-1',
          repoId: 'repo-1',
          hash: 'abc123def456',
          authorName: 'Test User',
          authorEmail: 'test@example.com',
          authorDate: '2026-03-20T00:00:00Z',
          message: 'Initial commit',
          files: [],
        },
      ],
      page,
      pageSize,
      1,
    );
  }),

  // 获取提交详情
  http.get('/_api/git/commits/:commitId', ({ params }) => {
    return ok({
      id: params.commitId,
      repoId: 'repo-1',
      hash: 'abc123def456',
      authorName: 'Test User',
      authorEmail: 'test@example.com',
      authorDate: '2026-03-20T00:00:00Z',
      message: 'Test commit',
      files: [
        {
          id: 'file-1',
          commitId: params.commitId as string,
          path: 'src/index.ts',
          status: 'modified',
          additions: 5,
          deletions: 2,
        },
      ],
    });
  }),

  // Git 工具检测
  http.get('/_api/git/tool/check', () => {
    return ok({
      available: true,
      version: 'git version 2.40.0',
      path: '/usr/bin/git',
      config: {
        'user.name': 'Test User',
        'user.email': 'test@example.com',
      },
    });
  }),

  // 工作区
  http.get('/_api/git/projects/:projectId/workspace', () => {
    return ok({
      id: 'ws-1',
      projectId: 'p1',
      localPath: 'E:/workspace',
      remoteUrl: 'git@github.com:team/project.git',
      autoClone: false,
      validatedAt: '2026-03-20T00:00:00Z',
      validationStatus: 'valid',
    });
  }),
];

/**
 * Task API MSW 处理程序
 */
export const taskHandlers = [
  // 获取项目任务
  http.get('/_api/projects/:projectId/tasks', () => {
    return paginated(
      [
        {
          id: '1',
          title: 'Test Task 1',
          status: 'todo',
          priority: 'high',
          projectId: '1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Test Task 2',
          status: 'in_progress',
          priority: 'medium',
          projectId: '1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      1,
      20,
      2,
    );
  }),

  // 获取任务详情
  http.get('/_api/tasks/:taskId', ({ params }) => {
    return ok({
      id: params.taskId,
      title: 'Test Task',
      description: 'A test task',
      status: 'todo',
      priority: 'high',
      projectId: '1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  // 获取任务活动
  http.get('/_api/tasks/:taskId/activities', () => {
    return ok([]);
  }),

  // 创建任务
  http.post('/_api/tasks', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      id: 'new-task-id',
      ...body,
      status: 'todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // 更新任务
  http.patch('/_api/tasks/:taskId', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      id: params.taskId,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // 删除任务
  http.delete('/_api/tasks/:taskId', () => {
    return ok(null);
  }),

  // 添加任务依赖
  http.post('/_api/tasks/:taskId/dependencies', async ({ request }) => {
    const body = (await request.json()) as { taskId?: string; dependsOnTaskId?: string };
    return ok({
      id: 'new-dependency-id',
      taskId: body.taskId ?? '',
      dependsOnTaskId: body.dependsOnTaskId ?? '',
      createdAt: new Date().toISOString(),
    });
  }),

  // 删除任务依赖
  http.delete('/_api/tasks/:taskId/dependencies/:dependencyId', () => {
    return ok(null);
  }),
];

/**
 * 配置所有 MSW 处理程序
 */
export const allHandlers = [
  ...authHandlers,
  ...projectHandlers,
  ...taskHandlers,
  ...gitHandlers,
];

/**
 * 获取未处理的请求处理器
 * 用于测试 404 错误
 */
export const unhandledRequestHandler = () => bad(404, 'NOT_FOUND', 'Not found');

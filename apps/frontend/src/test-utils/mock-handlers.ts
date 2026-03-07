import { http, HttpResponse } from 'msw';

/**
 * Auth API MSW 处理程序
 */
export const authHandlers = [
  // 登录
  http.post('/_api/auth/login', () => {
    return HttpResponse.json({
      data: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '1',
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
        },
      },
    });
  }),

  // 登出
  http.post('/_api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // 获取当前用户
  http.get('/_api/auth/me', () => {
    return HttpResponse.json({
      data: {
        id: '1',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
      },
    });
  }),

  // 获取 OAuth2 提供商
  http.get('/_api/auth/oauth2/providers', () => {
    return HttpResponse.json({
      data: [
        { id: 'github', name: 'GitHub', icon: 'github' },
        { id: 'gitlab', name: 'GitLab', icon: 'gitlab' },
      ],
    });
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

    return HttpResponse.json({
      data: [
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
      meta: {
        page,
        pageSize,
        total: 2,
        totalPages: 1,
      },
    });
  }),

  // 获取项目详情
  http.get('/_api/projects/:id', ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.id,
        name: 'Test Project',
        description: 'A test project',
        type: 'personal',
        visibility: 'private',
        status: 'active',
        healthScore: 85,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });
  }),

  // 创建项目
  http.post('/_api/projects', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: 'new-project-id',
        name: body.name,
        description: body.description,
        type: body.type,
        visibility: body.visibility,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // 更新项目
  http.patch('/_api/projects/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: params.id,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // 获取外部链接
  http.get('/_api/projects/:projectId/external-links', () => {
    return HttpResponse.json({
      data: [],
    });
  }),

  // 添加外部链接
  http.post('/_api/projects/:projectId/external-links', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: 'new-link-id',
        ...body,
        syncStatus: 'active' as const,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  // 获取文档链接
  http.get('/_api/projects/:projectId/doc-links', () => {
    return HttpResponse.json({
      data: [],
    });
  }),

  // 添加文档链接
  http.post('/_api/projects/:projectId/doc-links', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: 'new-doc-link-id',
        ...body,
        aiIndexed: false,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  // 获取 API 文档链接
  http.get('/_api/projects/:projectId/api-doc-links', () => {
    return HttpResponse.json({
      data: [],
    });
  }),

  // 添加 API 文档链接
  http.post('/_api/projects/:projectId/api-doc-links', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: 'new-api-doc-link-id',
        ...body,
        aiIndexed: false,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  // 获取健康快照
  http.get('/_api/projects/:projectId/health-snapshots', () => {
    return HttpResponse.json({
      data: [
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
      ],
    });
  }),

  // 获取 AI 上下文
  http.get('/_api/projects/:projectId/ai-context', ({ params }) => {
    return HttpResponse.json({
      data: {
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
      },
    });
  }),

  // 刷新 AI 上下文
  http.post('/_api/projects/:projectId/ai-context/refresh', ({ params }) => {
    return HttpResponse.json({
      data: {
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
      },
    });
  }),
];

/**
 * Task API MSW 处理程序
 */
export const taskHandlers = [
  // 获取项目任务
  http.get('/_api/projects/:projectId/tasks', () => {
    return HttpResponse.json({
      data: [
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
      meta: {
        total: 2,
      },
    });
  }),

  // 获取任务详情
  http.get('/_api/tasks/:taskId', ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.taskId,
        title: 'Test Task',
        description: 'A test task',
        status: 'todo',
        priority: 'high',
        projectId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });
  }),

  // 获取任务活动
  http.get('/_api/tasks/:taskId/activities', () => {
    return HttpResponse.json({
      data: [],
    });
  }),

  // 创建任务
  http.post('/_api/tasks', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: 'new-task-id',
        ...body,
        status: 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // 更新任务
  http.patch('/_api/tasks/:taskId', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: params.taskId,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // 删除任务
  http.delete('/_api/tasks/:taskId', () => {
    return HttpResponse.json({ message: 'Task deleted' });
  }),

  // 添加任务依赖
  http.post('/_api/tasks/:taskId/dependencies', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: 'new-dependency-id',
        taskId: body.taskId,
        dependsOnTaskId: body.dependsOnTaskId,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  // 删除任务依赖
  http.delete('/_api/tasks/:taskId/dependencies/:dependencyId', () => {
    return HttpResponse.json({ message: 'Dependency removed' });
  }),
];

/**
 * 配置所有 MSW 处理程序
 */
export const allHandlers = [
  ...authHandlers,
  ...projectHandlers,
  ...taskHandlers,
];

/**
 * 获取未处理的请求处理器
 * 用于测试 404 错误
 */
export const unhandledRequestHandler = () => {
  return HttpResponse.json(
    { error: { code: 'NOT_FOUND', message: 'Not found' } },
    { status: 404 },
  );
};

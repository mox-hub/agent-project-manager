import { api } from '@/infrastructure/api-client';

export interface CreateProjectData {
  name: string;
  description?: string;
  type?: 'team' | 'personal' | 'enterprise';
  visibility?: 'public' | 'internal' | 'private';
}

export interface OnboardingData {
  projectId?: string;
  repositoryId?: string;
  aiConfigId?: string;
  stepsCompleted: string[];
}

/** GET /environment 单项工具状态（镜像 server EnvironmentToolDto，key 见 ENVIRONMENT_TOOL_KEYS） */
export interface EnvironmentToolInfo {
  key: string;
  installed: boolean;
  version?: string | null;
  error?: string | null;
}

/** GET /environment 响应（镜像 server EnvironmentReportDto） */
export interface EnvironmentReport {
  tools: EnvironmentToolInfo[];
  /** 可一键代装的工具键（npm 白名单，CAP-A-30） */
  installableTools: string[];
  checkedAt: string;
}

/** POST /environment/install 作业（镜像 server EnvironmentInstallJobDto） */
export interface EnvironmentInstallJob {
  jobId: string;
  tool: string;
  package: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  finishedAt?: string | null;
  exitCode?: number | null;
  error?: string | null;
  log: string;
}

/**
 * 向导 API 层——只打真实契约端点（openapi.json 已登记的路径）。
 *
 * 历史教训（2026-09-12 实机暴露）：本文件曾指向 /onboarding/* 五个服务端
 * 从未实现的端点（openapi 无登记，恒 404）——向导各步只能靠「跳过」通过，
 * 「进入 Ordo」调 finish 静默失败且无 onError，按钮点了没反应。
 * 向导完成标记是前端/壳侧状态（zustand persist + desktop-state.json 镜像），
 * 不依赖服务端；「连接仓库」「配置 AI」无干净的单一契约端点，改为引导页。
 */
export const onboardingApi = {
  createProject: (data: CreateProjectData) =>
    api.post<{ id: string; name: string }>('/projects', {
      name: data.name,
      description: data.description,
      type: data.type ?? 'team',
      visibility: data.visibility ?? 'internal',
    }),
  /** 本地基础环境检测（node/git/AI CLI）——引导「环境检查」步骤消费 */
  getEnvironment: () => api.get<EnvironmentReport>('/environment'),
  /** 按需安装 AI CLI（npm 白名单，CAP-A-30）——非白名单/安装器缺失/重复发起会 4xx */
  installEnvironmentTool: (tool: string) =>
    api.post<EnvironmentInstallJob>('/environment/install', { tool }),
  /** 安装作业状态轮询 */
  getEnvironmentInstallJob: (jobId: string) =>
    api.get<EnvironmentInstallJob>(`/environment/install/${jobId}`),
};

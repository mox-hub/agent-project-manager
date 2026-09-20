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

/**
 * 向导 API 层——只打真实契约端点（openapi.json 已登记的路径）。
 *
 * 历史教训（2026-09-12 实机暴露）：本文件曾指向 /onboarding/* 五个服务端
 * 从未实现的端点（openapi 无登记，恒 404）——向导各步只能靠「跳过」通过，
 * 「进入 APM」调 finish 静默失败且无 onError，按钮点了没反应。
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
};

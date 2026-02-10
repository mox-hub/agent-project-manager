## 前端整体方案设计（Frontend Architecture & Implementation Plan）

本文件基于 `architecture-design.md`、`docs/api/*` 与 `docs/feature-design/*`，给出一套**可直接落地实现**的前端方案，包括：

- 工程目录结构与模块拆分
- 路由与信息架构
- 核心技术选型与基础设施封装
- 典型模块（Project / AIHub / Integration 等）的前端设计
- 可复用的前端技术设计文档模板

---

## 1. 前端工程目录结构蓝图

推荐在整体 Monorepo 结构下，将前端放在 `apps/frontend`，内部采用领域化 + 分层的目录设计：

```text
apps/
  frontend/
    src/
      app/
        main.tsx              # 应用入口（挂载 React、注入 Router/QueryClient）
        router.tsx            # 顶层路由定义
        providers/            # 全局 Provider（Query, Theme, Auth, EventBus）
      modules/
        auth/                 # 认证与当前用户
          api/                # /_api/auth/* 封装
          components/
          hooks/
          pages/
        project/              # 项目/迭代/里程碑/任务
          api/                # project / task REST API 封装
          components/         # 看板、任务卡片、任务详情侧栏等
          hooks/              # useProjectList/useTaskList/useTaskDetail 等
          pages/              # ProjectListPage/ProjectDashboardPage/TaskBoardPage
        ai-hub/               # AI 对话/工作流
          api/                # /_api/ai/*
          components/         # Chat 面板、对话列表、workflow 运行状态组件
          hooks/              # useChat/useConversations/useWorkflows 等
          pages/              # AiSpacePage/WorkflowListPage/WorkflowRunDetailPage
        integration/          # 外部集成（Git/Jira/CI/IM/存储）
          api/
          components/
          hooks/
          pages/
        core-config/          # AppConfig 等核心配置管理
        notification/         # 通知与偏好
        plugin/               # 插件管理与前端扩展点
      shared/
        components/           # 通用 UI 组件（布局、表单、表格、Modal、Drawer 等）
        hooks/                # 通用 hooks（usePagination/useDebounce/useHotkey 等）
        layout/               # ShellLayout/SideNav/TopBar/StatusBar 等
        types/                # 共享 TS 类型（与后端 shared 包对齐）
        utils/                # 工具函数（时间、格式化、路由工具等）
      infrastructure/
        api-client/           # Axios/fetch 封装，处理 baseURL/鉴权/错误
        event-client/         # WebSocket 封装（订阅 ai.stream 等）
        store/                # 全局状态（Zustand/Redux）定义
        config/               # 前端运行时配置（API_BASE_URL、feature flags）
      styles/
        globals.css
        theme.css
      index.html
    vite.config.ts
    tsconfig.json
```

### 1.1 模块分层说明

- **modules/**：按领域模块（Project/AIHub/Integration/Auth 等）组织，内部再按 `api/components/hooks/pages` 分层，保证高内聚、低耦合。
- **shared/**：跨模块复用的 UI 与逻辑，避免模块间互相引用导致循环依赖。
- **infrastructure/**：与具体技术栈绑定的基础设施能力（HTTP/WebSocket/全局状态/配置）。
- **app/**：前端应用的「组合层」，负责挂载 Router、Provider 与顶层布局。

---

## 2. 技术栈与基础设施实现约定

### 2.1 基础技术选型

- 框架：React + TypeScript
- 构建工具：Vite
- 路由：React Router
- 数据请求与缓存：TanStack Query（React Query）
- 全局状态管理：Zustand（或 Redux Toolkit，如果更偏向传统架构）
- UI：Ant Design / Mantine / MUI（三选一）+ UnoCSS/TailwindCSS 用于高定制区域
- 终端与代码：xterm.js + Monaco Editor（后续与 Terminal/Git/AI 联动）

### 2.2 HTTP Client 封装（api-client）

目标：隐藏 `/_api` 前缀、鉴权头、错误格式与分页结构，使模块代码尽量「只感知业务数据」。

关键点：

- 自动附加 `Authorization: Bearer <token>` 或携带 Cookie Session。
- 统一解析成功响应的 `data` 与 `meta` 字段。
- 统一处理错误响应的 `error.code` / `error.message`。

### 2.3 WebSocket Event Client（event-client）

目标：统一接入服务器的实时事件（`ai.stream`、`ai.workflow.update` 等），前端暴露简单的订阅接口。

关键点：

- 封装连接管理（自动重连、心跳）。
- 基于事件类型分发到订阅者。
- 与 React 通过 Context + Hook 对接（如 `useServerEvent`、`useAiStream`）。

---

## 3. 路由与信息架构实现

### 3.1 顶层路由结构

在 `app/router.tsx` 中定义路由，建议结构：

```tsx
// 伪代码示例
const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/app",
    element: (
      <AuthGuard>
        <ShellLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <ProjectListPage /> },
      {
        path: "projects",
        children: [
          { index: true, element: <ProjectListPage /> },
          {
            path: ":projectId",
            element: <ProjectLayout />,
            children: [
              { index: true, element: <ProjectDashboardPage /> },
              { path: "tasks", element: <TaskBoardPage /> },
              { path: "iterations", element: <IterationListPage /> },
              { path: "ai", element: <ProjectAiSpacePage /> },
              { path: "integrations", element: <ProjectIntegrationPage /> },
              { path: "settings", element: <ProjectSettingsPage /> },
            ],
          },
        ],
      },
      {
        path: "ai",
        children: [
          { index: true, element: <AiSpacePage /> },
          { path: "conversations/:id", element: <ConversationDetailPage /> },
          { path: "workflows", element: <WorkflowListPage /> },
          { path: "workflow-runs/:id", element: <WorkflowRunDetailPage /> },
        ],
      },
      { path: "integrations", element: <GlobalIntegrationPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
```

### 3.2 Shell 布局

- `ShellLayout` 负责整体布局：侧边栏（项目/AI/工作流/插件/集成/设置）、顶部导航（面包屑、搜索、用户菜单）、可选右侧浮动 AI 面板与底部状态栏。
- 子页面只关心「主内容区域」，通过 React Router 的嵌套渲染。

---

## 4. 典型模块前端设计

本节用 Project 与 AIHub 两个核心模块举例说明前端实现方式。

### 4.1 Project 模块

#### 4.1.1 API 封装（modules/project/api）

映射 `docs/api/api-project.md` 中的接口，例如：

- `GET /_api/projects`
- `POST /_api/projects`
- `GET /_api/projects/{projectId}`
- `GET /_api/projects/{projectId}/tasks`
- `POST /_api/projects/{projectId}/tasks`
- `GET /_api/tasks/{taskId}/activities`

利用 React Query 构建 Hook：

- `useProjectList(filters)`：查询参数与分页参数映射到 URL Query。
- `useProjectDetail(projectId)`。
- `useTaskList(projectId, filters)`。
- `useTaskDetail(taskId)`。
- `useTaskActivities(taskId)`。

#### 4.1.2 页面与组件（modules/project/pages & components）

- `ProjectListPage`
  - 头部：搜索框（q）、过滤条件（status/type）、创建项目按钮。
  - 主区域：项目卡片/表格（名称、描述、类型、状态、更新时间）。
- `ProjectDashboardPage`
  - 使用 `useProjectDetail` + 统计接口渲染：
    - 项目总览卡片。
    - 迭代进度组件（燃尽图）。
    - 里程碑时间轴。
    - 「AI 洞察」面板（调用 AIHub 工作流或 chat 接口）。
- `TaskBoardPage`
  - 过滤栏：状态、Assignee、Iteration、标签、关键字。
  - 主区域：看板视图 + 列表视图切换。
  - 任务卡片（TaskCard）：
    - 点击打开 `TaskDetailDrawer`（侧边抽屉）。
- `TaskDetailDrawer`
  - Tab1：基本信息（编辑表单）。
  - Tab2：依赖关系（新增/删除依赖）。
  - Tab3：活动记录（调用 `useTaskActivities`）。
  - Tab4：AI 助手（嵌入 AI chat，见下一小节）。

### 4.2 AIHub 模块

#### 4.2.1 API 与 Hook（modules/ai-hub/api & hooks）

映射 `docs/api/api-ai-hub.md`：

- `POST /_api/ai/chat`
- `GET /_api/ai/conversations`
- `GET /_api/ai/conversations/{id}`
- `GET /_api/ai/workflows`
- `POST /_api/ai/workflows/{id}/run`
- `GET /_api/ai/workflow-runs`
- `GET /_api/ai/workflow-runs/{id}`
- `GET /_api/ai/models`
- `GET /_api/ai/usage`

前端 Hook 设计：

- `useAiChat()`：封装一次性 chat 调用与流式事件绑定。
- `useConversations(filters)` / `useConversationDetail(id)`。
- `useWorkflows()` / `useWorkflowRuns(filters)` / `useWorkflowRunDetail(id)`。
- `useAiModels()` / `useAiUsage(filters)`。

#### 4.2.2 Chat 与 Workflow UI

- `AiChatPanel`
  - 输入区：支持多行输入 + 快捷按钮（预设 prompt，如「分析任务风险」等）。
  - 消息区：基于会话消息数组渲染 role/content，标记 modelName。
  - 流式输出：订阅 `ai.stream` 事件，按 `conversationId` 追加 token。
- `AiSpacePage`
  - 左侧：会话列表（搜索 + 筛选 projectId/taskId）。
  - 中间：选中会话的聊天区域（`AiChatPanel`）。
  - 右侧：上下文面板（当前项目/任务信息摘要 + 相关工作流运行列表）。
- `WorkflowListPage` / `WorkflowRunDetailPage`
  - 列表：工作流基本信息（id/key/name/description/version）。
  - 运行详情：展示步骤执行轨迹 + 实时状态（订阅 `ai.workflow.update`）。

---

## 5. 鉴权与会话管理（Auth 模块）

- 登录页：
  - 调用 `GET /_api/auth/oauth2/providers` 渲染 Provider 列表。
  - 选择某 Provider 时跳转 `/_api/auth/oauth2/authorize?provider=prov_xxx`。
- 回调流程：
  - 后端处理 `/auth/oauth2/callback` 并重定向到 `/app`。
  - 前端在 `/app` 顶层通过 `useEffect` 调用 `/auth/me` 填充当前用户。
- 登出：
  - 调用 `POST /_api/auth/oauth2/logout`，清理本地状态后跳转 `/login`。
- `AuthGuard` 组件：
  - 若用户未登录（无用户信息或请求 `/auth/me` 失败），跳转 `/login`。

---

## 6. 前端技术设计文档模板

以下模板可用于为每个前端模块（如 Project、AIHub、Integration 等）撰写单独的技术设计文档。建议存放在 `docs/feature-design/` 或 `docs/frontend/` 子目录中。

### 6.1 文档结构模板

```md
## 模块名称（例如：Project 前端模块设计）

### 1. 背景与目标

- 简要描述模块对应的后端领域（链接到 docs/api 与 docs/data-model）。
- 说明本模块在前端中的职责与边界。

### 2. 业务场景与核心页面

- 列出本模块负责的页面与场景：
  - 页面1：功能说明、入口路径（如 `/app/projects`）。
  - 页面2：功能说明、入口路径（如 `/app/projects/:projectId/tasks`）。
- 简要交互流程说明（可附简单流程图/时序图）。

### 3. 路由与导航设计

- 路由路径清单。
- 与上层 Shell 的嵌套关系（父路由、布局组件）。

### 4. 状态管理设计

- 使用到的 React Query QueryKey 列表与对应接口：
  - `['projects', filters]` → `GET /_api/projects`
  - ...
- 使用到的全局/局部状态（Zustand/Redux）：
  - 当前选中项目/任务 ID。
  - 视图模式（看板/列表）。

### 5. API 封装与 Hook 设计

- API 列表：对应后端接口 + 请求/响应结构简述。
- 前端 Hook：
  - `useProjectList(filters)`：说明参数/返回值/缓存策略。
  - `useTaskList(projectId, filters)`：说明分页、过滤、乐观更新策略。

### 6. 组件设计

- 组件树结构：
  - `ProjectListPage`
    - `ProjectFilterBar`
    - `ProjectTable`
  - `TaskBoardPage`
    - `TaskFilterBar`
    - `TaskKanban`
    - `TaskDetailDrawer`
- 关键组件的 Props 定义与可复用性说明。

### 7. 交互与 UX 细节

- 重要交互行为：
  - 创建/更新/删除时的反馈（Toast/Notification）。
  - 长耗时操作的加载状态与禁用逻辑。
  - 错误提示与重试策略。

### 8. 与其他模块的依赖关系

- 本模块依赖的前端模块（如 Auth、Notification、Integration 等）。
- 跨模块通信方式（例如事件、共享状态或路由跳转）。

### 9. 非功能需求

- 性能要求（如最大列表条数、分页大小）。
- 可访问性要求（键盘操作、屏幕阅读器支持）。
- 国际化/多语言考虑（如采用 i18n 方案）。

### 10. 迭代与扩展规划

- 未来计划的子功能/增强点（例如：增加图表可视化、AI 提示增强等）。
- 兼容性或迁移规划（如计划从 Electron 迁移到 Tauri）。
```

---

## 7. 核心基础设施实现示例

### 7.1 API Client 实现（infrastructure/api-client）

```typescript
// infrastructure/api-client/index.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { message } from 'antd'; // 或使用其他 UI 库的 Toast

// 统一响应格式（对应 docs/api/README.md）
interface ApiResponse<T = any> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/_api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动附加鉴权
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // 或使用 Cookie Session（由后端设置）
  return config;
});

// 响应拦截器：统一处理错误与数据提取
apiClient.interceptors.response.use(
  (response) => {
    // 直接返回 data 字段，让业务代码更简洁
    return response.data;
  },
  (error: AxiosError<ApiError>) => {
    const apiError = error.response?.data?.error;
    if (apiError) {
      // 统一错误提示
      message.error(apiError.message || '请求失败');
      // 可扩展：根据 error.code 做特殊处理（如 401 跳转登录）
      if (apiError.code === 'UNAUTHORIZED' || error.response?.status === 401) {
        window.location.href = '/login';
      }
    } else {
      message.error('网络错误，请稍后重试');
    }
    return Promise.reject(error);
  }
);

// 导出类型安全的请求方法
export const api = {
  get: <T = any>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }),
  post: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data),
  patch: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data),
  delete: <T = any>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url),
};

export default apiClient;
```

### 7.2 Event Client 实现（infrastructure/event-client）

```typescript
// infrastructure/event-client/index.ts
import { EventEmitter } from 'events';

// 服务器事件格式（对应后端 MessageBus 事件）
interface ServerEvent<T = any> {
  type: string; // 'ai.stream', 'ai.workflow.update', 'task.updated', ...
  correlationId?: string;
  payload: T;
}

class EventClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly reconnectDelay = 3000;
  private readonly heartbeatInterval = 30000;

  connect(url: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      console.log('[EventClient] Connected');
      this.emit('connected');
      this.startHeartbeat();
      // 清除重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const serverEvent: ServerEvent = JSON.parse(event.data);
        // 分发事件到订阅者
        this.emit(serverEvent.type, serverEvent.payload, serverEvent.correlationId);
        // 也触发通用事件，方便全局监听
        this.emit('*', serverEvent);
      } catch (err) {
        console.error('[EventClient] Failed to parse event:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[EventClient] WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('[EventClient] Disconnected');
      this.emit('disconnected');
      this.stopHeartbeat();
      // 自动重连
      this.scheduleReconnect(url);
    };
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(url);
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// 单例导出
export const eventClient = new EventClient();

// React Hook：订阅服务器事件
export function useServerEvent<T = any>(
  eventType: string,
  handler: (payload: T, correlationId?: string) => void,
  deps: any[] = []
) {
  useEffect(() => {
    eventClient.on(eventType, handler);
    return () => {
      eventClient.off(eventType, handler);
    };
  }, [eventType, ...deps]);
}
```

### 7.3 全局状态管理（Zustand Store）

```typescript
// infrastructure/store/app-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AppState {
  // 当前用户
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // 当前选中的项目/任务
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  currentTaskId: string | null;
  setCurrentTaskId: (id: string | null) => void;

  // UI 状态
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  viewMode: 'kanban' | 'list'; // 任务视图模式
  setViewMode: (mode: 'kanban' | 'list') => void;

  // AI 面板状态
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      currentProjectId: null,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      currentTaskId: null,
      setCurrentTaskId: (id) => set({ currentTaskId: id }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      viewMode: 'kanban',
      setViewMode: (mode) => set({ viewMode: mode }),

      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        viewMode: state.viewMode,
        // 不持久化 currentUser，每次启动重新获取
      }),
    }
  )
);
```

### 7.4 React Query Hook 示例（Project 模块）

```typescript
// modules/project/api/project-api.ts
import { api } from '@/infrastructure/api-client';

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'personal' | 'team' | 'experiment' | 'enterprise';
  visibility: 'public' | 'internal' | 'private';
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListParams {
  q?: string;
  status?: 'active' | 'archived';
  type?: string;
  memberId?: string;
  page?: number;
  pageSize?: number;
}

export const projectApi = {
  getList: (params?: ProjectListParams) =>
    api.get<Project[]>('/projects', params),
  getDetail: (projectId: string) =>
    api.get<Project>(`/projects/${projectId}`),
  create: (data: Partial<Project>) =>
    api.post<Project>('/projects', data),
  update: (projectId: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${projectId}`, data),
  archive: (projectId: string) =>
    api.post(`/projects/${projectId}/archive`),
  restore: (projectId: string) =>
    api.post(`/projects/${projectId}/restore`),
};

// modules/project/hooks/use-project-list.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { projectApi, ProjectListParams, Project } from '../api/project-api';

export function useProjectList(
  params?: ProjectListParams,
  options?: Omit<UseQueryOptions<Project[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const response = await projectApi.getList(params);
      return response.data;
    },
    ...options,
  });
}

// modules/project/hooks/use-project-detail.ts
export function useProjectDetail(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const response = await projectApi.getDetail(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
}

// modules/project/hooks/use-project-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('项目创建成功');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error?.message || '创建失败');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Project> }) =>
      projectApi.update(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      message.success('更新成功');
    },
  });
}
```

### 7.5 AI Chat Hook 与流式输出示例

```typescript
// modules/ai-hub/hooks/use-ai-chat.ts
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import { useServerEvent } from '@/infrastructure/event-client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelName?: string;
}

interface ChatRequest {
  projectId?: string;
  taskId?: string;
  conversationId?: string;
  message: { role: 'user'; content: string };
  contextHints?: {
    includeGitDiff?: boolean;
    includeRecentActivities?: boolean;
  };
  modelPreference?: string;
}

export function useAiChat() {
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // 发送消息的 mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (request: ChatRequest) => {
      const response = await api.post<{ conversationId: string; message: ChatMessage }>(
        '/ai/chat',
        request
      );
      return response.data;
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      // 如果使用流式输出，清空临时流式内容
      setStreamingMessage('');
    },
  });

  // 订阅流式输出事件
  useServerEvent<{ conversationId: string; token: string; done: boolean }>(
    'ai.stream',
    (payload) => {
      if (payload.conversationId === currentConversationId) {
        if (payload.done) {
          setStreamingMessage('');
        } else {
          setStreamingMessage((prev) => prev + payload.token);
        }
      }
    },
    [currentConversationId]
  );

  const sendMessage = useCallback(
    (request: ChatRequest) => {
      sendMessageMutation.mutate(request);
    },
    [sendMessageMutation]
  );

  return {
    sendMessage,
    isLoading: sendMessageMutation.isPending,
    streamingMessage,
    currentConversationId,
  };
}
```

### 7.6 组件实现示例（TaskBoardPage）

```typescript
// modules/project/pages/task-board-page.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTaskList } from '../hooks/use-task-list';
import { TaskFilterBar } from '../components/task-filter-bar';
import { TaskKanban } from '../components/task-kanban';
import { TaskList } from '../components/task-list';
import { TaskDetailDrawer } from '../components/task-detail-drawer';
import { useAppStore } from '@/infrastructure/store/app-store';

export function TaskBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { viewMode, setViewMode } = useAppStore();
  const [filters, setFilters] = useState({
    status: [] as string[],
    assigneeId: undefined as string | undefined,
    iterationId: undefined as string | undefined,
    tag: [] as string[],
    q: '',
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading } = useTaskList(projectId!, filters);

  return (
    <div className="flex flex-col h-full">
      <TaskFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="flex-1 overflow-auto">
        {viewMode === 'kanban' ? (
          <TaskKanban
            tasks={tasks || []}
            onTaskClick={(task) => setSelectedTaskId(task.id)}
            isLoading={isLoading}
          />
        ) : (
          <TaskList
            tasks={tasks || []}
            onTaskClick={(task) => setSelectedTaskId(task.id)}
            isLoading={isLoading}
          />
        )}
      </div>
      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
```

---

## 8. 错误处理与加载状态最佳实践

### 8.1 统一错误边界

```typescript
// shared/components/error-boundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="页面加载出错"
          subTitle={this.state.error?.message}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
```

### 8.2 加载状态与骨架屏

```typescript
// shared/components/loading-skeleton.tsx
import { Skeleton } from 'antd';

export function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} active paragraph={{ rows: 2 }} />
      ))}
    </div>
  );
}

// 在组件中使用
export function TaskList({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
  if (isLoading) return <TaskListSkeleton />;
  if (!tasks?.length) return <Empty description="暂无任务" />;
  return <div>{/* 渲染任务列表 */}</div>;
}
```

### 8.3 乐观更新策略

```typescript
// modules/project/hooks/use-task-update.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      taskApi.update(taskId, data),
    // 乐观更新：立即更新 UI，失败时回滚
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['task', taskId] });
      const previousTask = queryClient.getQueryData<Task>(['task', taskId]);
      queryClient.setQueryData<Task>(['task', taskId], (old) => ({
        ...old!,
        ...data,
      }));
      return { previousTask };
    },
    onError: (err, variables, context) => {
      // 回滚
      if (context?.previousTask) {
        queryClient.setQueryData(['task', variables.taskId], context.previousTask);
      }
      message.error('更新失败');
    },
    onSettled: (_, __, variables) => {
      // 最终重新获取确保数据一致
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });
}
```

---

## 9. 与后端 API 的完整对接清单

### 9.1 已对接的 API 模块

基于 `docs/api/` 目录，前端需要对接的模块：

- ✅ **Project** (`api-project.md`)：项目、任务、迭代、里程碑、成员管理
- ✅ **AIHub** (`api-ai-hub.md`)：AI 对话、工作流、模型列表、使用统计
- ✅ **Auth-OAuth2** (`api-auth-oauth2.md`)：OAuth2 登录流程
- ⏳ **Git** (`api-git.md`)：仓库状态、提交、分支、PR
- ⏳ **Terminal** (`api-terminal.md`)：终端会话、命令执行
- ⏳ **Integration** (`api-integration.md`)：外部集成配置
- ⏳ **Plugin** (`api-plugin.md`)：插件管理
- ⏳ **Notification** (`api-notification.md`)：通知与偏好
- ⏳ **User-Auth** (`api-user-auth.md`)：本地用户管理
- ⏳ **Project-Metadata** (`api-project-metadata.md`)：标签、状态、角色、模板
- ⏳ **Core** (`api-core.md`)：AppConfig、审计日志

### 9.2 WebSocket 事件对接清单

- ✅ `ai.stream`：AI 对话流式输出
- ✅ `ai.workflow.update`：工作流执行状态更新
- ⏳ `task.updated`：任务状态变更（实时同步）
- ⏳ `project.updated`：项目信息变更
- ⏳ `notification.new`：新通知推送
- ⏳ `git.status.changed`：Git 状态变更（可选）

---

## 10. 后续落地建议

### 10.1 开发优先级

1. **Phase 1：核心基础设施**
   - 完成 API Client、Event Client、全局状态管理
   - 实现 Auth 模块（登录/登出/用户信息）
   - 搭建 Shell 布局与路由框架

2. **Phase 2：Project 模块**
   - 项目列表与详情页
   - 任务看板与列表视图
   - 任务详情抽屉（基本信息、依赖、活动、AI Tab）

3. **Phase 3：AIHub 模块**
   - AI 对话空间（会话列表 + 聊天界面）
   - 工作流列表与运行记录
   - 集成到任务详情中的 AI Tab

4. **Phase 4：Integration 与其他模块**
   - 集成配置页面
   - 通知中心
   - 插件管理界面

### 10.2 为每个模块创建详细设计文档

建议在 `docs/frontend/` 目录下为每个前端模块创建独立的技术设计文档，使用第 6 节的模板填充：

- `frontend-project.md`：Project 模块前端设计
- `frontend-ai-hub.md`：AIHub 模块前端设计
- `frontend-integration.md`：Integration 模块前端设计
- `frontend-auth.md`：Auth 模块前端设计

### 10.3 代码规范与工具链

- **ESLint + Prettier**：统一代码风格
- **TypeScript 严格模式**：确保类型安全
- **Husky + lint-staged**：提交前自动检查
- **Vitest**：单元测试框架（测试 Hook 与工具函数）
- **Playwright**：E2E 测试（测试关键用户流程）

---

## 11. 总结

本文档提供了前端架构的完整蓝图，包括：

1. ✅ **工程目录结构**：领域化模块划分，清晰的分层设计
2. ✅ **技术栈选型**：React + TypeScript + TanStack Query + Zustand + Ant Design
3. ✅ **路由与信息架构**：嵌套路由设计，Shell 布局方案
4. ✅ **核心基础设施**：API Client、Event Client、全局状态管理
5. ✅ **典型模块实现示例**：Project、AIHub 的 Hook 与组件示例
6. ✅ **最佳实践**：错误处理、加载状态、乐观更新
7. ✅ **对接清单**：与后端 API 的完整映射关系

在实际开发时，可以：
- 按照本文档的目录结构搭建初始脚手架
- 参考示例代码实现各个模块
- 根据实际需求调整和扩展设计
- 为每个模块补充详细的技术设计文档


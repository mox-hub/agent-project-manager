import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  timezone?: string;
}

export interface FavoritePageEntry {
  /** 收藏页面的唯一标识，默认为路由 path（如 /app/projects） */
  path: string;
  /** 收藏时解析好的页面名称，用于侧边栏收藏分区展示（动态路由页面） */
  label: string;
}

/**
 * 历史路由改名迁移（2026-08-23 board→issues、2026-09-06 Task→Issue 命名收尾）：
 * 持久化的收藏路径指向旧路由时重写为新路由，避免收藏点击落 404。
 */
export function migrateLegacyAppPath(path: string): string {
  return path
    .replace(/^\/app\/tasks\/([^/]+)$/, '/app/issues/$1')
    .replace(/^\/app\/tasks$/, '/app/issues')
    .replace(/^\/app\/projects\/([^/]+)\/(?:tasks|board)$/, '/app/projects/$1/issues');
}

export type ViewingEntityType =
  | 'task'
  | 'bug'
  | 'document'
  | 'repository'
  | 'member'
  | 'project';

/**
 * 统一创建面板可创建的类型（与 `components/ui/unified-create-dialog` 的 `CreateType` 结构一致）。
 * 定义在本处是为了让 store 不反向依赖 UI 层（ui → infrastructure 单向）。
 */
export type CreateDialogType =
  | 'task'
  | 'bug'
  | 'doc'
  | 'project'
  | 'milestone'
  | 'ai';

/** 全局统一创建面板的唤起参数 */
export interface CreateDialogState {
  open: boolean;
  type: CreateDialogType;
  /** 预置项目（缺省时面板内自选） */
  projectId?: string;
  /** 预置负责人（成员卡「派发任务」等入口） */
  assigneeId?: string;
}

/** 底部 Dock 可配置的功能按钮（数组顺序即 Dock 中的展示顺序） */
export type DockItemId = 'create' | 'search' | 'notifications' | 'theme';

export const DOCK_ITEM_IDS: DockItemId[] = [
  'create',
  'search',
  'notifications',
  'theme',
];

/** 「正在查看」上下文：详情页上报，AI 助手侧边栏随消息附带 */
export interface ViewingContext {
  type: ViewingEntityType;
  id: string;
  title?: string;
}

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  currentTaskId: string | null;
  setCurrentTaskId: (id: string | null) => void;

  viewing: ViewingContext | null;
  setViewing: (viewing: ViewingContext | null) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** 导航分组收缩态（工具组不参与收缩） */
  navGroupsCollapsed: {
    main: boolean;
    favorites: boolean;
    system: boolean;
  };
  toggleNavGroupCollapsed: (
    group: 'main' | 'favorites' | 'system',
  ) => void;
  sidebarSections: {
    primary: boolean;
    workspace: boolean;
    system: boolean;
  };
  toggleSidebarSection: (section: 'primary' | 'workspace' | 'system') => void;
  sidebarItemVisibility: Record<string, 'always' | 'badged' | 'hidden'>;
  setSidebarItemVisibility: (
    itemId: string,
    mode: 'always' | 'badged' | 'hidden',
  ) => void;
  sidebarBadgeStyle: 'count' | 'dot';
  setSidebarBadgeStyle: (style: 'count' | 'dot') => void;
  viewMode: 'kanban' | 'list';
  setViewMode: (mode: 'kanban' | 'list') => void;
  projectListVisibleColumns: string[];
  setProjectListVisibleColumns: (columns: string[]) => void;

  favoritePages: FavoritePageEntry[];
  toggleFavoritePage: (entry: FavoritePageEntry) => void;
  isFavoritePage: (path: string) => boolean;

  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  /** 浮窗放大态（≈1/4 屏） */
  assistantExpanded: boolean;
  toggleAssistantExpanded: () => void;
  /** 跨组件唤起助手并定位到指定会话（通知页/命令面板用）；nonce 防重复消费；draft 预填输入框 */
  assistantOpenRequest: {
    conversationId: string | null;
    draft?: string;
    nonce: number;
  } | null;
  openAssistantConversation: (conversationId: string, draft?: string) => void;
  /** 唤起助手（跟随当前会话）并预填输入框（统一创建面板「AI 创建」用） */
  openAssistantWithDraft: (draft: string) => void;

  /** 全局统一创建面板（ShellLayout 挂载；底部 Dock「新建」等入口唤起） */
  createDialog: CreateDialogState;
  openCreateDialog: (options?: {
    type?: CreateDialogType;
    projectId?: string;
    assigneeId?: string;
  }) => void;
  closeCreateDialog: () => void;

  /** Dock 功能按钮：可见项及其顺序（不在数组内 = 已隐藏） */
  dockItems: DockItemId[];
  setDockItemVisible: (id: DockItemId, visible: boolean) => void;
  /** 在可见列表内上/下移一位（direction: -1 上移 / 1 下移） */
  moveDockItem: (id: DockItemId, direction: -1 | 1) => void;
  /**
   * Dock 上**不展示**的 AI 同事 id（名单制而非白名单制）：
   * 空数组 = 全部展示（默认）。用「隐藏名单」是为了避免「空 = 全部」的歧义——
   * 白名单下「取消最后一个勾选」会得到空数组，语义反转成全选。
   */
  dockHiddenAssistantIds: string[];
  setDockHiddenAssistantIds: (ids: string[]) => void;
  /** 恢复 Dock 默认配置 */
  resetDockSettings: () => void;

  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      currentProjectId: null,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      currentTaskId: null,
      setCurrentTaskId: (id) => set({ currentTaskId: id }),

      viewing: null,
      setViewing: (viewing) => set({ viewing }),

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      navGroupsCollapsed: { main: false, favorites: false, system: false },
      toggleNavGroupCollapsed: (group) =>
        set((state) => ({
          navGroupsCollapsed: {
            ...state.navGroupsCollapsed,
            [group]: !state.navGroupsCollapsed[group],
          },
        })),
      sidebarSections: {
        primary: true,
        workspace: true,
        system: true,
      },
      toggleSidebarSection: (section) =>
        set((state) => ({
          sidebarSections: {
            ...state.sidebarSections,
            [section]: !state.sidebarSections[section],
          },
        })),
      sidebarItemVisibility: {
        inbox: 'always',
        dashboard: 'always',
        projects: 'always',
        ai_space: 'always',
        notifications: 'always',
        integrations: 'always',
        repositories: 'always',
        terminal: 'always',
        settings: 'always',
      },
      setSidebarItemVisibility: (itemId, mode) =>
        set((state) => ({
          sidebarItemVisibility: {
            ...state.sidebarItemVisibility,
            [itemId]: mode,
          },
        })),
      sidebarBadgeStyle: 'count',
      setSidebarBadgeStyle: (style) => set({ sidebarBadgeStyle: style }),
      viewMode: 'kanban',
      setViewMode: (mode) => set({ viewMode: mode }),
      projectListVisibleColumns: [
        'icon',
        'name',
        'health',
        'priority',
        'owner',
        'members',
        'start',
        'target',
        'progress',
        'updated',
        'status',
      ],
      setProjectListVisibleColumns: (columns) =>
        set({
          projectListVisibleColumns: columns,
        }),

      favoritePages: [],
      toggleFavoritePage: (entry) =>
        set((state) => ({
          favoritePages: state.favoritePages.some((f) => f.path === entry.path)
            ? state.favoritePages.filter((f) => f.path !== entry.path)
            : [...state.favoritePages, entry],
        })),
      isFavoritePage: (path) =>
        get().favoritePages.some((f) => f.path === path),

      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
      assistantExpanded: false,
      toggleAssistantExpanded: () =>
        set((state) => ({ assistantExpanded: !state.assistantExpanded })),
      assistantOpenRequest: null,
      openAssistantConversation: (conversationId, draft) =>
        set((state) => ({
          aiPanelOpen: true,
          assistantOpenRequest: {
            conversationId,
            draft,
            nonce: (state.assistantOpenRequest?.nonce ?? 0) + 1,
          },
        })),
      openAssistantWithDraft: (draft) =>
        set((state) => ({
          aiPanelOpen: true,
          assistantOpenRequest: {
            conversationId: null,
            draft,
            nonce: (state.assistantOpenRequest?.nonce ?? 0) + 1,
          },
        })),

      createDialog: { open: false, type: 'task' },
      openCreateDialog: (options) =>
        set({
          createDialog: {
            open: true,
            type: options?.type ?? 'task',
            projectId: options?.projectId,
            assigneeId: options?.assigneeId,
          },
        }),
      closeCreateDialog: () =>
        set((state) => ({ createDialog: { ...state.createDialog, open: false } })),

      dockItems: [...DOCK_ITEM_IDS],
      setDockItemVisible: (id, visible) =>
        set((state) => ({
          dockItems: visible
            ? state.dockItems.includes(id)
              ? state.dockItems
              : [...state.dockItems, id]
            : state.dockItems.filter((item) => item !== id),
        })),
      moveDockItem: (id, direction) =>
        set((state) => {
          const index = state.dockItems.indexOf(id);
          const target = index + direction;
          if (index === -1 || target < 0 || target >= state.dockItems.length) {
            return { dockItems: state.dockItems };
          }
          const next = [...state.dockItems];
          [next[index], next[target]] = [next[target], next[index]];
          return { dockItems: next };
        }),
      dockHiddenAssistantIds: [],
      setDockHiddenAssistantIds: (ids) => set({ dockHiddenAssistantIds: ids }),
      resetDockSettings: () =>
        set({ dockItems: [...DOCK_ITEM_IDS], dockHiddenAssistantIds: [] }),

      onboardingCompleted: false,
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
    }),
    {
      name: 'app-storage',
      version: 1,
      // v1：收藏路径迁移——历史改名（board→issues、tasks→issues）后旧路径重写并去重
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<AppState>;
        if (Array.isArray(state.favoritePages)) {
          const seen = new Set<string>();
          state.favoritePages = state.favoritePages
            .map((f) => ({ ...f, path: migrateLegacyAppPath(f.path) }))
            .filter((f) => !seen.has(f.path) && seen.add(f.path));
        }
        return state as AppState;
      },
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        navGroupsCollapsed: state.navGroupsCollapsed,
        sidebarSections: state.sidebarSections,
        sidebarItemVisibility: state.sidebarItemVisibility,
        sidebarBadgeStyle: state.sidebarBadgeStyle,
        viewMode: state.viewMode,
        currentProjectId: state.currentProjectId,
        projectListVisibleColumns: state.projectListVisibleColumns,
        favoritePages: state.favoritePages,
        dockItems: state.dockItems,
        dockHiddenAssistantIds: state.dockHiddenAssistantIds,
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
);

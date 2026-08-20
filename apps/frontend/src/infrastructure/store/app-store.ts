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

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  currentTaskId: string | null;
  setCurrentTaskId: (id: string | null) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
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

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
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

      onboardingCompleted: false,
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarSections: state.sidebarSections,
        sidebarItemVisibility: state.sidebarItemVisibility,
        sidebarBadgeStyle: state.sidebarBadgeStyle,
        viewMode: state.viewMode,
        currentProjectId: state.currentProjectId,
        projectListVisibleColumns: state.projectListVisibleColumns,
        favoritePages: state.favoritePages,
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
);

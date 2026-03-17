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
        metadata: 'always',
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

      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
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
      }),
    },
  ),
);

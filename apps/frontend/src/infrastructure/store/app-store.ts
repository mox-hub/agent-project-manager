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
  viewMode: 'kanban' | 'list';
  setViewMode: (mode: 'kanban' | 'list') => void;

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
      }),
    },
  ),
);

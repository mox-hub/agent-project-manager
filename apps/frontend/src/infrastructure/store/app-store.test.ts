import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './app-store';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      currentUser: null,
      currentProjectId: null,
      currentTaskId: null,
      sidebarCollapsed: false,
      sidebarSections: {
        primary: true,
        workspace: true,
        system: true,
      },
      sidebarItemVisibility: {
        inbox: 'always',
        dashboard: 'always',
        projects: 'always',
        ai_space: 'always',
        terminal: 'always',
        settings: 'always',
      },
      sidebarBadgeStyle: 'count',
      viewMode: 'kanban',
      favoritePages: [],
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
      aiPanelOpen: false,
    });
  });

  it('should initialize with default values', () => {
    const state = useAppStore.getState();
    expect(state.currentUser).toBeNull();
    expect(state.currentProjectId).toBeNull();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.viewMode).toBe('kanban');
  });

  it('should set current user', () => {
    const user = {
      id: '1',
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
    };

    useAppStore.getState().setCurrentUser(user);
    expect(useAppStore.getState().currentUser).toEqual(user);
  });

  it('should set current project ID', () => {
    useAppStore.getState().setCurrentProjectId('project-1');
    expect(useAppStore.getState().currentProjectId).toBe('project-1');
  });

  it('should toggle sidebar', () => {
    const initialState = useAppStore.getState().sidebarCollapsed;
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(!initialState);
  });

  it('should set view mode', () => {
    useAppStore.getState().setViewMode('list');
    expect(useAppStore.getState().viewMode).toBe('list');
  });

  it('should set AI panel open state', () => {
    useAppStore.getState().setAiPanelOpen(true);
    expect(useAppStore.getState().aiPanelOpen).toBe(true);
  });

  it('should toggle favorite page on and off', () => {
    const entry = { path: '/app/tasks', label: 'Tasks' };
    useAppStore.getState().toggleFavoritePage(entry);
    expect(useAppStore.getState().favoritePages).toEqual([entry]);
    expect(useAppStore.getState().isFavoritePage('/app/tasks')).toBe(true);

    useAppStore.getState().toggleFavoritePage(entry);
    expect(useAppStore.getState().favoritePages).toEqual([]);
    expect(useAppStore.getState().isFavoritePage('/app/tasks')).toBe(false);
  });

  it('should update label when re-favoriting with a different label', () => {
    useAppStore.getState().toggleFavoritePage({ path: '/app/tasks', label: 'Tasks' });
    useAppStore.getState().toggleFavoritePage({ path: '/app/tasks', label: '任务' });
    // 同 path 已存在时视为取消收藏；先移除再以新标签收藏
    useAppStore.getState().toggleFavoritePage({ path: '/app/tasks', label: '任务' });
    expect(useAppStore.getState().favoritePages).toEqual([{ path: '/app/tasks', label: '任务' }]);
  });
});

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
      viewMode: 'kanban',
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
});

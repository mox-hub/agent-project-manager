import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, migrateLegacyAppPath, DOCK_ITEM_IDS } from './app-store';

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
    const entry = { path: '/app/issues', label: 'Tasks' };
    useAppStore.getState().toggleFavoritePage(entry);
    expect(useAppStore.getState().favoritePages).toEqual([entry]);
    expect(useAppStore.getState().isFavoritePage('/app/issues')).toBe(true);

    useAppStore.getState().toggleFavoritePage(entry);
    expect(useAppStore.getState().favoritePages).toEqual([]);
    expect(useAppStore.getState().isFavoritePage('/app/issues')).toBe(false);
  });

  it('should update label when re-favoriting with a different label', () => {
    useAppStore.getState().toggleFavoritePage({ path: '/app/issues', label: 'Tasks' });
    useAppStore.getState().toggleFavoritePage({ path: '/app/issues', label: '任务' });
    // 同 path 已存在时视为取消收藏；先移除再以新标签收藏
    useAppStore.getState().toggleFavoritePage({ path: '/app/issues', label: '任务' });
    expect(useAppStore.getState().favoritePages).toEqual([{ path: '/app/issues', label: '任务' }]);
  });
});

describe('统一创建面板（全局唤起）', () => {
  beforeEach(() => {
    useAppStore.setState({ createDialog: { open: false, type: 'task' } });
  });

  it('默认关闭且类型为 task', () => {
    expect(useAppStore.getState().createDialog).toEqual({ open: false, type: 'task' });
  });

  it('openCreateDialog 支持指定类型与预置项目/负责人', () => {
    useAppStore.getState().openCreateDialog({ type: 'bug', projectId: 'p1', assigneeId: 'm1' });
    expect(useAppStore.getState().createDialog).toEqual({
      open: true,
      type: 'bug',
      projectId: 'p1',
      assigneeId: 'm1',
    });
  });

  it('openCreateDialog 缺省参数回落 task 且不带预置项', () => {
    useAppStore.getState().openCreateDialog();
    expect(useAppStore.getState().createDialog).toEqual({
      open: true,
      type: 'task',
      projectId: undefined,
      assigneeId: undefined,
    });
  });

  it('closeCreateDialog 仅置关闭、保留类型以便下次复用', () => {
    useAppStore.getState().openCreateDialog({ type: 'doc' });
    useAppStore.getState().closeCreateDialog();
    expect(useAppStore.getState().createDialog).toEqual({ open: false, type: 'doc' });
  });
});

describe('Dock 配置', () => {
  beforeEach(() => {
    useAppStore.setState({
      dockItems: [...DOCK_ITEM_IDS],
      dockHiddenAssistantIds: [],
    });
  });

  it('默认展示全部功能按钮', () => {
    expect(useAppStore.getState().dockItems).toEqual([...DOCK_ITEM_IDS]);
  });

  it('隐藏后重新开启追加到列表末尾（顺序可再调）', () => {
    const { setDockItemVisible } = useAppStore.getState();
    setDockItemVisible('create', false);
    expect(useAppStore.getState().dockItems).toEqual(['search', 'notifications', 'theme']);
    setDockItemVisible('create', true);
    expect(useAppStore.getState().dockItems).toEqual([
      'search',
      'notifications',
      'theme',
      'create',
    ]);
  });

  it('重复开启同一项不会产生重复条目', () => {
    useAppStore.getState().setDockItemVisible('create', true);
    expect(useAppStore.getState().dockItems).toEqual([...DOCK_ITEM_IDS]);
  });

  it('moveDockItem 越界时保持不变（首个上移 / 末个下移）', () => {
    const { moveDockItem } = useAppStore.getState();
    moveDockItem('create', -1);
    expect(useAppStore.getState().dockItems).toEqual([...DOCK_ITEM_IDS]);
    moveDockItem('theme', 1);
    expect(useAppStore.getState().dockItems).toEqual([...DOCK_ITEM_IDS]);
  });

  it('moveDockItem 对隐藏项无副作用', () => {
    useAppStore.getState().setDockItemVisible('theme', false);
    const before = useAppStore.getState().dockItems;
    useAppStore.getState().moveDockItem('theme', -1);
    expect(useAppStore.getState().dockItems).toEqual(before);
  });

  it('resetDockSettings 还原功能按钮与 AI 常驻名单', () => {
    useAppStore.setState({ dockItems: ['theme'], dockHiddenAssistantIds: ['m-2'] });
    useAppStore.getState().resetDockSettings();
    expect(useAppStore.getState().dockItems).toEqual([...DOCK_ITEM_IDS]);
    expect(useAppStore.getState().dockHiddenAssistantIds).toEqual([]);
  });
});

describe('migrateLegacyAppPath', () => {
  it('全局任务详情与列表旧路径重写到 issues', () => {
    expect(migrateLegacyAppPath('/app/tasks/t1')).toBe('/app/issues/t1');
    expect(migrateLegacyAppPath('/app/tasks')).toBe('/app/issues');
  });

  it('项目子页签旧路径（tasks/board）重写到项目 issues', () => {
    expect(migrateLegacyAppPath('/app/projects/p1/tasks')).toBe('/app/projects/p1/issues');
    expect(migrateLegacyAppPath('/app/projects/p1/board')).toBe('/app/projects/p1/issues');
  });

  it('现役路径与其余页面路径原样返回', () => {
    expect(migrateLegacyAppPath('/app/projects/p1/issues')).toBe('/app/projects/p1/issues');
    expect(migrateLegacyAppPath('/app/issues/i1')).toBe('/app/issues/i1');
    expect(migrateLegacyAppPath('/app/projects/p1')).toBe('/app/projects/p1');
    expect(migrateLegacyAppPath('/app/projects/p1/milestones')).toBe('/app/projects/p1/milestones');
    expect(migrateLegacyAppPath('/app/documents')).toBe('/app/documents');
  });
});

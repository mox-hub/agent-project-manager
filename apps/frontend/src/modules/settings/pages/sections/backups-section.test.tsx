import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BackupsSection } from './backups-section';

// i18n mock 仅透传键名，断言直接对着键写
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// PageShell 内嵌 PageHeader（依赖收藏/标签页上下文），本测试只关注区块内容
vi.mock('@/components/semantic/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/components/favorite-toggle', () => ({
  FavoriteToggle: () => <span data-testid="favorite-toggle" />,
}));

const restoreDialogSpy = vi.fn();
vi.mock('@/modules/workspace/components/restore-confirm-dialog', () => ({
  RestoreConfirmDialog: (props: { backup: unknown; open: boolean }) => {
    restoreDialogSpy(props);
    return props.open ? <div data-testid="restore-dialog" /> : null;
  },
}));

const backupsState: { data?: unknown; isLoading?: boolean } = {};
const workspacesState: { data?: unknown } = {};

vi.mock('@/modules/workspace/hooks/use-workspace-backups', () => ({
  useWorkspaceBackups: () => ({
    data: backupsState.data,
    isLoading: backupsState.isLoading ?? false,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useCreateWorkspaceBackup: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/modules/workspace/hooks/use-workspace-list', () => ({
  useWorkspaceList: () => ({ data: workspacesState.data }),
}));

beforeEach(() => {
  backupsState.data = [];
  backupsState.isLoading = false;
  workspacesState.data = { workspaces: [] };
  restoreDialogSpy.mockClear();
});

describe('BackupsSection（设置·备份与恢复）', () => {
  it('加载态渲染骨架（SkeletonList），不渲染空态文案', () => {
    backupsState.isLoading = true;
    const { container } = render(<BackupsSection />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('workspace.backups.empty')).toBeNull();
  });

  it('无备份渲染诚实空态', () => {
    render(<BackupsSection />);
    expect(screen.getByText('workspace.backups.empty')).toBeTruthy();
  });

  it('备份列表渲染条目（时间/scope 徽标/恢复按钮），点恢复打开强确认对话框', () => {
    backupsState.data = [
      {
        id: 'backup-20261001T000000-all',
        createdAt: '2026-10-01T00:00:00.000Z',
        scope: 'all',
        files: [{ name: 'workspaces.json', sizeBytes: 120 }],
        totalBytes: 4096,
      },
    ];
    render(<BackupsSection />);
    expect(screen.getByText('workspace.backups.scopeAll')).toBeTruthy();
    expect(screen.getByText('workspace.backups.fileSummary')).toBeTruthy();
    fireEvent.click(screen.getByText('workspace.backups.restoreButton'));
    expect(screen.getByTestId('restore-dialog')).toBeTruthy();
    expect(restoreDialogSpy).toHaveBeenCalledWith(
      expect.objectContaining({ open: true, backup: expect.objectContaining({ scope: 'all' }) }),
    );
  });

  it('pre-restore 自动备份条目追加来源徽标', () => {
    backupsState.data = [
      {
        id: 'backup-20261001T000000-pre',
        createdAt: '2026-10-01T00:00:00.000Z',
        scope: 'workspace',
        workspaceId: 'ws-1',
        workspaceName: '研发工作区',
        reason: 'pre-restore',
        files: [],
        totalBytes: 1,
      },
    ];
    render(<BackupsSection />);
    expect(screen.getByText('研发工作区')).toBeTruthy();
    expect(screen.getByText('workspace.backups.reasonPreRestore')).toBeTruthy();
  });
});

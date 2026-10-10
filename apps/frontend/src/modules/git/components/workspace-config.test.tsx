import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceConfig } from './workspace-config';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const refetch = vi.fn();
const setMutateAsync = vi.fn().mockResolvedValue({});
const cloneMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('../hooks/use-workspace', () => ({
  useWorkspace: vi.fn(() => ({
    data: {
      projectId: 'p1',
      localPath: 'D:\\code\\demo',
      remoteUrl: 'https://github.com/user/repo.git',
      autoClone: false,
      validationStatus: 'valid',
      validatedAt: '2026-10-03T01:02:03Z',
    },
    isLoading: false,
    refetch,
  })),
  useSetWorkspace: vi.fn(() => ({ mutateAsync: setMutateAsync, isPending: false })),
  useCloneRepository: vi.fn(() => ({ mutateAsync: cloneMutateAsync, isPending: false })),
}));

const validatePath = vi.fn().mockResolvedValue({ status: 'valid' });
const ensureDirectory = vi.fn().mockResolvedValue({ status: 'valid' });

vi.mock('../api/git-api', () => ({
  gitApi: {
    validateWorkspacePath: (...args: unknown[]) => validatePath(...args),
    ensureWorkspaceDirectory: (...args: unknown[]) => ensureDirectory(...args),
  },
}));

vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

describe('WorkspaceConfig（CAP-A-28 收编 path-input）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('自动加载已存配置回显（DB 为真相源）+ 已验证态徽标', () => {
    render(<WorkspaceConfig projectId="p1" />);
    expect(
      screen.getByDisplayValue('D:\\code\\demo'),
    ).toBeInTheDocument();
    expect(screen.getByText('path-input.status.valid')).toBeInTheDocument();
    expect(screen.getByText(/path-input\.savedAt/)).toBeInTheDocument();
  });

  it('验证动作走后端直验端点（当前输入值，非已存值）', async () => {
    render(<WorkspaceConfig projectId="p1" />);
    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.action.validate' }),
    );
    await waitFor(() => {
      expect(validatePath).toHaveBeenCalledWith('p1', 'D:\\code\\demo');
    });
  });

  it('创建目录动作接 ensure 端点', async () => {
    validatePath.mockResolvedValue({
      status: 'invalid',
      error: 'Local path does not exist',
      missing: true,
    });
    render(<WorkspaceConfig projectId="p1" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.action.validate' }),
    );
    const createButton = await screen.findByRole('button', {
      name: 'path-input.action.create',
    });
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(ensureDirectory).toHaveBeenCalledWith('p1', 'D:\\code\\demo');
    });
  });

  it('Save 链提交 dto（localPath/remoteUrl/autoClone）', async () => {
    render(<WorkspaceConfig projectId="p1" />);
    fireEvent.click(screen.getByRole('button', { name: 'git.workspace.save' }));
    await waitFor(() => {
      expect(setMutateAsync).toHaveBeenCalledWith({
        projectId: 'p1',
        dto: {
          localPath: 'D:\\code\\demo',
          remoteUrl: 'https://github.com/user/repo.git',
          autoClone: false,
        },
      });
    });
  });
});

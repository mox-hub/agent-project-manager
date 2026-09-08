import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContractBindingsPanel } from '../components/contract-bindings-panel';
import type {
  ContractBindingsResponse,
  ContractBinding,
  ContractAlignmentReport,
  SeedContractResult,
} from '../api/contract-api';

const mocks = vi.hoisted(() => ({
  seedAsync: vi.fn(),
  checkAsync: vi.fn(),
  setSyncModeAsync: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/use-contract', () => ({
  useContractBindings: vi.fn(),
  useSeedContractFiles: vi.fn(() => ({
    isPending: false,
    mutateAsync: mocks.seedAsync,
  })),
  useCheckContractAlignment: vi.fn(() => ({
    isPending: false,
    mutateAsync: mocks.checkAsync,
  })),
  useSetContractSyncMode: vi.fn(() => ({
    isPending: false,
    mutateAsync: mocks.setSyncModeAsync,
  })),
}));

import { useContractBindings } from '../hooks/use-contract';

function mockBindings(data: ContractBindingsResponse | null) {
  (useContractBindings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data,
    isLoading: false,
  });
}

function makeBinding(over: Partial<ContractBinding>): ContractBinding {
  return {
    id: 'b1',
    projectId: 'p1',
    fileType: 'agents',
    filePath: 'AGENTS.md',
    syncMode: 'managed',
    truthOwner: 'file_git',
    baseline: null,
    conflictState: null,
    lastWriter: null,
    createdAt: '',
    updatedAt: '',
    ...over,
  } as ContractBinding;
}

function renderPanel() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ContractBindingsPanel projectId="p1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const seedResult = (files: SeedContractResult['files']): SeedContractResult => ({
  projectId: 'p1',
  workspaceRoot: '/ws',
  files,
});

describe('ContractBindingsPanel', () => {
  beforeEach(() => {
    mocks.seedAsync.mockReset();
    mocks.checkAsync.mockReset();
    mocks.setSyncModeAsync.mockReset();
    mocks.seedAsync.mockResolvedValue(seedResult([]));
    mocks.checkAsync.mockResolvedValue([] as ContractAlignmentReport[]);
  });

  it('有工作区时渲染绑定行：类型标签 / 路径 / 同步模式徽章', () => {
    mockBindings({
      workspaceRoot: '/ws/demo',
      bindings: [makeBinding({})],
    });
    renderPanel();

    expect(screen.getByText('/ws/demo')).toBeTruthy();
    expect(screen.getByText('contract.fileType.agents')).toBeTruthy();
    expect(screen.getByText('AGENTS.md')).toBeTruthy();
    expect(screen.getByText('contract.syncMode.managed')).toBeTruthy();
  });

  it('冲突绑定渲染冲突徽章并链接决策收件箱', () => {
    mockBindings({
      workspaceRoot: '/ws/demo',
      bindings: [makeBinding({ conflictState: 'conflicted' })],
    });
    renderPanel();

    expect(screen.getByText('contract.state.conflicted')).toBeTruthy();
    const link = screen
      .getByText('contract.action.viewProposal')
      .closest('a');
    expect(link?.getAttribute('href')).toBe('/app/decisions');
  });

  it('未绑工作区渲染引导提示；无绑定渲染空态且种生按钮禁用', () => {
    mockBindings({ workspaceRoot: null, bindings: [] });
    renderPanel();

    expect(screen.getByText('contract.noWorkspace.title')).toBeTruthy();
    expect(screen.getByText('contract.empty.title')).toBeTruthy();
    const seedAll = screen
      .getByText('contract.action.seedAll')
      .closest('button') as HTMLButtonElement;
    expect(seedAll.disabled).toBe(true);
  });

  it('全部种生不传过滤；行内补种按 fileType 过滤', async () => {
    mockBindings({
      workspaceRoot: '/ws/demo',
      bindings: [makeBinding({})],
    });
    renderPanel();

    fireEvent.click(
      screen.getByText('contract.action.seedAll').closest('button')!,
    );
    await waitFor(() => expect(mocks.seedAsync).toHaveBeenCalledWith(undefined));

    fireEvent.click(
      screen
        .getByText('contract.action.seed')
        .closest('button')!,
    );
    await waitFor(() =>
      expect(mocks.seedAsync).toHaveBeenCalledWith(['agents']),
    );
  });

  it('种生后展示逐文件动作结果条', async () => {
    mocks.seedAsync.mockResolvedValue(
      seedResult([{ path: 'AGENTS.md', action: 'created' }]),
    );
    mockBindings({
      workspaceRoot: '/ws/demo',
      bindings: [makeBinding({})],
    });
    renderPanel();

    fireEvent.click(
      screen.getByText('contract.action.seedAll').closest('button')!,
    );
    expect(await screen.findByText('contract.result.seedTitle')).toBeTruthy();
    expect(screen.getByText('contract.seedAction.created')).toBeTruthy();
  });

  it('对齐检查结果条渲染状态徽章，冲突项附收件箱链接', async () => {
    mocks.checkAsync.mockResolvedValue([
      { fileType: 'agents', state: 'conflicted', proposalId: 'dp1' },
    ] as ContractAlignmentReport[]);
    mockBindings({
      workspaceRoot: '/ws/demo',
      bindings: [makeBinding({})],
    });
    renderPanel();

    fireEvent.click(
      screen.getByText('contract.action.checkAll').closest('button')!,
    );
    expect(await screen.findByText('contract.result.checkTitle')).toBeTruthy();
    expect(screen.getByText('contract.checkState.conflicted')).toBeTruthy();
    expect(
      screen.getAllByText('contract.action.viewProposal').length,
    ).toBeGreaterThanOrEqual(1);
  });
});

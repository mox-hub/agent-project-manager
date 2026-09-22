/**
 * 管道总览卡测试（CAP-P-01 五期切片 1 / GAP-T-41）：
 * 需求纪要按项目聚合、无项目不进卡、五阶段进度点、CTA 钻取与
 * 完备度徽章占位（切片 2 readiness-review 接入前显示「未评估」）。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PipelineOverviewCards } from './pipeline-overview-cards';
import type { DocumentListItem } from '@/modules/document/api/document-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key }),
}));

const { mockNavigate, mockGetStatus } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetStatus: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

const { useQueriesMock } = vi.hoisted(() => ({ useQueriesMock: vi.fn() }));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueries: (opts: { queries: Array<{ queryKey: readonly unknown[] }> }) =>
    useQueriesMock(opts),
}));

vi.mock('@/modules/project/api/playbook-api', () => ({
  playbookApi: { getStatus: (...args: unknown[]) => mockGetStatus(...args) },
}));

vi.mock('./analysis-draft-dialog', () => ({
  AnalysisDraftDialog: () => <div data-testid="analysis-dialog-stub" />,
}));

function doc(overrides: Partial<DocumentListItem>): DocumentListItem {
  return {
    id: 'd1',
    title: '纪要标题',
    content: '',
    category: 'requirement',
    status: 'published',
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as DocumentListItem;
}

const PLAYBOOK_STATUS = (statuses: string[]) => ({
  projectId: 'p1',
  playbookRef: 'requirement-pipeline',
  template: { key: 'requirement-pipeline', name: '需求承接剧本', description: '' },
  currentStage: 'clarify',
  stages: statuses.map((s, i) => ({
    key: `stage-${i}`,
    name: `阶段${i}`,
    purpose: '',
    status: s,
    gateRejections: 0,
  })),
});

beforeEach(() => {
  vi.clearAllMocks();
  useQueriesMock.mockImplementation(({ queries }) =>
    queries.map(() => ({ data: undefined, isLoading: false })),
  );
});

function setup(docs: DocumentListItem[]) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PipelineOverviewCards docs={docs} isLoading={false} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PipelineOverviewCards（CAP-P-01 五期切片 1）', () => {
  it('需求纪要按项目聚合为管道卡：同项目两份纪要一张卡，标题取第一份', () => {
    setup([
      doc({ id: 'd1', title: '最新纪要', projectId: 'p1', project: { id: 'p1', name: '项目一' } }),
      doc({ id: 'd2', title: '更早纪要', projectId: 'p1', project: { id: 'p1', name: '项目一' } }),
    ]);
    expect(screen.getByText('最新纪要')).toBeInTheDocument();
    expect(screen.queryByText('更早纪要')).not.toBeInTheDocument();
    expect(screen.getByText('项目一')).toBeInTheDocument();
  });

  it('未关联项目的纪要不进管道卡：仅剩空态', () => {
    setup([doc({ projectId: null })]);
    expect(screen.getByText('intake.pipelineCards.empty')).toBeInTheDocument();
    expect(useQueriesMock).toHaveBeenCalledWith({ queries: [] });
  });

  it('五阶段进度点渲染阶段状态，完备度徽章显示占位「未评估」', () => {
    useQueriesMock.mockImplementation(({ queries }) =>
      queries.map(() => ({
        data: PLAYBOOK_STATUS(['done', 'active', 'pending', 'pending', 'pending']),
        isLoading: false,
      })),
    );
    setup([doc({ projectId: 'p1' })]);
    expect(screen.getByText('intake.pipelineCards.notAssessed')).toBeInTheDocument();
    const dots = screen.getAllByTitle(/intake\.pipelineCards\.stageStatus/);
    expect(dots).toHaveLength(5);
    expect(dots[0]).toHaveAttribute('data-stage-status', 'done');
    expect(dots[1]).toHaveAttribute('data-stage-status', 'active');
    expect(screen.getByText('intake.pipelineCards.activeStage')).toBeInTheDocument();
  });

  it('已挂载且阶段进行中：CTA「继续 · 阶段」钻取该项目剧本页', () => {
    useQueriesMock.mockImplementation(({ queries }) =>
      queries.map(() => ({
        data: PLAYBOOK_STATUS(['done', 'active', 'pending', 'pending', 'pending']),
        isLoading: false,
      })),
    );
    setup([doc({ projectId: 'p1' })]);
    fireEvent.click(screen.getByText('intake.pipelineCards.continueCta'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/projects/p1/playbook');
  });

  it('未挂载剧本：CTA 为「挂载承接剧本」', () => {
    mockGetStatus.mockResolvedValue({
      projectId: 'p1',
      playbookRef: null,
      template: null,
      currentStage: null,
      stages: [],
    });
    useQueriesMock.mockImplementation(({ queries }) =>
      queries.map(() => ({ data: undefined, isLoading: false })),
    );
    setup([doc({ projectId: 'p1' })]);
    expect(screen.getByText('intake.pipelineCards.mountCta')).toBeInTheDocument();
    expect(screen.queryByText(/当前 · /)).not.toBeInTheDocument();
  });
});

/**
 * TaskDetailPage 集成单测（P1-9 正文区验收标准只读回显）
 *
 * 覆盖：详情页正文区渲染验收标准回显块（多状态条目 + 只读）、
 * 无验收标准时不渲染空块。重依赖组件/hook 全部 stub，聚焦接线与渲染。
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskDetailPage } from './task-detail-page';
import type {
  Acceptance,
  AcceptanceCriterion,
} from '@/modules/acceptance/api/acceptance-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: string | { defaultValue?: string }) =>
      typeof opts === 'string' ? opts : (opts?.defaultValue ?? key),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// ── issue 模块 hooks / 组件 ──
const useTaskDetailMock = vi.fn();
vi.mock('../hooks/use-project-tasks', () => ({
  useTaskDetail: (...args: unknown[]) => useTaskDetailMock(...args),
  useUpdateTask: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
  useDeleteTask: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
  useProjectMilestones: () => ({ data: [] }),
  useSubTasks: () => ({ data: [], isLoading: false }),
  useCreateSubTask: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
}));

vi.mock('../hooks/use-issue-types', () => ({
  useIssueTypes: () => ({ types: [], byId: new Map(), byKey: new Map() }),
}));

vi.mock('../hooks/use-assignee-sync', () => ({
  useAssigneeSync: () => ({ primary: undefined, assignTo: vi.fn(async () => undefined) }),
}));

vi.mock('../components/issue-type-switcher', () => ({
  IssueTypeSwitcher: () => null,
}));

vi.mock('../components/custom-field-input', () => ({
  CustomFieldsSection: () => null,
  formatCustomFieldValue: (v: unknown) => (v == null ? '' : String(v)),
}));

vi.mock('../components/execution-items-panel', () => ({
  ExecutionItemsPanel: () => <div data-testid="execution-items-panel" />,
}));

vi.mock('../components/ai-assign-dialog', () => ({
  AiAssignDialog: () => null,
}));

vi.mock('../components/completion-review', () => ({
  CompletionReview: () => <div data-testid="completion-review" />,
}));

// ── acceptance 数据源（被测接线） ──
const useAcceptancesByTaskMock = vi.fn();
vi.mock('@/modules/acceptance/hooks/use-acceptance', () => ({
  useAcceptancesByTask: (...args: unknown[]) => useAcceptancesByTaskMock(...args),
}));

// ── 跨模块 hooks ──
vi.mock('@/modules/project/hooks/use-project-detail', () => ({
  useProjectDetail: () => ({ data: { id: 'proj-1', name: 'Demo 项目' } }),
}));

vi.mock('@/modules/project/hooks/use-project-list', () => ({
  useProjectList: () => ({ data: undefined }),
}));

vi.mock('@/modules/team-member/hooks', () => ({
  useMembers: () => ({ data: { items: [] } }),
}));

vi.mock('@/modules/core-config/hooks/use-metadata', () => ({
  useTags: () => ({ data: [] }),
}));

vi.mock('@/modules/execution/hooks/use-execution', () => ({
  useIssueExecutions: () => [],
}));

vi.mock('@/modules/integration/hooks/use-integrations', () => ({
  useIntegrations: () => ({ data: { data: [] } }),
}));

vi.mock('@/modules/linear/hooks/use-linear-events', () => ({
  useLinearSyncEvents: () => undefined,
}));

vi.mock('@/modules/linear/components/task-linear-panel', () => ({
  TaskLinearPanel: () => null,
}));

vi.mock('@/modules/linear/components/linear-conflict-resolver', () => ({
  LinearConflictResolver: () => null,
}));

vi.mock('@/modules/github/components/github-panel', () => ({
  GithubPanelEmbedded: () => null,
}));

vi.mock('@/modules/activity', () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
}));

vi.mock('@/modules/assistant/components/anchor-qa-thread', () => ({
  AnchorQaGhostButton: () => null,
  AnchorQaThread: () => null,
}));

vi.mock('@/modules/document/hooks/use-document-task-links', () => ({
  useTaskDocumentLinks: () => ({ data: [], isLoading: false }),
  LINK_TYPE_LABELS: {},
  LINK_TYPE_COLORS: {},
}));

vi.mock('@/modules/team-member/components/mention-textarea', () => ({
  MentionTextarea: () => null,
}));

// ── shared hooks / 组件 ──
vi.mock('@/shared/viewing-context', () => ({
  useSetViewingContext: () => undefined,
}));

vi.mock('@/shared/tabs/tabs-context', () => ({
  useTabs: () => ({ updateTabByPath: vi.fn() }),
}));

vi.mock('@/shared/confirm/confirm-provider', () => ({
  useConfirm: () => async () => true,
}));

vi.mock('@/shared/hooks/use-entity-navigation', () => ({
  useEntityNavigation: () => ({
    hasPrev: false,
    hasNext: false,
    isLoading: false,
    prevId: null,
    nextId: null,
    currentPosition: 0,
    total: 0,
  }),
}));

vi.mock('@/shared/components/favorite-toggle', () => ({
  FavoriteToggle: () => null,
}));

vi.mock('@/shared/subscription/subscribe-button', () => ({
  SubscribeButton: () => null,
}));

vi.mock('@/shared/components/markdown-view', () => ({
  MarkdownView: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@/shared/components/markdown-editor', () => ({
  MarkdownEditor: () => null,
}));

vi.mock('@/shared/route-preview/route-preview-trigger', () => ({
  RoutePreviewTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

// ── fixtures ──
const criterion = (
  overrides: Partial<AcceptanceCriterion> & { id: string },
): AcceptanceCriterion => ({
  acceptanceId: 'acc-1',
  criteriaType: 'functional',
  content: '',
  status: 'pending',
  severity: 'medium',
  order: 0,
  ...overrides,
});

const acceptance: Acceptance = {
  id: 'acc-1',
  issueId: 'issue-1',
  status: 'in_review',
  completionType: 'artifact',
  completionEvidence: null,
  title: '登录功能验收',
  criteria: [
    criterion({ id: 'c1', content: '登录接口返回 200', status: 'passed', order: 1 }),
    criterion({ id: 'c2', content: '单测覆盖率不低于 80%', status: 'failed', order: 2 }),
    criterion({ id: 'c3', content: '补充接口文档', status: 'pending', order: 3 }),
  ],
};

const task = {
  id: 'issue-1',
  title: '实现登录接口',
  status: 'todo',
  priority: 'medium',
  type: 'task',
  description: '接口描述',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  projectId: 'proj-1',
  parentIssueId: null,
  assignee: null,
  assigneeType: 'human',
  aiAgentId: null,
  shortId: 'ISSUE-1',
  dueDate: null,
  milestoneId: null,
  externalIdentifier: null,
  externalUrl: null,
  externalProvider: null,
  externalIssueId: null,
  lastExternalSyncAt: null,
  syncStatus: null,
  issueTags: [],
  customFields: {},
  typeId: null,
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const renderDetailPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/app/issues/issue-1']}>
        <Routes>
          {/* useParams 依赖路由参数定义，须以 Route 挂载 */}
          <Route path="/app/issues/:issueId" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  useTaskDetailMock.mockReset().mockReturnValue({ data: task, isLoading: false });
  useAcceptancesByTaskMock
    .mockReset()
    .mockReturnValue({ data: [acceptance], isLoading: false });
});

describe('TaskDetailPage 验收标准正文回显（P1-9）', () => {
  it('renders acceptance criteria inline in the main column with per-status entries', async () => {
    renderDetailPage();

    // 回显块（testid 区分于右栏 SidebarPanel 的同名标题）
    const preview = await screen.findByTestId('acceptance-criteria-preview');
    expect(preview).toBeTruthy();
    // 各状态条目正文与状态文案（mock t 返回 key）逐一回显
    expect(screen.getByText('登录接口返回 200')).toBeTruthy();
    expect(screen.getByText('单测覆盖率不低于 80%')).toBeTruthy();
    expect(screen.getByText('补充接口文档')).toBeTruthy();
    expect(screen.getByText('acceptance.criterionStatus.passed')).toBeTruthy();
    expect(screen.getByText('acceptance.criterionStatus.failed')).toBeTruthy();
    expect(screen.getByText('acceptance.criterionStatus.pending')).toBeTruthy();
    // 进度 1/3
    expect(screen.getByText('1/3')).toBeTruthy();
    // 只读：条目列表内无任何状态切换控件
    const list = screen.getByText('登录接口返回 200').closest('ul');
    expect(list!.querySelectorAll('button').length).toBe(0);
    // 编辑入口存在（展开右栏既有编辑区），右栏契约卡仍渲染
    // （common.edit title 在描述/自定义字段编辑按钮上也有，限定回显块内查询）
    expect(within(preview).getByTitle('common.edit')).toBeTruthy();
    expect(screen.getByTestId('completion-review')).toBeTruthy();
  });

  it('renders no inline criteria block when the task has no acceptances', async () => {
    useAcceptancesByTaskMock.mockReturnValue({ data: [], isLoading: false });
    renderDetailPage();

    expect(await screen.findByText('接口描述')).toBeTruthy();
    expect(screen.queryByTestId('acceptance-criteria-preview')).toBeNull();
  });

  it('renders no inline criteria block when acceptances carry no criteria', async () => {
    useAcceptancesByTaskMock.mockReturnValue({
      data: [{ ...acceptance, criteria: [] }],
      isLoading: false,
    });
    renderDetailPage();

    expect(await screen.findByText('接口描述')).toBeTruthy();
    expect(screen.queryByTestId('acceptance-criteria-preview')).toBeNull();
  });
});

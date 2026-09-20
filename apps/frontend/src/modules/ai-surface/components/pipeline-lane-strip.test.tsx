import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import { usePipelineFocusStore } from '@/shared/layout/pipeline-focus';
import { PipelineLaneStrip } from './pipeline-lane-strip';

/**
 * 六站泳道组件的诚实性守卫（ARCH-AISURFACE-001 §3.1 / §4.7）。
 *
 * 数据口径本身由 `use-pipeline-lanes.test.ts` 覆盖；本文件守**渲染层**的三件事：
 * ① 六站齐出且逐站可点；② `null` 渲染成破折号、真实 `0` 渲染成 0（两者不可混）；
 * ③ 无阻塞口径的站给出**原因**，不静默留白（留白会被读成"无阻塞"）。
 *
 * 六个取数 hook 全部替换成受控替身——组件只该被喂数据，不该在单测里打网络。
 */
const sources = vi.hoisted(() => ({
  state: {
    docStats: undefined,
    issues: undefined,
    repositories: undefined,
    executions: undefined,
    acceptances: undefined,
    releases: undefined,
    isPending: false,
    isError: false,
  } as {
    docStats: unknown;
    issues: unknown;
    repositories: unknown;
    executions: unknown;
    acceptances: unknown;
    releases: unknown;
    isPending: boolean;
    isError: boolean;
  },
}));

const query = (data: unknown) => ({
  data,
  isPending: sources.state.isPending,
  isError: sources.state.isError,
});

vi.mock('@/modules/document/hooks/use-documents', () => ({
  useDocumentStats: () => query(sources.state.docStats),
}));
vi.mock('@/modules/issue/hooks/use-project-tasks', () => ({
  useAllTasks: () => query(sources.state.issues),
}));
vi.mock('@/modules/git/hooks/use-repositories', () => ({
  useRepositories: () => query(sources.state.repositories),
}));
vi.mock('@/modules/executions/api/execution-api', () => ({
  useExecutionRuns: () => query(sources.state.executions),
}));
vi.mock('@/modules/acceptance/hooks/use-acceptance', () => ({
  useAcceptanceList: () => query(sources.state.acceptances),
}));
vi.mock('@/modules/release/hooks/use-releases', () => ({
  useReleases: () => query(sources.state.releases),
}));

/** 探针：把最终落点渲染出来，供导航断言读取 */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

const setSources = (partial: Partial<typeof sources.state>) => {
  sources.state = { ...sources.state, ...partial };
};

const renderStrip = (initialEntry = '/app/ai-surface') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PipelineLaneStrip />
      <LocationProbe />
    </MemoryRouter>,
  );

/** 取某站泳道按钮（按钮的可访问名即其全部文本） */
const laneButton = (label: string) =>
  screen.getByRole('button', { name: new RegExp(label) });

describe('PipelineLaneStrip', () => {
  beforeEach(() => {
    sources.state = {
      docStats: undefined,
      issues: undefined,
      repositories: undefined,
      executions: undefined,
      acceptances: undefined,
      releases: undefined,
      isPending: false,
      isError: false,
    };
    usePipelineFocusStore.getState().setFocus(null);
  });

  it('六站齐出，逐站来自 PIPELINE_STAGES（不另起一份站清单）', () => {
    renderStrip();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(PIPELINE_STAGES.length);
    for (const stage of PIPELINE_STAGES) {
      expect(laneButton(stage.labelFallback)).toBeInTheDocument();
      expect(screen.getByText(stage.stageNumber)).toBeInTheDocument();
    }
  });

  it('各站计数来自服务端真值', () => {
    setSources({
      docStats: { byCategory: { requirement: 4, analysis: 6 } },
      issues: { meta: { total: 128 } },
      repositories: [{}, {}],
      executions: { total: 9, runs: [{ status: 'completed' }, { status: 'blocked' }] },
      acceptances: { meta: { total: 55 } },
      releases: [{ gateResult: { passed: true } }],
    });
    renderStrip();

    // 01 = requirement + analysis；03/06 = 数组长度
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('未就绪时计数渲染成破折号，不冒充 0', () => {
    renderStrip();

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('服务端确实为零时写 0——"有口径且为零"与"无口径"必须可分', () => {
    setSources({
      docStats: { byCategory: {} },
      issues: { meta: { total: 0 } },
      repositories: [],
      executions: { total: 0, runs: [] },
      acceptances: { meta: { total: 0 } },
      releases: [],
    });
    renderStrip();

    // 六站计数全为 0 → 屏幕上应当一个破折号都没有
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(6);
  });

  it('无阻塞口径的站给出原因（悬停可查），不静默留白', () => {
    // 04/06 有阻塞口径（已就绪），留下的 01/02/03/05 正是"确无此口径"的四站
    setSources({
      executions: { total: 1, runs: [{ status: 'completed' }] },
      releases: [],
    });
    renderStrip();

    const noBlocked = screen.getAllByText('阻塞 —');
    expect(noBlocked).toHaveLength(4);
    for (const node of noBlocked) {
      expect(node.getAttribute('title')).toMatch(/无阻塞计数口径：.+/);
    }
  });

  it('阻塞口径尚未就绪时同样给破折号并解释，不静默留白', () => {
    renderStrip();

    // 六站都还没拿到阻塞口径 → 六个破折号，且每个都说得清为什么
    const noBlocked = screen.getAllByText('阻塞 —');
    expect(noBlocked).toHaveLength(6);
    for (const node of noBlocked) {
      expect(node.getAttribute('title')).toMatch(/无阻塞计数口径：.+/);
    }
  });

  it('有阻塞口径的站给数字，且来源可溯源', () => {
    setSources({
      executions: {
        total: 2,
        runs: [{ status: 'blocked' }, { status: 'blocked' }],
      },
      releases: [{ gateResult: { passed: false } }],
    });
    renderStrip();

    const blocked = screen.getAllByText('阻塞 2');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].getAttribute('title')).toContain('GET /execution/runs');

    expect(screen.getByText('阻塞 1')).toBeInTheDocument();
  });

  it('窗口未覆盖全量时阻塞数标注为窗口内（不冒充全量）', () => {
    setSources({
      executions: {
        total: 500,
        runs: [{ status: 'blocked' }, { status: 'blocked' }, { status: 'completed' }],
      },
    });
    renderStrip();

    expect(screen.getByText('阻塞 2').getAttribute('title')).toContain('3/500');
  });

  it('取数失败时如实报出，不假装数字是齐的', () => {
    setSources({ isError: true });
    renderStrip();

    expect(screen.getByText('部分站取数失败（破折号=未取到）')).toBeInTheDocument();
  });

  it('点击泳道跳到该站', () => {
    renderStrip();

    fireEvent.click(laneButton(PIPELINE_STAGES[2].labelFallback));

    expect(screen.getByTestId('location').textContent).toBe(PIPELINE_STAGES[2].to);
  });

  it('项目聚焦时跳转带上 ?project（六站联动口径）', () => {
    // 带参落地：URL 优先于 store
    renderStrip('/app/ai-surface?project=proj-7');

    fireEvent.click(laneButton(PIPELINE_STAGES[0].labelFallback));

    expect(screen.getByTestId('location').textContent).toBe(
      `${PIPELINE_STAGES[0].to}?project=proj-7`,
    );
  });
});

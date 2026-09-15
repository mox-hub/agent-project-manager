import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';
import { usePipelineFocusStore } from '@/shared/layout/pipeline-focus';
import type { Decision } from '@/shared/decision-card/types';
import { DecisionQueuePanel, formatWaiting } from './decision-queue-panel';

/**
 * 「该你了」待办区（S2-d）的接线守卫。
 *
 * 排序口径由 `use-decision-queue.test.ts` 覆盖；本文件守渲染层的三件事：
 * ① 三类「空」（读取中/读失败/真没有）**可分**；② 展开就是既有决策卡（同一拍板入口）；
 * ③ 动作经**共用**接线（`useDecisionActions`）转发，不在本组件里另写 mutate。
 */

const queueState = vi.hoisted(() => ({
  state: {
    queue: { items: [] as unknown[], total: 0, blocking: 0, advisory: 0, hiddenCount: 0 },
    isPending: false,
    isError: false,
  },
}));

vi.mock('../hooks/use-decision-queue', () => ({
  useDecisionQueue: () => queueState.state,
}));

const handleAction = vi.hoisted(() => vi.fn());
const busyId = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('@/modules/decision/hooks/use-decision-actions', () => ({
  useDecisionActions: () => ({ handleAction, busyId: busyId.value }),
}));

function decision(over: Partial<Decision> & Pick<Decision, 'id'>): Decision {
  return {
    kind: 'acceptance',
    sourceId: over.id,
    status: 'pending',
    title: `待办 ${over.id}`,
    urgency: 'advisory',
    proposer: { type: 'system' },
    payload: {},
    createdAt: '2026-09-14T00:00:00.000Z',
    ...over,
  };
}

/** 覆写项按需给：未给的字段由 items 现算，给了的（如服务端聚合数）原样透传 */
const setQueue = (
  items: Decision[],
  extra: {
    queue?: Partial<(typeof queueState.state)['queue']>;
    isPending?: boolean;
    isError?: boolean;
  } = {},
) => {
  queueState.state = {
    queue: {
      items,
      total: items.length,
      blocking: items.filter((d) => d.urgency === 'blocking').length,
      advisory: items.filter((d) => d.urgency === 'advisory').length,
      hiddenCount: 0,
      ...extra.queue,
    },
    isPending: extra.isPending ?? false,
    isError: extra.isError ?? false,
  };
};

const renderPanel = () =>
  render(
    <MemoryRouter>
      <DecisionQueuePanel />
    </MemoryRouter>,
  );

const rowOf = (title: string) => screen.getByText(title).closest('li') as HTMLElement;

describe('formatWaiting', () => {
  const now = Date.parse('2026-09-14T12:00:00.000Z');

  it('按真实 createdAt 推移：刚创建/分钟/小时/天', () => {
    expect(formatWaiting('2026-09-14T11:59:40.000Z', now)).toBe('刚刚');
    expect(formatWaiting('2026-09-14T11:30:00.000Z', now)).toBe('30 分钟');
    expect(formatWaiting('2026-09-14T06:00:00.000Z', now)).toBe('6 小时');
    expect(formatWaiting('2026-09-11T12:00:00.000Z', now)).toBe('3 天');
  });

  it('不可解析时返回 null（→ 界面显示破折号，不猜）', () => {
    expect(formatWaiting('不是时间', now)).toBeNull();
  });
});

describe('DecisionQueuePanel', () => {
  beforeEach(() => {
    handleAction.mockClear();
    busyId.value = null;
    usePipelineFocusStore.getState().setFocus(null);
    setQueue([]);
  });

  it('渲染待办：kind 徽标 + 标题 + 项目名 + 等待时长', () => {
    setQueue([
      decision({
        id: 'acceptance:a1',
        kind: 'acceptance',
        title: '待验收：登录页',
        projectName: '报销系统',
        urgency: 'blocking',
        createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      }),
    ]);
    renderPanel();

    const row = rowOf('待验收：登录页');
    expect(within(row).getByText('acceptance')).toBeInTheDocument();
    expect(within(row).getByText('报销系统')).toBeInTheDocument();
    expect(within(row).getByText('2 小时')).toBeInTheDocument();
  });

  it('阻断/排队计数来自服务端聚合，不是自己数出来的', () => {
    setQueue(
      [decision({ id: 'acceptance:a1', urgency: 'blocking' })],
      { queue: { blocking: 7, advisory: 3, hiddenCount: 0 } },
    );
    renderPanel();

    expect(screen.getByText('阻断 7')).toBeInTheDocument();
    expect(screen.getByText('排队 3')).toBeInTheDocument();
  });

  it('三类「空」可分：读取中 / 读失败 / 确实没有', () => {
    setQueue([], { isPending: true });
    const { unmount } = renderPanel();
    expect(screen.getByText('正在读取待办…')).toBeInTheDocument();
    expect(screen.queryByText('没有待你拍板的事项')).not.toBeInTheDocument();
    unmount();

    setQueue([], { isError: true });
    const second = renderPanel();
    expect(screen.getByText(/待你拍板的事项读取失败/)).toBeInTheDocument();
    expect(screen.queryByText('没有待你拍板的事项')).not.toBeInTheDocument();
    second.unmount();

    setQueue([]);
    renderPanel();
    expect(screen.getByText('没有待你拍板的事项')).toBeInTheDocument();
  });

  it('分页截断如实报，不假装列表就是全部', () => {
    setQueue([decision({ id: 'acceptance:a1' })], {
      queue: { total: 42, hiddenCount: 41 },
    });
    renderPanel();

    expect(screen.getByText(/另有 41 项未显示/)).toBeInTheDocument();
  });

  it('createdAt 不可解析时等待时长显示破折号', () => {
    setQueue([decision({ id: 'acceptance:a1', title: '时间坏了', createdAt: 'nope' })]);
    renderPanel();

    expect(within(rowOf('时间坏了')).getByText('—')).toBeInTheDocument();
  });

  it('展开就是既有决策卡（同一拍板入口），收起时只有本组件的待办行', () => {
    setQueue([decision({ id: 'acceptance:a1', title: '待验收：登录页' })]);
    renderPanel();

    const row = rowOf('待验收：登录页');
    // 收起态：决策实体标记只来自**本组件的行**（S4 补的就地解释入口），卡壳尚未挂载。
    // 不能再用"该属性存不存在"来判定卡片是否渲染——行本身也带同名属性了。
    expect(
      document.querySelectorAll('[data-ai-entity="decision:acceptance:a1"]'),
    ).toHaveLength(1);
    expect(document.querySelector('[data-decision-urgency]')).toBeNull();

    fireEvent.click(within(row).getByRole('button', { expanded: false }));

    // 展开后多出一处：DecisionCardShell 的容器标记 → 证明复用的是既有卡壳
    // 而非本组件自画的待办行（`data-decision-urgency` 是卡壳独有、行没有的属性）
    expect(
      document.querySelectorAll('[data-ai-entity="decision:acceptance:a1"]'),
    ).toHaveLength(2);
    expect(document.querySelector('[data-decision-urgency]')).not.toBeNull();
  });

  /**
   * 就近解释（S4 / CAP-C-07）：收起状态也要问得上话。
   *
   * 行此前只有 `data-decision-id`，而 AISlot 读的是 `data-ai-entity` 的 `kind:id` ——
   * 因此"看见一条待办但不确定它是什么意思、又不想展开"的那一刻，Ctrl+左键恒无反应。
   * 前缀必须是 `decision:`（决策卡壳的既有约定），不能裸用 `data-decision-id`。
   */
  it('待办行带决策实体标记——收起状态也能就地问（CAP-C-07）', () => {
    setQueue([decision({ id: 'acceptance:a1', title: '待验收：登录页' })]);
    renderPanel();

    const row = rowOf('待验收：登录页');
    expect(row.getAttribute('data-ai-entity')).toBe('decision:acceptance:a1');
    // 与卡壳的约定对齐：同一个 id，同一套前缀，AISlot 只认一种
    expect(row.getAttribute('data-decision-id')).toBe('acceptance:a1');
  });

  it('动作经共用接线转发（本组件不自己 mutate）', () => {
    setQueue([decision({ id: 'acceptance:a1', title: '待验收：登录页' })]);
    renderPanel();

    fireEvent.click(within(rowOf('待验收：登录页')).getByRole('button', { expanded: false }));
    // 决策卡动作栏的「通过」键（acceptance 的 KIND_ACTIONS[0] = decision.action.pass）。
    // 本文件已 import '@/i18n'，故断言**译后**文案而非原始键：
    // jsdom 的 navigator.language 是 en-US，LanguageDetector 解析到 en → "Pass"。
    // 用非锚定正则：动作键尾部还带一个序号角标（`<span>1</span>`），
    // 无障碍名实为 "Pass 1"，与 gate 测试的 `/Pass gate/i` 同一写法。
    fireEvent.click(screen.getByRole('button', { name: /Pass/i }));

    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleAction.mock.calls[0][0]).toBe('accept');
    expect(handleAction.mock.calls[0][1]).toMatchObject({ id: 'acceptance:a1' });
  });
});

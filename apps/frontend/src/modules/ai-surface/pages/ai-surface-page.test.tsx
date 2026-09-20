import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient } from '@/test-utils/providers';
import type { OfficeColleague, OfficeSummary } from '@/modules/office/api/office-api';
import { AiSurfacePage } from './ai-surface-page';
import { normalizeSurfaceEvent, useSurfaceFeedStore } from '../hooks/use-surface-feed';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/theme/theme-context', () => ({
  useTheme: () => ({
    mode: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

// 派发走既有 assistant 执行桥（真实网络），单元测试只验页面自身的接线与本地回显
const mockMutate = vi.hoisted(() => vi.fn());
vi.mock('@/modules/assistant/hooks/use-assistant-dispatch', () => ({
  useDispatchAssistantMessage: () => ({ mutate: mockMutate, isPending: false }),
}));

/**
 * 工位数据源（S2-b）：页面改为消费 office 聚合，测试用可控三态替身驱动
 * 「有同事 / 读取中 / 读失败」三种情形——三者都表现为列表空，必须能区分。
 */
const office = vi.hoisted(() => ({
  state: { data: undefined, isPending: false, isError: false } as {
    data: unknown;
    isPending: boolean;
    isError: boolean;
  },
}));
vi.mock('@/modules/office/hooks/use-office-summary', () => ({
  useOfficeSummary: () => office.state,
}));

/**
 * 六站泳道在页面上只关心「挂载了没有」。它自己要打 6 个端点的取数（其中 4 个
 * MSW 未覆盖，会真发网络请求），由 `pipeline-lane-strip.test.tsx` 用受控数据单独覆盖；
 * 本文件替换成替身，既避免无谓网络，也让断言不被取数细节干扰。
 */
vi.mock('../components/pipeline-lane-strip', async () => {
  // 工厂被提升到 import 之前，此处不用 JSX（避免 jsx runtime 尚未初始化）
  const { createElement } = await import('react');
  return {
    PipelineLaneStrip: () =>
      createElement('div', { 'data-testid': 'pipeline-lane-strip' }),
  };
});

/** 同上分层理由：待办区自打 `/decisions/pending`（MSW 未覆盖），由自身测试用受控数据管 */
vi.mock('../components/decision-queue-panel', async () => {
  const { createElement } = await import('react');
  return {
    DecisionQueuePanel: () =>
      createElement('div', { 'data-testid': 'decision-queue-panel' }),
  };
});

/**
 * 叙述层（S3-e）：页面为了给顶栏总述投喂**同屏事实**，把这两个 hook 提到了页面层。
 * 它们与两个面板用的是同一组 queryKey，故命中同一份缓存、不产生新请求；但单测里
 * 仍须换成受控替身——本文件不验叙述内容（快照/解析/降级各由自身测试覆盖），只验接线。
 */
vi.mock('../hooks/use-pipeline-lanes', () => ({
  usePipelineLanes: () => ({ lanes: [], isPending: false, isError: false }),
}));
vi.mock('../hooks/use-decision-queue', () => ({
  useDecisionQueue: () => ({
    queue: { items: [], total: 0, blocking: 0, advisory: 0, hiddenCount: 0 },
    isPending: false,
    isError: false,
  }),
}));

/** 叙述 hook 替身：状态由用例摆布（真实的取数/TTL/降级逻辑在自身测试里） */
const narrationView = vi.hoisted(() => ({
  value: {
    narration: null as unknown,
    state: 'idle' as string,
    degradedNote: undefined as string | undefined,
    generatedAt: null as number | null,
    usage: undefined as unknown,
    refresh: vi.fn(),
  },
}));
vi.mock('../hooks/use-surface-narration', () => ({
  useSurfaceNarration: () => narrationView.value,
}));

/**
 * 实时通道（S2-a）：面级订阅在本页挂载，用可控的假客户端驱动连接/断开，
 * 以便断言验收②的两半——「断线有明确离线态」与「重连后快照对齐」。
 */
const listeners = vi.hoisted(() => new Map<string, Set<(payload: unknown) => void>>());
vi.mock('@/infrastructure/event-client', () => ({
  eventClient: {
    isConnected: () => false,
    connect: () => undefined,
    on: (event: string, handler: (payload: unknown) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(handler);
    },
    off: (event: string, handler: (payload: unknown) => void) => {
      listeners.get(event)?.delete(handler);
    },
  },
}));

const fireEventFromSocket = (event: string, payload?: unknown) => {
  act(() => {
    listeners.get(event)?.forEach((handler) => handler(payload));
  });
};

function colleague(overrides: Partial<OfficeColleague> = {}): OfficeColleague {
  return {
    memberId: 'ai-1',
    displayName: '小码',
    title: '全栈工程师',
    trustScore: 88,
    status: 'working',
    blocking: 1,
    advisory: 2,
    capacity: {
      activeRuns: 1,
      capacityLimit: 5,
      loadPct: 20,
      weeklyTokens: 42000,
      weeklyCostUsd: 3.5,
      acceptability: 'available',
    },
    currentRun: {
      id: 'run-1',
      goal: '实现办公室接口',
      status: 'in_progress',
      taskTitle: '办公室聚合端点',
    },
    ...overrides,
  };
}

const setOffice = (colleagues: OfficeColleague[]) => {
  office.state = {
    data: { colleagues, totals: { colleagues: colleagues.length } } as unknown as OfficeSummary,
    isPending: false,
    isError: false,
  };
};

const pushEvent = (eventName: string, payload: unknown, at = Date.now()) => {
  const item = normalizeSurfaceEvent(eventName, payload, at);
  if (item) act(() => useSurfaceFeedStore.getState().push(item));
};

const renderSurface = (client = createTestQueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AiSurfacePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** 摆布叙述 hook 替身的状态（默认无内容 → 顶栏不占位） */
const setNarration = (over: Partial<typeof narrationView.value>) => {
  narrationView.value = {
    narration: null,
    state: 'idle',
    degradedNote: undefined,
    generatedAt: null,
    usage: undefined,
    refresh: vi.fn(),
    ...over,
  };
};

describe('AiSurfacePage', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    listeners.clear();
    setNarration({});
    office.state = { data: undefined, isPending: false, isError: false };
    act(() => {
      useSurfaceFeedStore.getState().reset();
      useSurfaceFeedStore.getState().setConnected(false);
    });
  });

  it('渲染表面标头与交互坞', () => {
    setOffice([colleague()]);
    renderSurface();

    expect(screen.getByText('APM SYNTHETIC COGNITIVE SURFACE')).toBeInTheDocument();
    expect(screen.getByText('DUAL-SURFACE V4')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/输入协同指令/)).toBeInTheDocument();
  });

  it('★ 盯盘面给出回放入口（S5）：入口本身说明它不依赖 runtime 与 API key', () => {
    renderSurface();

    const entry = document.querySelector('[data-ai-action="ai-surface.replay.enter"]');
    expect(entry).not.toBeNull();
    // 悬停文案就是这条入口存在的理由——没有 runtime / 没有 key 的机器上，它是唯一能看的东西
    expect(entry?.getAttribute('title')).toMatch(/不需要 runtime/);
    expect(entry?.getAttribute('title')).toMatch(/不需要 API key/);
  });

  it('工位卡显示真实同事状态与本周用量（原为写死的假名）', () => {
    setOffice([colleague()]);
    renderSurface();

    expect(screen.getByText('小码')).toBeInTheDocument();
    expect(screen.getByText('全栈工程师')).toBeInTheDocument();
    expect(screen.getByText('办公室聚合端点')).toBeInTheDocument();
    expect(screen.getByText(/本周 42\.0k tokens · \$3\.50/)).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();

    // 原实现里那四位假同事不得再出现
    expect(screen.queryByText('Aria')).not.toBeInTheDocument();
    expect(screen.queryByText('Nexus')).not.toBeInTheDocument();
    expect(screen.queryByText('Sentinel')).not.toBeInTheDocument();
  });

  it('接真核心：运行时进展事件按 run.id 落到对应工位卡', () => {
    setOffice([colleague()]);
    renderSurface();

    // 无事件时明说没有，不推测跑到哪一步
    expect(screen.getByText('已派发，暂无进展事件')).toBeInTheDocument();

    pushEvent(
      'runtime.execution.event',
      { executionRunId: 'run-1', eventType: 'progress', summary: '正在写入 12 个文件' },
    );

    expect(screen.getByText('正在写入 12 个文件')).toBeInTheDocument();
    expect(screen.queryByText('已派发，暂无进展事件')).not.toBeInTheDocument();
  });

  it('信度分缺失时显示破折号——不落回写死高分', () => {
    setOffice([colleague({ trustScore: undefined })]);
    renderSurface();

    // 必须**定位到工位卡内**断言：泳道也会渲染破折号（无口径处），全页 getByText 会命中多个
    const card = document.querySelector('[data-ai-component="ai-surface.station-card"]');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText('—')).toBeInTheDocument();
    expect(within(card as HTMLElement).queryByText('98.2%')).not.toBeInTheDocument();
  });

  it('六站管道泳道挂载在页面上（内容由泳道自身测试覆盖）', () => {
    setOffice([colleague()]);
    renderSurface();

    expect(screen.getByTestId('pipeline-lane-strip')).toBeInTheDocument();
  });

  it('「该你了」待办区挂载在页面上（内容由待办区自身测试覆盖）', () => {
    setOffice([colleague()]);
    renderSurface();

    expect(screen.getByTestId('decision-queue-panel')).toBeInTheDocument();
  });

  it('顶栏一句话总述挂在态势带**上方**（S3-e，§3.1 顶栏）', () => {
    setOffice([colleague()]);
    setNarration({
      state: 'ready',
      generatedAt: Date.now(),
      narration: {
        headline: '一切正常，小周在写登录页',
        highlights: [],
        blockers: [],
        needsYou: [],
        honestGaps: [],
        source: 'ai',
      },
    });
    renderSurface();

    const bar = document.querySelector('[data-ai-component="ai-surface.narration"]');
    const strip = screen.getByTestId('pipeline-lane-strip');
    expect(bar).not.toBeNull();
    expect(screen.getByText('一切正常，小周在写登录页')).toBeInTheDocument();
    // 位置即语义：它是"先看这一句"的总述，必须排在六站/待办之上
    expect(
      (bar as Element).compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('无事实可讲时顶栏整块不占位——不说"暂无"填坑', () => {
    setOffice([colleague()]);
    renderSurface();

    expect(
      document.querySelector('[data-ai-component="ai-surface.narration"]'),
    ).toBeNull();
  });

  it('★ 降级必须看得出来：顶栏就地标注「规则生成的摘要」（S3-e / §3.3 约束③）', () => {
    setOffice([colleague()]);
    setNarration({
      state: 'degraded',
      generatedAt: Date.now(),
      degradedNote: 'AI 服务暂时不可用，以下为规则生成的摘要',
      narration: {
        headline: '1 位 AI 同事在干活，暂时没有等你拍板的事。',
        highlights: [],
        blockers: [],
        needsYou: [],
        honestGaps: [],
        source: 'template',
      },
    });
    renderSurface();

    // 降级不等于白屏：句子照给；但绝不能长得像 AI 的判断
    expect(
      screen.getByText('1 位 AI 同事在干活，暂时没有等你拍板的事。'),
    ).toBeInTheDocument();
    expect(screen.getByText('规则生成的摘要')).toBeInTheDocument();
    expect(screen.queryByText('AI 读盘')).not.toBeInTheDocument();
  });

  it('编造遥测一律不得复活：表盘上下两条 HUD 与右侧信度列的数字全部清零（S2-c / S2-e）', () => {
    setOffice([colleague()]);
    renderSurface();

    // 这一串服务端一条都对不上，却都长得像实时遥测——本用例把它们钉死。
    // ① 表盘**上方**那块 HUD（S2-c 删除）
    expect(screen.queryByText('AUTONOMOUS RUNNING')).not.toBeInTheDocument();
    expect(screen.queryByText(/142\.6/)).not.toBeInTheDocument();
    expect(screen.queryByText(/突触延迟/)).not.toBeInTheDocument();
    expect(screen.queryByText(/神经网络同频/)).not.toBeInTheDocument();
    // ② 表盘**内部**上下两条常驻 HUD（S2-e 删除）
    expect(screen.queryByText('96.4% 活力')).not.toBeInTheDocument();
    expect(screen.queryByText('LEVEL 3 准自主')).not.toBeInTheDocument();
    expect(screen.queryByText('OPENAPI ZERO-DRIFT')).not.toBeInTheDocument();
    expect(screen.queryByText('4/5 准则闭环')).not.toBeInTheDocument();
    // ③ 右侧信度列编造的四个百分比（S2-e 清零）
    expect(screen.queryByText('99.2%')).not.toBeInTheDocument();
    expect(screen.queryByText('94.5%')).not.toBeInTheDocument();
    expect(screen.queryByText('97.0%')).not.toBeInTheDocument();
    expect(screen.queryByText('92.8%')).not.toBeInTheDocument();
    // ④ 表盘里那个假成功的「准入」按钮（点击只改本地 state 显示「已准入」）
    expect(screen.queryByRole('button', { name: /准入/ })).not.toBeInTheDocument();
  });

  it('没有同事时不补假人，显式说明当前项目下没有同事', () => {
    setOffice([]);
    renderSurface();

    expect(screen.getByText('暂无可显示的工位')).toBeInTheDocument();
  });

  it('读取中与读失败必须与"真的没人"区分开', () => {
    office.state = { data: undefined, isPending: true, isError: false };
    const { unmount } = renderSurface();
    expect(screen.getByText('正在读取同事状态…')).toBeInTheDocument();
    unmount();

    office.state = { data: undefined, isPending: false, isError: true };
    renderSurface();
    expect(screen.getByText('同事状态读取失败')).toBeInTheDocument();
    expect(screen.queryByText('暂无可显示的工位')).not.toBeInTheDocument();
  });

  it('allows typing and sending message through omni dock', () => {
    setOffice([colleague()]);
    renderSurface();

    const input = screen.getByPlaceholderText(/输入协同指令/);
    fireEvent.change(input, { target: { value: '请对齐 CAP-P-01 契约' } });
    expect(input).toHaveValue('请对齐 CAP-P-01 契约');

    const form = input.closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    // 验证人类发送的消息出现在认知流中。
    // 用子串匹配而非全等：回显的是**发出内容**（含模型标记），见下方同源用例。
    expect(screen.getByText(/请对齐 CAP-P-01 契约/)).toBeInTheDocument();
    expect(screen.getByText('人类指挥官 (You)')).toBeInTheDocument();
  });

  /**
   * 代理态收敛（S4 / ARCH-AISURFACE-001 §3.2）：**回显 === 发送**。
   *
   * 组装只调一次 `composeSurfaceDispatch`，回显与派发共用同一份字符串——
   * 用户看到的字面就是 AI 收到的字面。对新手而言，气泡里藏着一份"给机器看的"
   * 变体、屏幕上是另一份，是最容易失去信任的那种差异，故把它钉在测试里。
   */
  it('★ 回显与派发同源：气泡里显示的文本就是交给 AI 的文本', () => {
    setOffice([colleague()]);
    renderSurface();

    const input = screen.getByPlaceholderText(/输入协同指令/);
    fireEvent.change(input, { target: { value: '查一下门禁' } });
    const form = input.closest('form');
    if (form) fireEvent.submit(form);

    const sent = mockMutate.mock.calls[0][0] as string;
    const bubble = screen.getByText(/查一下门禁/);
    expect(bubble.textContent).toBe(sent);
  });

  /**
   * 代理态收敛（S4）：徽章承诺的事必须真的发生。
   *
   * 原文案「定向协同: @小码」承诺了两件都没发生的事——消息既没有定向给小码
   * （`dispatch(content, projectId)` 不指定执行者），小码的状态当时也根本没进
   * 派发内容（AI 不知道"它"是谁）。现在只承诺做到的那一件：**附带上下文**，
   * 且必须能在派发内容里找到证据。
   */
  it('★ 选中同事后派发真的带上了它的状态——徽章不再是一句空话（S4）', () => {
    setOffice([colleague()]);
    renderSurface();

    // 未选中：如实说"不带上下文"，且不出现旧文案
    expect(screen.getByText('未选中同事 · 发送不带上下文')).toBeInTheDocument();
    expect(screen.queryByText(/定向协同/)).not.toBeInTheDocument();

    const card = document.querySelector('[data-ai-component="ai-surface.station-card"]');
    expect(card).not.toBeNull();
    fireEvent.click(card as HTMLElement);

    // 选中后：措辞换成"附带上下文"，且只声称附带、不声称定向
    expect(screen.getByText(/附带上下文: @小码/)).toBeInTheDocument();
    expect(screen.queryByText(/定向协同/)).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText(/输入协同指令/);
    fireEvent.change(input, { target: { value: '它为什么卡住了？' } });
    const form = input.closest('form');
    if (form) fireEvent.submit(form);

    // 徽章说的话在派发内容里有据可查：身份 + 在做哪张单 + 执行状态
    const sent = mockMutate.mock.calls[0][0] as string;
    expect(sent).toContain('它为什么卡住了？');
    expect(sent).toContain('[盯盘上下文');
    expect(sent).toContain('小码');
    expect(sent).toContain('memberId: ai-1');
    expect(sent).toContain('办公室聚合端点');
  });

  /**
   * 就近解释（CAP-C-07）：AISlot 靠 DOM 上的 `kind:id` 找目标。
   *
   * 本面此前**一个 data-ai-entity 都没有**，Ctrl+左键的 `closest()` 恒返回 null →
   * 静默无反应（看着像功能没做，其实是没接）。这里守的是"结构可达"：
   * `member` 已在 card-explain 支持清单内，属性在即链路通。
   */
  it('工位卡带可解释实体标记——AISlot 在本面才可能命中（CAP-C-07）', () => {
    setOffice([colleague()]);
    renderSurface();

    const card = document.querySelector('[data-ai-component="ai-surface.station-card"]');
    expect(card?.getAttribute('data-ai-entity')).toBe('member:ai-1');
  });

  /**
   * ARCH-AISURFACE-001 §1.1 错位一：原来此处由 setTimeout 伪造 AI 回复 + 自动上涨
   * 信任分。本用例把治理不变量钉在测试里——发送必须落到真实派发，且**不得**再出现
   * 任何伪造的助手回复。
   */
  it('派发走真实执行桥，且不伪造 AI 回复', () => {
    setOffice([colleague()]);
    renderSurface();

    const input = screen.getByPlaceholderText(/输入协同指令/);
    fireEvent.change(input, { target: { value: '检查验收门禁' } });
    const form = input.closest('form');
    if (form) fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toContain('检查验收门禁');

    // 伪造回复的原文（旧实现 setTimeout 注入）不得再出现
    expect(screen.queryByText(/已调用模型.*进行全局依赖图遍历/)).not.toBeInTheDocument();
  });

  it('页头不再挂「示例」徽标——示例改为在区域旁就地标注（S2-e）', () => {
    setOffice([colleague()]);
    renderSurface();

    // S2-b 起页头徽标已收窄到「部分区域示例」，但收窄治不了**位置**：徽标在页头、
    // 示例内容在屏幕中段的表盘里，读者看到那些条目时徽标早已不在视野内——标注了≈没标。
    // 现在改为就地标注（SampleTag 长在示例区域标题旁），页头这枚随之摘除。
    expect(screen.queryByText('部分区域示例')).not.toBeInTheDocument();
    expect(screen.queryByText('示例数据')).not.toBeInTheDocument();
    // 就地标注确实存在（表盘标题栏 + 记忆原子卡）
    expect(
      document.querySelectorAll('[data-ai-component="ai-surface.sample-tag"]').length,
    ).toBeGreaterThan(0);
  });

  it('挂载面级订阅：治理族事件到达即进投影层（此前订阅从未被挂载）', () => {
    setOffice([colleague()]);
    renderSurface();

    // 订阅清单必须包含治理族的执行事件（S1-g 网关转发的那批）
    expect(listeners.has('execution.run.created')).toBe(true);
    expect(listeners.has('approval.request.created')).toBe(true);
    expect(listeners.has('runtime.dispatch.changed')).toBe(true);
  });

  it('未连接时显式标注离线，不写死「ACTIVE」', () => {
    setOffice([colleague()]);
    renderSurface();

    expect(screen.getByText('实时已断开')).toBeInTheDocument();
  });

  it('重连后对齐快照：触发一次全量重取', () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    setOffice([colleague()]);
    renderSurface(client);

    // 首挂载即为「未连接」：不触发重取（没有"断线期间的空窗"要补）
    expect(invalidateSpy).not.toHaveBeenCalled();

    // 断线 → 重连：断线期间只存在于事件流里的变化必须靠重取快照拉回
    fireEventFromSocket('connected');

    expect(screen.getByText('实时')).toBeInTheDocument();
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

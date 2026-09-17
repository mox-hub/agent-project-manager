import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AiSurfaceReplayPage } from './ai-surface-replay-page';

/**
 * 回放页的门禁（ARCH-AISURFACE-001 §五 S5 验收）。
 *
 * ## 验收①：无 runtime、无 API key 的环境完整放完
 *
 * 这一条的**证明方式**是"全程零网络"——不是"网络失败了还能降级"。故本文件第一条用例
 * 直接盯 `fetch`：只要回放页碰一次网络，它就可能在没 runtime 的机器上卡住或变样。
 *
 * ## 验收②：暂停 / 步进 / 跳站可用
 *
 * ## 另外三条是本页自己的纪律（画错一条，演示就开始说假话）
 *
 * - **不假装实时**：不挂实时连接徽标，页头挂「回放」；
 * - **不假装能发消息**：不挂输入坞（发出去没人接比没有输入框更糟）；
 * - **不假装能拍板**：决策卡只读（剧本里的 id 在服务端不存在）。
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/theme/theme-context', () => ({
  useTheme: () => ({ mode: 'dark', toggleTheme: vi.fn() }),
}));

/** 回放页**不该**连任何实时通道；这条替身一旦被调用就说明这条纪律被破了 */
const eventClientConnect = vi.hoisted(() => vi.fn());
vi.mock('@/infrastructure/event-client', () => ({
  eventClient: {
    isConnected: () => false,
    connect: eventClientConnect,
    on: () => undefined,
    off: () => undefined,
  },
}));

/**
 * 两个"只有在被挂载时才会露面"的替身。
 *
 * 回放页的两条纪律（不假装实时、不假装能发消息）本质上是**"某组件根本没被挂载"**，
 * 而"没出现"最容易被后来的改动悄悄破坏——把组件替换成有标记的替身，
 * 谁把它们加回来，这里就立刻红。
 */
vi.mock('../components/surface-liveness', () => ({
  SurfaceLiveness: () => <div data-testid="liveness" />,
}));
vi.mock('../components/omni-dock', () => ({
  OmniDock: () => <div data-testid="omni-dock" />,
}));

/** 推进回放时钟（100ms 一拍，与 REPLAY_TICK_MS 同源口径） */
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AiSurfaceReplayPage />
    </MemoryRouter>,
  );

/** 当前帧标题所在的那条（控制条里唯一暴露"现在演到哪一幕"的地方） */
const frameTitle = () => document.querySelector('[data-ai-component="ai-surface.replay.frame-title"]');

describe('AiSurfaceReplayPage · 验收①：全新环境完整放完', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    eventClientConnect.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('★ 全程零网络、零实时连接——不是"降级兜住"，是根本不依赖', () => {
    renderPage();
    // 放到末帧之后（剧本 100s + 收尾停留）
    advance(120_000);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(eventClientConnect).not.toHaveBeenCalled();
  });

  it('★ 放完不白屏：末帧仍渲染完整（页头/泳道/待办/工位都在）', () => {
    renderPage();
    advance(120_000);
    expect(screen.getByText('从一句话需求到交付')).toBeTruthy();
    expect(document.querySelector('[data-ai-component="ai-surface.pipeline-lane-strip"]')).not.toBeNull();
    expect(document.querySelector('[data-ai-component="ai-surface.decision-queue"]')).not.toBeNull();
    expect(document.querySelector('[data-ai-component="ai-surface.replay-controls"]')).not.toBeNull();
  });

  it('★ 每一帧都真的在演：帧标题随时间轴变化，不是一叠静态截图', () => {
    renderPage();
    const first = frameTitle()?.textContent;
    advance(18_000);
    const later = frameTitle()?.textContent;
    expect(later).not.toBe(first);
    expect(later).toMatch(/派给了小码/);
  });

  it('★ 降级帧照样放得下去（AI 读盘挂了，盯盘不白屏这条承诺演示里要真成立）', () => {
    renderPage();
    // 跳到第 05 站（验收）再步进一帧 = 全片唯一那帧降级
    fireEvent.click(screen.getByText('05 质量验收'));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByText('下一步'));
    expect(document.querySelector('[data-narration-source="template"]')).not.toBeNull();
    expect(screen.getByText(/规则拼出来的/)).toBeTruthy();
    // 读盘失败不等于待办消失——那一帧的待办仍要在队列里
    expect(screen.getByText('待验收：报销单支持一键导出 Excel')).toBeTruthy();
  });
});

describe('AiSurfaceReplayPage · 验收②：暂停 / 步进 / 跳站', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('暂停后时间轴不再前进', () => {
    renderPage();
    advance(8_000);
    fireEvent.click(screen.getByText('暂停'));
    const frozen = frameTitle()?.textContent;
    advance(20_000);
    expect(frameTitle()?.textContent).toBe(frozen);
  });

  it('★ 步进自动暂停：手动定位时时间轴不许继续吃掉你想看的那一帧', () => {
    renderPage();
    expect(screen.getByText('暂停')).toBeTruthy(); // 进页即在播
    fireEvent.click(screen.getByText('下一步'));
    expect(screen.getByText('播放')).toBeTruthy();
    expect(frameTitle()?.textContent).toMatch(/小规把它拆成 3 张工单/);
  });

  it('上一步退回前一帧', () => {
    renderPage();
    fireEvent.click(screen.getByText('下一步'));
    fireEvent.click(screen.getByText('下一步'));
    fireEvent.click(screen.getByText('上一步'));
    expect(frameTitle()?.textContent).toMatch(/小规把它拆成 3 张工单/);
  });

  it('★ 跳站落到该站的第一帧', () => {
    renderPage();
    fireEvent.click(screen.getByText('06 发版交付'));
    expect(frameTitle()?.textContent).toMatch(/你点了通过/);
  });

  it('★ 六个站都列出来且都能跳（跳站本身就是演示要传达的骨架）', () => {
    renderPage();
    for (const label of [
      '01 需求承接',
      '02 任务',
      '03 仓库',
      '04 执行记录',
      '05 质量验收',
      '06 发版交付',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('重头放：回到第一帧', () => {
    renderPage();
    fireEvent.click(screen.getByText('06 发版交付'));
    fireEvent.click(screen.getByText('重头放'));
    expect(frameTitle()?.textContent).toMatch(/销售同事丢来一句话/);
  });

  it('进度条是只读的展示（刻意不做拖拽：拖到的像素落不到帧上）', () => {
    renderPage();
    advance(10_000);
    const bar = screen.getByRole('progressbar', { name: '回放进度' });
    expect(bar.getAttribute('aria-valuenow')).toBe('10000');
    expect(bar.getAttribute('aria-valuemax')).toBe('103000');
  });
});

describe('AiSurfaceReplayPage · 与实况同源（同一批组件）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('★ 泳道与待办区用的就是实况那两个组件（不是"照着它另画的一块"）', () => {
    renderPage();
    // 与 ai-surface-page 同一组 DOM 契约属性——演示给新手看的，必须就是真项目里那一块
    expect(document.querySelector('[data-ai-component="ai-surface.pipeline-lane-strip"]')).not.toBeNull();
    expect(document.querySelector('[data-ai-component="ai-surface.decision-queue"]')).not.toBeNull();
    expect(document.querySelector('[data-ai-component="ai-surface.narration"]')).not.toBeNull();
  });

  it('★ 每一格数字的溯源都写着"回放"，不沿用实况端点名', () => {
    renderPage();
    advance(20_000);
    const lanes = document.querySelectorAll('[data-ai-component="ai-surface.pipeline-lane-strip"] button');
    expect(lanes.length).toBeGreaterThan(0);
    for (const lane of Array.from(lanes)) {
      const title = lane.getAttribute('title') ?? '';
      expect(title).toMatch(/回放剧本/);
      expect(title).not.toMatch(/GET |POST /);
    }
  });

  it('★ 六站计数来自剧本那一帧（不是 0 兜底、也不是上一帧遗留）', () => {
    renderPage();
    // 跳到 02 站：任务 3 张、执行 1 条、需求承接 1 份
    fireEvent.click(screen.getByText('02 任务'));
    const strip = screen.getByRole('region', { name: '六站管道泳道' });
    expect(within(strip).getByText('3')).toBeTruthy();
    expect(within(strip).getAllByText('1').length).toBeGreaterThanOrEqual(2);
  });
});

describe('AiSurfaceReplayPage · 不假装（三条纪律）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('★ 页头挂「回放」而不是实时连接徽标', () => {
    renderPage();
    expect(screen.getByText('回放')).toBeTruthy();
    // 回放没有连接可言：显示"实时已断开"是如实但不相关的噪音，显示"实时"是假话
    expect(screen.queryByTestId('liveness')).toBeNull();
  });

  it('★ 不挂输入坞：没有输入框，也没有发送键（发出去没人接比没有输入框更糟）', () => {
    renderPage();
    expect(screen.queryByTestId('omni-dock')).toBeNull();
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.querySelector('input')).toBeNull();
  });

  it('★ 决策卡只读：展开后没有动作键，原位写明为什么不能拍', () => {
    renderPage();
    advance(60_000);
    const row = document.querySelector('[data-ai-component="ai-surface.decision-row"]');
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getByRole('button', { expanded: false }));

    // 写路径整条不出现——不是"键在但灰掉"（那是"按了没反应"，比没有更坏）
    expect(row?.querySelector('[data-decision-actions]')).toBeNull();
    // 原位写明为什么不能按，以及真拍板该去哪
    expect(within(row as HTMLElement).getByText(/这里不能拍板/)).toBeTruthy();
  });

  it('★ 待办等待时长按剧本时钟算，不是墙上时间', () => {
    renderPage();
    // 剧本里那条待办 58s 出现、我们停在 60s → 剧本时钟上是 2 秒前
    advance(60_000);
    const row = document.querySelector('[data-ai-component="ai-surface.decision-row"]');
    const stamp = within(row as HTMLElement).getByTitle(/创建于/);
    // 用墙上时间会显示"等了 N 天"（剧本时刻是 2026-09-10）——一个精确且与本屏每处都矛盾的读数
    expect(stamp.textContent).toBe('刚刚');
  });

  it('★ 页脚给出明确出口，并说明真实数字在盯盘面', () => {
    renderPage();
    expect(screen.getByText(/回到盯盘面/)).toBeTruthy();
  });

  it('开篇就说清楚这是回放（不能让人误当实时）', () => {
    renderPage();
    const about = document.querySelector('[data-ai-component="ai-surface.replay.about"]');
    expect(about?.textContent).toMatch(/回放/);
    expect(about?.textContent).toMatch(/不需要连执行节点/);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScreenplayControls, formatReplayClock } from './screenplay-controls';

/**
 * 控制条的**契约**部分（交互本身由 `ai-surface-replay-page.test.tsx` 端到端覆盖）。
 * 这里管两件容易写错、且错了不明显的事：时长文案与按钮的可用边界。
 */

const player = (over: Record<string, unknown> = {}) => ({
  index: 0,
  frameCount: 5,
  playing: false,
  elapsedMs: 0,
  totalMs: 30_000,
  atEnd: false,
  toggle: vi.fn(),
  stepForward: vi.fn(),
  stepBack: vi.fn(),
  jumpToStage: vi.fn(),
  restart: vi.fn(),
  ...over,
});

const renderControls = (over: Record<string, unknown> = {}) =>
  render(
    <ScreenplayControls
      player={player(over) as never}
      currentStageNumber="01"
      frameTitle="一句话需求"
    />,
  );

describe('formatReplayClock', () => {
  it('1 分钟以内给秒', () => {
    expect(formatReplayClock(0)).toBe('0 秒');
    expect(formatReplayClock(9_400)).toBe('9 秒');
    expect(formatReplayClock(59_400)).toBe('59 秒');
  });

  it('四舍五入到 60 秒就换成分（不写「60 秒」）', () => {
    expect(formatReplayClock(59_600)).toBe('1 分');
  });

  it('★ 1 分钟以上给「分 + 秒」：90 秒远不如「1 分 30 秒」好懂', () => {
    expect(formatReplayClock(90_000)).toBe('1 分 30 秒');
    expect(formatReplayClock(103_000)).toBe('1 分 43 秒');
  });

  it('整分钟不写「0 秒」', () => {
    expect(formatReplayClock(120_000)).toBe('2 分');
  });

  it('负数按 0 处理（时间轴不会倒退，但格式化不该产出「-1 秒」）', () => {
    expect(formatReplayClock(-5_000)).toBe('0 秒');
  });
});

describe('ScreenplayControls', () => {
  it('播放/暂停是同一个键，文案随状态切换', () => {
    const { unmount } = renderControls({ playing: true });
    expect(screen.getByText('暂停')).toBeTruthy();
    unmount();

    renderControls({ playing: false });
    expect(screen.getByText('播放')).toBeTruthy();
  });

  it('停在末帧时那个键说明是「重播」（不写"播放"，播下去不会动）', () => {
    renderControls({ playing: false, atEnd: true });
    expect(screen.getByText('重播')).toBeTruthy();
  });

  it('★ 首帧的「上一步」、末帧的「下一步」置灰——越界的键不该看起来能用', () => {
    const { unmount } = render(
      <ScreenplayControls
        player={player({ index: 0, atEnd: false }) as never}
        currentStageNumber="01"
        frameTitle="x"
      />,
    );
    expect((screen.getByText('上一步').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('下一步').closest('button') as HTMLButtonElement).disabled).toBe(false);
    unmount();

    render(
      <ScreenplayControls
        player={player({ index: 4, atEnd: true }) as never}
        currentStageNumber="06"
        frameTitle="x"
      />,
    );
    expect((screen.getByText('下一步').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('六个跳站键都渲染，当前站高亮（且跳的是站编号，不是下标）', () => {
    const jumpToStage = vi.fn();
    renderControls({ jumpToStage });
    expect(screen.getAllByText(/^0[1-6] /)).toHaveLength(6);
    fireEvent.click(screen.getByText('03 仓库'));
    expect(jumpToStage).toHaveBeenCalledWith('03');
  });

  it('帧计数从 1 起算（「第 1/5 帧」，不从 0）', () => {
    renderControls({ index: 0, frameCount: 5 });
    expect(screen.getByText(/第 1\/5 帧/)).toBeTruthy();
  });

  it('进度条只读：给的是 aria 语义而非可拖拽控件', () => {
    renderControls({ elapsedMs: 15_000, totalMs: 30_000 });
    const bar = screen.getByRole('progressbar', { name: '回放进度' });
    expect(bar.getAttribute('aria-valuenow')).toBe('15000');
    expect(bar.tagName).toBe('DIV');
  });

  it('总时长为 0 时进度不除零（不产出 NaN 宽度）', () => {
    renderControls({ totalMs: 0, elapsedMs: 0 });
    const bar = screen.getByRole('progressbar', { name: '回放进度' });
    expect(bar.getAttribute('aria-valuemax')).toBe('0');
  });
});

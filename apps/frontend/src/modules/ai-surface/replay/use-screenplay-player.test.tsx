import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ScreenplayFrame } from './screenplay-format';
import { REPLAY_TICK_MS, useScreenplayPlayer } from './use-screenplay-player';

const frame = (atMs: number, stageNumber: string): ScreenplayFrame =>
  ({ atMs, stageNumber, title: `帧 ${atMs}` }) as ScreenplayFrame;

/** 三帧：0 / 10s / 20s；总时长 20s + 3s 收尾停留 */
const frames = [frame(0, '01'), frame(10_000, '02'), frame(20_000, '03')];

/** 用假定时器推进回放时钟；每一拍都是 interval 的一次触发 */
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('useScreenplayPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('默认不自动播放（演示页自己决定何时开始），首帧即当前帧', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    expect(result.current.playing).toBe(false);
    expect(result.current.frame?.atMs).toBe(0);
    expect(result.current.index).toBe(0);
    expect(result.current.totalMs).toBe(20_000 + 3_000);
    expect(result.current.atEnd).toBe(false);
  });

  it('播放推进时间轴，帧随 atMs 锚点切换', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => result.current.play());
    advance(REPLAY_TICK_MS);
    expect(result.current.elapsedMs).toBe(REPLAY_TICK_MS);

    advance(10_000 - REPLAY_TICK_MS);
    expect(result.current.elapsedMs).toBe(10_000);
    expect(result.current.index).toBe(1);
  });

  it('暂停后时间轴不再前进', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => result.current.play());
    advance(REPLAY_TICK_MS);
    act(() => result.current.pause());
    const frozen = result.current.elapsedMs;
    advance(5_000);
    expect(result.current.elapsedMs).toBe(frozen);
  });

  it('★ 到末帧自动停：走完不等于回到开头，也不至于永远空转', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => result.current.play());
    advance(20_000 + 3_000 + REPLAY_TICK_MS * 3);
    expect(result.current.playing).toBe(false);
    expect(result.current.atEnd).toBe(true);
    expect(result.current.elapsedMs).toBe(result.current.totalMs);
  });

  it('★ 走完之后按播放键是「重播」而不是一次没反应的点击', () => {
    // 时间轴已到底时只翻转"想播"的意图，播放键看起来就是坏的（按了没反应）
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => result.current.play());
    advance(20_000 + 3_000 + REPLAY_TICK_MS * 3);
    act(() => result.current.toggle());
    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it('★ 末帧的收尾停留里时间轴还在走（那是"停留"，不是"停下"）', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: true }));
    // 走过末帧锚点（20s）但还没走完收尾停留（+3s）
    advance(21_000);
    expect(result.current.atEnd).toBe(true);
    expect(result.current.playing).toBe(true);
    // 这期间按下去应当是"暂停"，不是"重播"
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
    expect(result.current.elapsedMs).toBe(21_000);
  });

  it('★ 步进会自动暂停——手动定位时时间轴不能继续吃掉你想看的那一帧', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: true }));
    expect(result.current.playing).toBe(true);
    act(() => result.current.stepForward());
    expect(result.current.playing).toBe(false);
    expect(result.current.index).toBe(1);
  });

  it('★ 连点两下下一步前进两帧（函数式更新，不吃闭包里的旧时刻）', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => {
      result.current.stepForward();
      result.current.stepForward();
    });
    expect(result.current.index).toBe(2);
  });

  it('末帧再点下一步不动（不越界），首帧点上一步不动', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => result.current.stepBack());
    expect(result.current.index).toBe(0);

    act(() => {
      result.current.stepForward();
      result.current.stepForward();
      result.current.stepForward();
    });
    expect(result.current.index).toBe(2);
  });

  it('跳站落到该站的第一帧，并自动暂停', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: true }));
    let landed: number | null = null;
    act(() => {
      landed = result.current.jumpToStage('02');
    });
    expect(landed).toBe(1);
    expect(result.current.index).toBe(1);
    expect(result.current.playing).toBe(false);
  });

  it('★ 跳一个剧本里没有的站：返回 null 且时间轴原地不动（不悄悄回到开头）', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => result.current.stepForward());
    const before = result.current.elapsedMs;
    let landed: number | null = -1;
    act(() => {
      landed = result.current.jumpToStage('99');
    });
    expect(landed).toBeNull();
    expect(result.current.elapsedMs).toBe(before);
  });

  it('重头放：回到 0 并开始播', () => {
    const { result } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => {
      result.current.stepForward();
      result.current.stepForward();
    });
    act(() => result.current.restart());
    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it('空帧表不抛异常：frame 为 null，总时长 0', () => {
    const { result } = renderHook(() => useScreenplayPlayer([], { autoPlay: false }));
    expect(result.current.frame).toBeNull();
    expect(result.current.totalMs).toBe(0);
    act(() => result.current.stepForward());
    expect(result.current.frame).toBeNull();
  });

  it('★ 尊重「减少动态效果」：默认不自动播放', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useScreenplayPlayer(frames));
    expect(result.current.playing).toBe(false);

    window.matchMedia = original;
  });

  it('卸载后停止推进（定时器被清掉，不留后台空转）', () => {
    const { result, unmount } = renderHook(() => useScreenplayPlayer(frames, { autoPlay: false }));
    act(() => result.current.play());
    advance(REPLAY_TICK_MS);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

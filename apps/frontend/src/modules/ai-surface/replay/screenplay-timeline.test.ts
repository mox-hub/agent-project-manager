import { describe, expect, it } from 'vitest';
import type { ScreenplayFrame } from './screenplay-format';
import {
  SCREENPLAY_END_HOLD_MS,
  firstFrameIndexOfStage,
  frameAtMs,
  frameIndexAt,
  screenplayTotalMs,
} from './screenplay-timeline';

/** 只给时间轴真正读的字段——其余字段与时间轴无关，填了反而掩盖"时间轴依赖了什么" */
const frames = [0, 10_000, 20_000, 20_000, 30_000].map(
  (atMs, i) =>
    ({
      atMs,
      stageNumber: ['01', '01', '02', '03', '03'][i],
      title: `第 ${i} 帧`,
    }) as ScreenplayFrame,
);

describe('frameIndexAt', () => {
  it('首帧之前（含 0）显示第一帧：还没开播与正在播第一帧是同一件事', () => {
    expect(frameIndexAt(frames, 0)).toBe(0);
    expect(frameIndexAt(frames, -1)).toBe(0);
  });

  it('取最后一个 atMs <= elapsedMs 的帧：atMs 是开演时刻，不是时长', () => {
    // ★ 这是本模块最容易写错的一条：把 atMs 当时长会让每一幕都短一截
    expect(frameIndexAt(frames, 9_999)).toBe(0);
    expect(frameIndexAt(frames, 10_000)).toBe(1);
    expect(frameIndexAt(frames, 19_999)).toBe(1);
    expect(frameIndexAt(frames, 20_000)).toBe(3);
  });

  it('同刻多帧取最后一帧（并列时后写的那一幕生效）', () => {
    expect(frameIndexAt(frames, 20_001)).toBe(3);
  });

  it('超过末帧停在末帧，不越界', () => {
    expect(frameIndexAt(frames, 10_000_000)).toBe(4);
  });

  it('空帧表返回 0（不抛、不返回 -1）', () => {
    expect(frameIndexAt([], 5_000)).toBe(0);
  });
});

describe('screenplayTotalMs', () => {
  it('总时长 = 末帧偏移 + 收尾停留（末帧不会刚出现就结束）', () => {
    expect(screenplayTotalMs(frames)).toBe(30_000 + SCREENPLAY_END_HOLD_MS);
  });

  it('空帧表是 0，不是负数', () => {
    expect(screenplayTotalMs([])).toBe(0);
  });
});

describe('firstFrameIndexOfStage', () => {
  it('给某站的第一帧下标（跳站落点）', () => {
    expect(firstFrameIndexOfStage(frames, '02')).toBe(2);
    expect(firstFrameIndexOfStage(frames, '03')).toBe(3);
  });

  it('★ 站不存在时返回 null 而不是 0：跳一个没有的站应当什么都不发生', () => {
    // 返回 0 会把"这个站剧本里没有"伪装成"这段播完了"，属把没做成的操作装成做成了
    expect(firstFrameIndexOfStage(frames, '99')).toBeNull();
    expect(firstFrameIndexOfStage([], '01')).toBeNull();
  });
});

describe('frameAtMs', () => {
  it('取某帧起始时刻；越界返回 0（跳站复用同一条赋值路径）', () => {
    expect(frameAtMs(frames, 3)).toBe(20_000);
    expect(frameAtMs(frames, 99)).toBe(0);
    expect(frameAtMs(frames, -1)).toBe(0);
  });
});

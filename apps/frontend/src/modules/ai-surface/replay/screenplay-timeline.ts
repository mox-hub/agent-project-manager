import type { ScreenplayFrame } from './screenplay-format';

/**
 * 回放时间轴（**纯函数**，可单测）。
 *
 * 时间语义只有一条：**已播时长 `elapsedMs` → 当前帧**。帧的 `atMs` 是"这一幕开演的
 * 时刻"，不是"这一幕的时长"——故当前帧 = **最后一个 `atMs <= elapsedMs` 的帧**。
 * 把 `atMs` 理解成时长是这类回放器最常见的错，症状是每一幕都比剧本写的短一截。
 */

/** 末帧之后的停留时长：让最后一幕不至于"刚出现就结束" */
export const SCREENPLAY_END_HOLD_MS = 3000;

/**
 * 当前帧下标。`elapsedMs` 早于首帧（或帧表为空）时返回 0——
 * 首帧是剧本的起点，"还没开始播"与"正在播第一帧"在视觉上应当是同一件事。
 */
export function frameIndexAt(frames: readonly ScreenplayFrame[], elapsedMs: number): number {
  if (frames.length === 0) return 0;
  let index = 0;
  for (let i = 0; i < frames.length; i += 1) {
    if (frames[i].atMs <= elapsedMs) index = i;
    else break;
  }
  return index;
}

/** 总时长 = 末帧偏移 + 收尾停留；空帧表返回 0（不是负数） */
export function screenplayTotalMs(frames: readonly ScreenplayFrame[]): number {
  if (frames.length === 0) return 0;
  return frames[frames.length - 1].atMs + SCREENPLAY_END_HOLD_MS;
}

/**
 * 某一站的第一帧下标（"跳站"的落点）。
 *
 * 站不存在时返回 `null` 而不是 0：**跳一个剧本里没有的站，应当什么都不发生**——
 * 悄悄回到开头会让人以为"这段播完了"，属于把没做成的操作伪装成做成了。
 */
export function firstFrameIndexOfStage(
  frames: readonly ScreenplayFrame[],
  stageNumber: string,
): number | null {
  const index = frames.findIndex((frame) => frame.stageNumber === stageNumber);
  return index === -1 ? null : index;
}

/** 某一帧的起始时刻；越界返回 0（用于让"跳站"复用同一条赋值路径） */
export function frameAtMs(frames: readonly ScreenplayFrame[], index: number): number {
  return frames[index]?.atMs ?? 0;
}

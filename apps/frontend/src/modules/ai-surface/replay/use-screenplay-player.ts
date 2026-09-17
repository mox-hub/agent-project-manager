import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScreenplayFrame } from './screenplay-format';
import {
  frameAtMs,
  frameIndexAt,
  firstFrameIndexOfStage,
  screenplayTotalMs,
} from './screenplay-timeline';

/**
 * 回放器（ARCH-AISURFACE-001 §3.4「支持暂停 / 步进 / 跳站」）。
 *
 * ## 为什么要有一个"播放器"而不是直接切帧
 *
 * 演示的说服力有很大一部分来自**时间**：观众看到"3 秒后执行记录从 4 变成 5"，
 * 才相信这条管道是活的；直接切帧是一叠静态截图。故这里保留一条真实的时间轴
 * （`elapsedMs` 单调推进），帧只是时间轴上的锚点。
 *
 * ## 三个交互语义（都刻意选过）
 *
 * - **步进 / 跳站会自动暂停**。手动拖时间轴是"我要看这一帧"，此时若还在自动前进，
 *   下一拍就把用户想看的帧冲掉了——两股力对着干。要连播请显式点"播放"。
 * - **跳一个剧本里没有的站 → 什么都不发生**（返回 `null`，不悄悄回到开头）。
 * - **到末帧即停**，不循环。演示会反复放，但"循环"会让"看完了"没有落点。
 *
 * ## 无 runtime、无 API key 是硬要求
 *
 * 本 hook 只读剧本数组、只用 `setInterval` 推进一个数字：不取数、不连 WS、不调模型。
 * 验收①（全新环境完整放完）就落在这条"零外部依赖"上——不是靠降级兜住的。
 */

/** 时间轴推进步长。100ms 是"肉眼连续"与"不空转"的折中 */
export const REPLAY_TICK_MS = 100;

export interface ScreenplayPlayer {
  /** 当前帧（帧表为空时调用方不应渲染本 hook 的消费方） */
  frame: ScreenplayFrame | null;
  index: number;
  frameCount: number;
  /**
   * 时间轴**是否还在推进**（= 用户想播 且 时间轴没走完）。
   *
   * 与 `atEnd` 不同：末帧之后的收尾停留里，时间轴还在走（进度条还在填），
   * 但已经没有下一帧可步进。两者是不同的两件事，故不相干地各自暴露。
   */
  playing: boolean;
  /** 已播时长（毫秒） */
  elapsedMs: number;
  totalMs: number;
  /** 帧级终态：末帧已在屏上（"下一步"据此置灰） */
  atEnd: boolean;
  play: () => void;
  pause: () => void;
  /** 暂停 / 继续 / 末尾重播，一键三态（按钮就一个） */
  toggle: () => void;
  stepForward: () => void;
  stepBack: () => void;
  /** 跳到某站的第一帧；站不存在返回 null（不移动） */
  jumpToStage: (stageNumber: string) => number | null;
  restart: () => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function useScreenplayPlayer(
  frames: readonly ScreenplayFrame[],
  options: { autoPlay?: boolean } = {},
): ScreenplayPlayer {
  const totalMs = useMemo(() => screenplayTotalMs(frames), [frames]);
  const [elapsedMs, setElapsedMs] = useState(0);
  // 「用户想不想播」——**意图**，与"时间轴实际在不在走"分开记（见 `playing` 的注释）：
  // 把两者合成一个 state 会让"到末尾自动停"必须靠副作用去改 state，
  // 而副作用里同步 setState 会引发级联渲染，也是 React 明确不建议的写法
  const [wantPlay, setWantPlay] = useState(options.autoPlay ?? !prefersReducedMotion());

  const index = frameIndexAt(frames, elapsedMs);
  const atEnd = frames.length > 0 && elapsedMs >= frameAtMs(frames, frames.length - 1);
  /** 时间轴走完（含末帧收尾停留）——与帧级的 `atEnd` 不是同一件事 */
  const reachedEnd = elapsedMs >= totalMs;
  const playing = wantPlay && !reachedEnd;

  useEffect(() => {
    // 依赖里放的是两个**布尔**而不是 `elapsedMs`：后者会让 interval 每一拍都被
    // 销毁重建（每拍一次 cleanup + 重新计时，时间轴会被拖慢且抖动）
    if (!playing) return;
    const id = setInterval(() => {
      setElapsedMs((prev) => Math.min(prev + REPLAY_TICK_MS, totalMs));
    }, REPLAY_TICK_MS);
    return () => clearInterval(id);
  }, [playing, totalMs]);

  // 两个步进都走函数式更新从 `prev` 取当前时刻：不走闭包里的 `elapsedMs`，
  // 否则回调必须把 elapsedMs 放进依赖（每拍重建一次），而漏加的后果是
  // "连点两下下一步只前进一帧"——这种偶发 bug 不值得靠依赖数组纪律去防
  const stepForward = useCallback(() => {
    setWantPlay(false);
    setElapsedMs((prev) => {
      const current = frameIndexAt(frames, prev);
      return frameAtMs(frames, Math.min(current + 1, frames.length - 1));
    });
  }, [frames]);

  const stepBack = useCallback(() => {
    setWantPlay(false);
    setElapsedMs((prev) => {
      const current = frameIndexAt(frames, prev);
      return frameAtMs(frames, Math.max(current - 1, 0));
    });
  }, [frames]);

  const jumpToStage = useCallback(
    (stageNumber: string): number | null => {
      const target = firstFrameIndexOfStage(frames, stageNumber);
      if (target === null) return null;
      setWantPlay(false);
      setElapsedMs(frameAtMs(frames, target));
      return target;
    },
    [frames],
  );

  const restart = useCallback(() => {
    setElapsedMs(0);
    setWantPlay(true);
  }, []);

  /**
   * 一键三态。**末尾那一下必须是"重播"而不是"继续"**——时间轴已经走完，
   * 单纯翻转意图只会让播放键看起来按不动（按了没反应，是"假按钮"的另一种形态）。
   * 判据用 `reachedEnd` 而不是帧级的 `atEnd`：末帧的收尾停留里时间轴还在走，
   * 那 3 秒内按下去应当是"暂停"。
   */
  const toggle = useCallback(() => {
    if (reachedEnd) {
      setElapsedMs(0);
      setWantPlay(true);
      return;
    }
    setWantPlay((prev) => !prev);
  }, [reachedEnd]);

  return {
    frame: frames[index] ?? null,
    index,
    frameCount: frames.length,
    playing,
    elapsedMs,
    totalMs,
    atEnd,
    play: useCallback(() => setWantPlay(true), []),
    pause: useCallback(() => setWantPlay(false), []),
    toggle,
    stepForward,
    stepBack,
    jumpToStage,
    restart,
  };
}

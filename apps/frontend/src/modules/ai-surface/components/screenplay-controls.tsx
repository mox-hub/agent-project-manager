import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import type { ScreenplayPlayer } from '../replay/use-screenplay-player';

/**
 * 回放控制条（ARCH-AISURFACE-001 §五 S5 验收②：「暂停/步进/跳站可用」）。
 *
 * ## 为什么"跳站"直接列出六站而不是给个下拉
 *
 * 六站是本产品的骨架，也是这个剧本的目录。把六站平铺出来，观众随时能看到
 * **自己正在整条链路的哪一格**——这本身就是这个演示要传达的东西的一半。
 * 收进下拉里，要传达的那半就没了。
 *
 * ## 不做的三件事
 *
 * - **不做倍速**。演示要的是节奏，倍速会让人跳过"卡在哪"的瞬间；真嫌慢可以点跳站。
 * - **不做音频/字幕**。维护成本远高于收益，且与"下一片接 onboarding"没有关系。
 * - **不把进度条做成可拖拽**。拖拽的分辨率是"像素"，而回放的语义单位是"帧"——
 *   给一个拖不到帧上的控件，用户会以为自己拖到了某一幕，其实停在两幕之间。
 *   步进 + 跳站已经覆盖了"我要看那一幕"的全部需求。
 */

/** 毫秒 → 人话时长；1 分钟以上给"分+秒"（90 秒写成「90 秒」远不如「1 分 30 秒」好懂） */
export function formatReplayClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} 秒`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} 分` : `${minutes} 分 ${seconds} 秒`;
}

export interface ScreenplayControlsProps {
  player: Pick<
    ScreenplayPlayer,
    | 'index'
    | 'frameCount'
    | 'playing'
    | 'elapsedMs'
    | 'totalMs'
    | 'atEnd'
    | 'toggle'
    | 'stepForward'
    | 'stepBack'
    | 'jumpToStage'
    | 'restart'
  >;
  /** 当前帧归属的站（`PIPELINE_STAGES.stageNumber`） */
  currentStageNumber: string;
  /** 当前帧标题（放在控制条里，边看边知道这一幕在讲什么） */
  frameTitle: string;
}

export function ScreenplayControls({
  player,
  currentStageNumber,
  frameTitle,
}: ScreenplayControlsProps) {
  const progressPct =
    player.totalMs > 0 ? Math.min(100, (player.elapsedMs / player.totalMs) * 100) : 0;

  return (
    <section
      className="w-full rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5"
      data-ai-component="ai-surface.replay-controls"
      data-ai-role="panel"
      aria-label="回放控制"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={player.toggle}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-purple/15 px-2.5 py-1 text-11 font-semibold text-accent-purple transition-colors hover:bg-accent-purple/25"
          data-ai-action="ai-surface.replay.toggle"
          title={player.playing ? '暂停（看清楚这一帧）' : '继续播放'}
        >
          {player.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          <span>{player.playing ? '暂停' : player.atEnd ? '重播' : '播放'}</span>
        </button>

        <button
          type="button"
          onClick={player.stepBack}
          disabled={player.index === 0}
          className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-11 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          data-ai-action="ai-surface.replay.step-back"
          title="上一帧（会自动暂停）"
        >
          <SkipBack className="size-3.5" />
          <span>上一步</span>
        </button>

        <button
          type="button"
          onClick={player.stepForward}
          disabled={player.atEnd}
          className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-11 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          data-ai-action="ai-surface.replay.step-forward"
          title="下一帧（会自动暂停）"
        >
          <span>下一步</span>
          <SkipForward className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={player.restart}
          className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-11 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          data-ai-action="ai-surface.replay.restart"
          title="从第一帧重放"
        >
          <RotateCcw className="size-3.5" />
          <span>重头放</span>
        </button>

        <span className="ml-auto font-mono text-10 text-muted-foreground">
          {`第 ${player.index + 1}/${player.frameCount} 帧 · ${formatReplayClock(player.elapsedMs)} / ${formatReplayClock(player.totalMs)}`}
        </span>
      </div>

      {/* 进度条：只读展示。刻意不做拖拽——见文件头第三条 */}
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={player.totalMs}
        aria-valuenow={Math.round(player.elapsedMs)}
        aria-label="回放进度"
      >
        {/* 过渡时长与回放步长（100ms）同量级：进度条会平滑地连成一格一格，
            而不是每拍硬跳一下——但它只是"看起来连续"，读数仍以 aria-valuenow 为准 */}
        <div
          className="h-full rounded-full bg-accent-purple transition-[left,top,width,height] duration-100"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 跳站：六站平铺，当前站在哪一目了然（站清单取自唯一定义源） */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-10 text-muted-foreground">跳站</span>
        {PIPELINE_STAGES.map((stage) => {
          const active = stage.stageNumber === currentStageNumber;
          return (
            <button
              key={stage.to}
              type="button"
              onClick={() => player.jumpToStage(stage.stageNumber)}
              className={cn(
                'cursor-pointer rounded-full px-2 py-0.5 font-mono text-10 transition-colors',
                active
                  ? 'bg-accent-purple/20 text-accent-purple'
                  : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
              )}
              data-ai-action={`ai-surface.replay.jump.${stage.stageNumber}`}
              title={`跳到「${stage.labelFallback}」的第一帧（会自动暂停）`}
            >
              {`${stage.stageNumber} ${stage.labelFallback}`}
            </button>
          );
        })}
      </div>

      <p
        className="mt-2 text-11 leading-relaxed text-foreground"
        data-ai-component="ai-surface.replay.frame-title"
      >
        {frameTitle}
      </p>
    </section>
  );
}

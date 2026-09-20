import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/shared/theme/theme-context';
import { RadialWatchDeck } from '../components/radial-watch-deck';
import { PipelineLaneStripView } from '../components/pipeline-lane-strip';
import { DecisionQueuePanelView } from '../components/decision-queue-panel';
import { SurfaceNarrationBar } from '../components/surface-narration-bar';
import { ScreenplayControls } from '../components/screenplay-controls';
import { buildFrameFacts } from '../replay/screenplay-facts';
import { parseScreenplay } from '../replay/screenplay-format';
import { useScreenplayPlayer } from '../replay/use-screenplay-player';
import { FIRST_DELIVERY_SCREENPLAY } from '../replay/screenplays/first-delivery';
import { INITIAL_ARTIFACTS, INITIAL_MESSAGES, MEMORY_ATOMS } from '../mock-data';
import { ArrowLeft, Sun, Moon, Rewind } from 'lucide-react';

/**
 * 回放态（ARCH-AISURFACE-001 §3.4 路径 A / §五 S5）。
 *
 * ## 与盯盘面（`ai-surface-page`）的关系：**同一批组件，另一个数据源**
 *
 * 本页刻意不复用盯盘页的 hook，但**复用它的全部组件**：泳道、待办区、工位卡、顶栏总述
 * 都是同一份实现（S5-c 把泳道与待办区抽成了 props 驱动的 View）。演示的全部价值就在
 * 「你看到的就是你会得到的」——若给回放另画一套界面，两份实现迟早长歪，演示就变成了
 * 展示一个不存在的产品。
 *
 * ## 本页**刻意不做**的四件事
 *
 * 1. **不挂 `SurfaceLiveness`**（实时连接徽标）。回放没有连接可言，显示「实时已断开」
 *    是如实但不相关的噪音，显示「实时」则是假话。改挂「回放」。
 * 2. **不挂 OmniDock**（输入框）。剧本里的对话气泡是**已经发生的事**，在这里打字
 *    不会有任何真实结果；留一个发出去没人接的输入框，比没有输入框更糟。
 * 3. **决策卡只读**。剧本里的待办 `id` 在服务端并不存在，动作键点下去就是
 *    "看起来批了、其实什么都没落"（S2-e 删掉假「准入」按钮时定的同一类错误）。
 * 4. **不假装实时**。本页所有数字的悬停溯源都写明「回放剧本（预置快照，非实时取数）」。
 */

/** 剧本的解析在**模块加载时**做一次：剧本是静态数据，每帧重解析纯属浪费 */
const PARSED = parseScreenplay(FIRST_DELIVERY_SCREENPLAY);

export function AiSurfaceReplayPage() {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';

  const screenplay = PARSED.screenplay;
  const frames = useMemo(() => screenplay?.frames ?? [], [screenplay]);
  const storyAtMs = useMemo(
    () => (screenplay ? Date.parse(screenplay.storyAt) : 0),
    [screenplay],
  );

  const player = useScreenplayPlayer(frames);
  const frame = player.frame;

  const facts = useMemo(
    () => (frame ? buildFrameFacts(frame, storyAtMs) : null),
    [frame, storyAtMs],
  );

  // 剧本自身坏了（格式不合、帧缺站）：**必须说出来**，否则"少了一幕"看起来像本该如此
  if (!screenplay || !frame || !facts) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-content-bg p-8 text-center text-foreground">
        <p className="text-sm font-semibold">回放演示读不出来，无法播放</p>
        <ul className="max-w-lg space-y-1 text-11 text-muted-foreground">
          {PARSED.drops.map((drop) => (
            <li key={`${drop.where}:${drop.why}`}>{`${drop.where}：${drop.why}`}</li>
          ))}
          {PARSED.drops.length === 0 && <li>演示数据里没有任何一帧可用</li>}
        </ul>
        <button
          type="button"
          onClick={() => navigate('/app/ai-surface')}
          className="mt-2 cursor-pointer rounded-lg bg-foreground/10 px-3 py-1.5 text-11 hover:bg-foreground/20"
        >
          返回盯盘面
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-x-hidden overflow-y-auto bg-content-bg font-sans text-foreground select-none">
      {/* 1. 页头：与盯盘面同构，但把「实时连接态」换成「回放」 */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between bg-transparent px-6 py-3.5 backdrop-blur-md select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/ai-surface')}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="返回盯盘面"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-lg bg-accent-purple text-xs font-semibold text-background">
              <Rewind className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {screenplay.title}
            </span>
            {/* 回放是这一屏**最主要**的事实，故用与实时徽标同级的位置与权重标注 */}
            <span
              className="ml-1 rounded-full bg-accent-purple/15 px-2 py-0.5 font-mono text-10 font-medium text-accent-purple"
              title="这是预置演示的回放，不是现场执行；每一格数字都标了来源"
            >
              回放
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-muted/50 px-2.5 py-1 text-11 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={isDark ? '切换至日间模式' : '切换至夜间模式'}
          >
            {isDark ? (
              <Sun className="size-3.5 text-accent-yellow" />
            ) : (
              <Moon className="size-3.5 text-accent-blue" />
            )}
            <span>{isDark ? '深空' : '明眸'}</span>
          </button>
        </div>
      </header>

      {/* 2. 剧本说明 + 控制条。说明放在最前：看的人先要知道"这不是真的在跑" */}
      <div className="relative z-10 mx-auto w-full max-w-[1100px] space-y-2 px-6 pt-1">
        <p
          className="rounded-xl border border-accent-purple/20 bg-accent-purple/5 px-3 py-2 text-11 leading-relaxed text-muted-foreground"
          data-ai-component="ai-surface.replay.about"
        >
          {screenplay.about}
          {`（对应项目：${screenplay.project.name}）`}
        </p>

        <ScreenplayControls
          player={player}
          currentStageNumber={frame.stageNumber}
          frameTitle={frame.title}
        />

        {/* 剧本事件名写错时，投影层会静默少一条进展行——与"这一步本来就没进展"无法区分，
            故在此显式暴露。正常剧本此处恒不渲染。 */}
        {facts.droppedEvents.length > 0 && (
          <p
            className="rounded-xl border border-accent-yellow/30 bg-accent-yellow/5 px-3 py-2 font-mono text-10 text-muted-foreground"
            data-ai-component="ai-surface.replay.dropped-events"
          >
            {`本帧有 ${facts.droppedEvents.length} 条事件没能进入投影层（事件名或载荷不被识别）：${facts.droppedEvents.join('、')}`}
          </p>
        )}
      </div>

      {/* 3. 顶栏一句话总述：与盯盘面同一组件，数据取自当前帧的剧本叙述 */}
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 pt-2">
        <SurfaceNarrationBar
          narration={frame.narration}
          state="ready"
          generatedAt={null}
          // 剧本里那句话是**预置的**，没有真实的开销可报——不传 usage，
          // 徽章自然不渲染（宁可不显示，也不写一个 $0.00 的假开销）
        />
      </div>

      {/* 4. 态势带：泳道 + 待办，均为与实况同一个 View，只换数据与出处注脚 */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1100px] gap-4 px-6 pb-2 pt-2 lg:grid-cols-[2fr_1fr]">
        <PipelineLaneStripView
          lanes={facts.lanes}
          scopeNote="回放演示"
          statusNote="来自预置演示，非实时取数（悬停看逐格溯源）"
          onOpenStage={() => {
            // 跳站在控制条里（那是回放真的能做的事）。此处**不**跳页：
            // 剧本里的计数不对应任何真实记录，跳过去只会看到一个不相干的空列表。
          }}
        />
        <DecisionQueuePanelView
          queue={facts.queue}
          isPending={false}
          isError={false}
          sourceNote="来自预置演示，非收件箱实时数据"
          onAction={() => {
            // 只读：动作栏已被 readOnly 整条隐藏，此回调不可达。
            // 留一个空实现而非 `undefined`，是因为 DecisionCard 的签名要求它；
            // 若哪天真被调到，说明 readOnly 被摘掉了——那是要修的地方，不是要静默的地方。
          }}
          busyId={null}
          readOnly
          readOnlyNote="回放中的数据是预置演示，这里不能拍板。真实拍板请在盯盘面的「该你了」，或去决策收件箱。"
          // 等待时长按**剧本时钟**算，否则一条刚出现的待办会显示"等了 4 天"（与全屏每一处都矛盾）
          waitingNowMs={storyAtMs + frame.atMs}
        />
      </div>

      {/* 5. 空间主视界：工位卡复用盯盘面的表盘（同一组件、同一适配器） */}
      <main className="no-scrollbar relative z-10 mx-auto flex w-full flex-1 flex-col items-center justify-center overflow-x-auto px-4 pb-24">
        <RadialWatchDeck
          stations={facts.stations}
          stationsStatus="ready"
          selectedAgentId={null}
          onSelectAgent={() => {
            // 回放里选中工位只能改高亮，不能派活（没有可派的真实执行），故不做选择交互
          }}
          memoryAtoms={MEMORY_ATOMS}
          artifacts={INITIAL_ARTIFACTS}
          messages={INITIAL_MESSAGES}
          isDark={isDark}
        />
      </main>

      {/* 6. 页脚：出口明确指回盯盘面 */}
      <footer className="relative z-10 mx-auto mb-6 w-full max-w-[1100px] px-6">
        <button
          type="button"
          onClick={() => navigate('/app/ai-surface')}
          className="w-full cursor-pointer rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-11 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          data-ai-action="ai-surface.replay.exit"
        >
          看完了，回到盯盘面 —— 那里的数字是真实项目里的
        </button>
      </footer>
    </div>
  );
}

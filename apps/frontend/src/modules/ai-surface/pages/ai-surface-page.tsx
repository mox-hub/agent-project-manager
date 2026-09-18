import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/shared/theme/theme-context';
import { usePipelineProjectFilter } from '@/shared/layout/pipeline-focus';
import { useDispatchAssistantMessage } from '@/modules/assistant/hooks/use-assistant-dispatch';
import { useOfficeSummary } from '@/modules/office/hooks/use-office-summary';
import { RadialWatchDeck } from '../components/radial-watch-deck';
import { OmniDock } from '../components/omni-dock';
import { SurfaceLiveness } from '../components/surface-liveness';
import { PipelineLaneStrip } from '../components/pipeline-lane-strip';
import { DecisionQueuePanel } from '../components/decision-queue-panel';
import { SurfaceNarrationBar } from '../components/surface-narration-bar';
import {
  useSurfaceFeedSubscription,
  useSurfaceFreshness,
  useSurfaceFeedItems,
} from '../hooks/use-surface-feed';
import { usePipelineLanes } from '../hooks/use-pipeline-lanes';
import { useDecisionQueue } from '../hooks/use-decision-queue';
import { useSurfaceNarration } from '../hooks/use-surface-narration';
import { toStationCards } from '../adapters/office-to-station';
import { buildSurfaceSnapshot } from '../adapters/surface-snapshot';
import { composeSurfaceDispatch } from '../adapters/station-context';
import { INITIAL_ARTIFACTS, INITIAL_MESSAGES, MEMORY_ATOMS } from '../mock-data';
import type { CognitiveMessage } from '../types';
import { Sparkles, ArrowLeft, Sun, Moon, Maximize2, Minimize2, Rewind } from 'lucide-react';

export function AiSurfacePage() {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';
  // 项目范围：沿用 CAP-A-15 的管道项目聚焦（URL ?project 优先），派发需要有项目作用域
  const { focusProjectId } = usePipelineProjectFilter();
  const dispatch = useDispatchAssistantMessage(focusProjectId ?? undefined);

  const [artifacts] = useState(INITIAL_ARTIFACTS);
  const [messages, setMessages] = useState<CognitiveMessage[]>(INITIAL_MESSAGES);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 工位卡接真（S2-b）：office 聚合走**既有服务**（办公室页同一个查询键，命中同一份缓存），
  // 进展走投影层。两条流在此汇合成工位视图模型——不新增数据源、不造第二套口径（§4.7）。
  const summary = useOfficeSummary(focusProjectId ?? undefined);
  // 进度匹配按 executionRun.id 精确对齐，故**不**按项目过滤事件：
  // 事件缺 projectId 时若先过滤会让工位悄悄丢掉真实进展（宁多匹配、不静默缺失）。
  const feedItems = useSurfaceFeedItems();
  const stations = useMemo(
    () => toStationCards(summary.data?.colleagues ?? [], feedItems),
    [summary.data, feedItems],
  );
  // 三态显式区分：连"读失败"与"真的没人"都不能混为一谈
  const stationsStatus = summary.isPending
    ? 'loading'
    : summary.isError
    ? 'error'
    : 'ready';

  // 叙述层（S3-e）的**事实**来源：下面两块面板此刻正在用的同两个 hook。
  // 查询键完全相同 → 命中同一份缓存，**不产生任何新请求**；也因此叙述所说
  // 必定与同屏内容同源，不可能"AI 说的话和屏幕上的数对不上"（§4.7）。
  const lanesState = usePipelineLanes(focusProjectId ?? undefined);
  const queueState = useDecisionQueue(focusProjectId ?? undefined);
  const snapshot = useMemo(
    () =>
      buildSurfaceSnapshot({
        stations,
        colleaguesReady: stationsStatus === 'ready',
        lanes: lanesState.lanes,
        lanesPending: lanesState.isPending,
        lanesError: lanesState.isError,
        queue: queueState.queue,
        // total 未就绪时是 0 兜底值，**不可信**——必须连同就绪态一起给出去
        queueReady: !queueState.isPending && !queueState.isError,
      }),
    [stations, stationsStatus, lanesState, queueState],
  );
  const {
    narration: narrationView,
    state: narrationState,
    degradedNote: narrationDegradedNote,
    generatedAt: narrationGeneratedAt,
    usage: narrationUsage,
    refresh: refreshNarration,
  } = useSurfaceNarration(snapshot, {
    projectId: focusProjectId ?? undefined,
  });


  // 面级实时订阅（ARCH-AISURFACE-001 §4.1）：领域事件 → 投影层。
  // 本页此前**从未挂载**它，投影层虽已建成却收不到任何推送（S2 接真的第一处接线）。
  useSurfaceFeedSubscription();

  const { connected } = useSurfaceFreshness();
  const queryClient = useQueryClient();

  // 重连后快照对齐（验收②）：增量（WS）与快照（REST）在组件层汇合，而断线期间
  // 发生的事**只**存在于事件流里、快照仍是旧的。重连即让快照作废重取，
  // 避免界面"半新半旧"却不自知。
  const wasOfflineRef = useRef(false);
  useEffect(() => {
    if (!connected) {
      wasOfflineRef.current = true;
      return;
    }
    if (!wasOfflineRef.current) return;
    wasOfflineRef.current = false;
    void queryClient.invalidateQueries();
  }, [connected, queryClient]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const selectedStation = stations.find((s) => s.memberId === selectedAgentId);

  /**
   * Omni-Dock 发送 → 真实派发（走既有 assistant 执行桥）。
   *
   * 治理要点（ARCH-AISURFACE-001 §1.1 错位一）：此处**禁止**伪造 AI 回复与
   * 自动上涨的信任分——原实现用 setTimeout 造回复并把 overallScore +0.3，正是
   * 本项目「可验证、不静默」主轴最不容忍的形态，已清零。派发失败由 hook 内
   * toast 如实报错（含缺项目作用域的情形），不静默吞掉。
   *
   * 代理态（§3.2）：选中同事时，其**当前状态**会随消息一并交给 AI——否则
   * 「看到小码卡住了 → 问它为什么」这句话里的"它"对 AI 根本不存在。**回显用
   * 同一份文本**（`composeSurfaceDispatch` 只调一次），用户看到的就是 AI 收到的。
   */
  const handleSendMessage = useCallback(
    (text: string, model: string) => {
      const content = composeSurfaceDispatch(text, {
        model,
        station: selectedStation,
      });
      const userMsg: CognitiveMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'user-human',
        senderName: '人类指挥官 (You)',
        senderRole: 'pm',
        avatar: '👤',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      dispatch.mutate(content);
    },
    [dispatch, selectedStation],
  );

  // 返回人类控制面
  const handleExitSurface = useCallback(() => {
    navigate('/app/projects/dashboard');
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen flex flex-col overflow-x-hidden overflow-y-auto bg-content-bg font-sans text-foreground select-none">
      {/* 1. 顶部全屏微型全息导航条 (极其克制、通透) */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between bg-transparent px-6 py-3.5 backdrop-blur-md select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExitSurface}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="返回人类控制面 (Esc)"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            {/* AI 专属标识：烟熏紫（DESIGN.md §2.3 H265 S32% L60%），无渐变无发光 */}
            <div className="flex size-6 items-center justify-center rounded-lg bg-accent-purple text-xs font-semibold text-background">
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              APM SYNTHETIC COGNITIVE SURFACE
            </span>
            <span className="ml-1 rounded-full bg-accent-purple/15 px-2 py-0.5 font-mono text-10 font-medium text-accent-purple">
              DUAL-SURFACE V4
            </span>
            {/* 页头不再挂「示例」徽标（S2-e）。S2-b 起它已收窄为「部分区域示例」，
                但收窄治不了**位置**问题：徽标悬在页头，而示例内容在屏幕中段的表盘里，
                读者的视线落到那些条目时，徽标早已不在视野内——标注了，却等于没标。
                现在改为**就地**标注（`SampleTag`）：标注长在示例区域的标题旁边、与内容同屏；
                而没有口径的区域一律清零数字、只留去向说明（`NoMetricNote`），不是"标成示例"就算完。 */}
          </div>
        </div>

        {/* 右上角控制与指示 */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {/* 日夜模式切换 */}
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

          {/* 回放入口（S5）。放在**页头**而不是 OmniDock 里：它是"换一种看的方式"，
              不是"在这个面里做一件事"——坞里的每一件都对外产生副作用，它不产生任何副作用。
              悬停文案如实说明它不需要 runtime 与 API key（那正是回放存在的理由）。 */}
          <button
            type="button"
            onClick={() => navigate('/app/ai-surface/replay')}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-muted/50 px-2.5 py-1 text-11 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="回放一段预置演示：从一句需求到交付，不需要 runtime、不需要 API key"
            data-ai-action="ai-surface.replay.enter"
          >
            <Rewind className="size-3.5" />
            <span>回放</span>
          </button>

          {/* 全屏切换 */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-muted/50 px-2.5 py-1 text-11 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            title={isFullscreen ? '退出全屏模式' : '进入真正全屏模式'}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            <span>{isFullscreen ? '窗口' : '全屏'}</span>
          </button>

          {/* 真实连接态（取代原写死的「ACTIVE」——那是纯装饰，断线也照样绿） */}
          <SurfaceLiveness />
        </div>
      </header>

      {/* 2. 顶栏 AI 一句话总述（S3-e，§3.1「顶栏：AI 一句话总述」）。
          叙述读的就是下面两块面板此刻同屏的事实（同一份缓存），
          只做翻译、不做计算；AI 不可用时就地降级为规则摘要并**标注出来**。 */}
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 pt-1">
        <SurfaceNarrationBar
          narration={narrationView}
          state={narrationState}
          degradedNote={narrationDegradedNote}
          generatedAt={narrationGeneratedAt}
          usage={narrationUsage}
          onRefresh={refreshNarration}
        />
      </div>

      {/* 3. 态势带：左「六站管道泳道」全局位置（S2-c）· 右「该你了」待办（S2-d）。
          两者都取自既有服务，取代了原先表盘上方那块**全编造**的遥测 HUD——
          真数据进来，假数据就必须走。 */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1100px] gap-4 px-6 pb-2 lg:grid-cols-[2fr_1fr]">
        <PipelineLaneStrip />
        <DecisionQueuePanel />
      </div>

      {/* 4. 空间主视界：中间手表圆形表盘 + 左右水平环绕卡片 */}
      <main className="no-scrollbar relative z-10 mx-auto flex w-full flex-1 flex-col items-center justify-center overflow-x-auto px-4 pb-32">
        <RadialWatchDeck
          stations={stations}
          stationsStatus={stationsStatus}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => setSelectedAgentId(id === selectedAgentId ? null : id)}
          memoryAtoms={MEMORY_ATOMS}
          artifacts={artifacts}
          messages={messages}
          isDark={isDark}
        />
      </main>

      {/* 5. 悬浮全能交互坞 (Omni-Dock) */}
      <OmniDock
        onSendMessage={handleSendMessage}
        onExitSurface={handleExitSurface}
        activeAgentName={selectedStation?.displayName}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}

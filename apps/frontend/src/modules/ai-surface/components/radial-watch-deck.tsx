import { useState } from 'react';
import type { RuntimeUsagePayload } from '@apm/shared/events/domain-events';
import type { MemoryAtom, ArtifactItem, CognitiveMessage } from '../types';
import type { StationCard, StationProgress } from '../adapters/office-to-station';
import { CentralWatchDial } from './central-watch-dial';
import { SampleTag, NoMetricNote } from './sample-tag';
import { cn } from '@/lib/utils';
import { STATE_DOT } from '@/modules/assistant/components/assistant-status-dot';
import { Database, Info, PlayCircle } from 'lucide-react';

/**
 * 同事状态的**展示**文案。状态值本身来自服务端 `OfficeStatus` 四值（经适配器透传），
 * 这里只是中文渲染——与办公室页 `office.status.*` 一一对应，不新增档位。
 * （原实现自造了 reasoning/executing/auditing 三个服务端不存在的档位。）
 */
const OFFICE_STATUS_LABEL: Record<StationCard['status'], string> = {
  needYou: '需要你',
  working: '进行中',
  suggestions: '有建议',
  idle: '空闲',
};

/** 可接活度色：与办公室页 ColleagueCard 同一语义（可用/繁忙/饱和） */
const ACCEPTABILITY_BAR: Record<StationCard['capacity']['acceptability'], string> = {
  available: 'hsl(var(--accent-green))',
  busy: 'hsl(var(--accent-yellow))',
  saturated: 'hsl(var(--accent-red))',
};

const ACCEPTABILITY_LABEL: Record<StationCard['capacity']['acceptability'], string> = {
  available: '可接活',
  busy: '较忙',
  saturated: '已饱和',
};

/**
 * 进展一行的文本：运行时原话直接用；步骤事件按结构拼（序号缺省则不写"步骤"）。
 * 纯排版，不含任何服务端没有的事实。
 */
function formatStationProgress(progress: StationProgress): string {
  // 两种「运行时原话」形态（在途进展 / 执行终态）都是原文，直接显示，不加包装
  if (progress.source === 'runtime' || progress.source === 'result') {
    return progress.text;
  }
  const head = progress.sequence != null ? `步骤 ${progress.sequence} · ` : '';
  const tail = progress.status ? ` (${progress.status})` : '';
  return `${head}${progress.label}${tail}`;
}

/**
 * 终态事件里那些**真实数值**的合成行：单次执行的 token/成本、工件条数。
 *
 * 三纪律：
 * ① 与工位卡下方那行「本周 …」**不是同一口径**——那是 office 的服务端聚合周报，
 *    这是单次执行的 CLI 上报值，标签必须不同，否则周报会被误读成单次花费；
 * ② 各字段**各按各的存在性**：有哪个写哪个，不补 0（补 0 把"没上报"说成"没花钱"）；
 * ③ 一个都没有时返回 null，由组件整行不渲染——不写"未知"占位充数。
 */
function formatRunFacts(progress: StationProgress): string | null {
  if (progress.source !== 'result') return null;
  const parts: string[] = [];
  const usage: RuntimeUsagePayload | undefined = progress.usage;
  if (usage && typeof usage.totalTokens === 'number') {
    const tokens = `${(usage.totalTokens / 1000).toFixed(1)}k tokens`;
    const cost =
      typeof usage.costUsd === 'number' ? ` · $${usage.costUsd.toFixed(2)}` : '';
    parts.push(`本次 ${tokens}${cost}`);
  }
  if (typeof progress.artifactCount === 'number') {
    parts.push(`工件 ${progress.artifactCount}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

interface RadialWatchDeckProps {
  /** 工位卡：来自 office 真实口径（`GET /office/summary`）叠加投影层进展，见 adapters/office-to-station */
  stations: StationCard[];
  /**
   * 工位数据的三态。**必须显式区分**「还在读」与「读失败」与「真的没有同事」——
   * 三者都表现为"列表为空"，若一律渲染成空版面，读失败就会被误读成"团队没人"。
   */
  stationsStatus?: 'loading' | 'error' | 'ready';
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  /**
   * 记忆原子：**示例内容**（就地带「示例」标注）。原先还接了 `dimensions`（四维信度）
   * 与 `overallScore`（项目信度总分）两个入参——那两串数字服务端没有口径，S2-e 已连同
   * 卡片上的数字一并清零，入参随之删除（不留"没人喂的编造数据"当摆设）。
   */
  memoryAtoms: MemoryAtom[];
  artifacts: Record<string, ArtifactItem>;
  messages: CognitiveMessage[];
  isDark?: boolean;
}

export function RadialWatchDeck({
  stations,
  stationsStatus = 'ready',
  selectedAgentId,
  onSelectAgent,
  memoryAtoms,
  artifacts,
  messages,
  isDark = true,
}: RadialWatchDeckProps) {
  const [hoveredSideCard, setHoveredSideCard] = useState<string | null>(null);
  const [activeMemory, setActiveMemory] = useState<MemoryAtom | null>(null);

  // 几何坐标参数 (以中间 720px 表盘中心为原点 (0, 0)，表盘半径 R = 360)
  // 左侧 4 个工位卡的**几何**与科技总线曲折走线路径（只留几何）。
  // 卡片内容一律来自 office 真实口径 + 投影层进展（S2-b）；原实现在每个槽位内嵌了
  // 一份写死的同事（name/statusText/tokensUsed…），同事不足 4 个时就把假人补上来——
  // 那是 §4.7「不伪造」的直接违反，已清零：没有同事就没有卡片。
  const LEFT_STATION_GEOMETRY = [
    {
      pinX: -410,
      pinY: -225,
      bezelX: -278,
      bezelY: -225,
      cardLeft: -705,
      cardTop: -285,
      // 双直角阶梯曲折走线与中继节点
      circuitPath: 'M -410 -225 L -370 -225 L -370 -195 L -315 -195 L -315 -225 L -278 -225',
      nodes: [
        { x: -370, y: -225 },
        { x: -370, y: -195 },
        { x: -315, y: -195 },
        { x: -315, y: -225 },
      ],
    },
    {
      pinX: -465,
      pinY: -75,
      bezelX: -352,
      bezelY: -75,
      cardLeft: -760,
      cardTop: -135,
      circuitPath: 'M -465 -75 L -425 -75 L -425 -110 L -380 -110 L -380 -75 L -352 -75',
      nodes: [
        { x: -425, y: -75 },
        { x: -425, y: -110 },
        { x: -380, y: -110 },
        { x: -380, y: -75 },
      ],
    },
    {
      pinX: -465,
      pinY: 75,
      bezelX: -352,
      bezelY: 75,
      cardLeft: -760,
      cardTop: 15,
      circuitPath: 'M -465 75 L -425 75 L -425 110 L -380 110 L -380 75 L -352 75',
      nodes: [
        { x: -425, y: 75 },
        { x: -425, y: 110 },
        { x: -380, y: 110 },
        { x: -380, y: 75 },
      ],
    },
    {
      pinX: -410,
      pinY: 225,
      bezelX: -278,
      bezelY: 225,
      cardLeft: -705,
      cardTop: 165,
      circuitPath: 'M -410 225 L -370 225 L -370 195 L -315 195 L -315 225 L -278 225',
      nodes: [
        { x: -370, y: 225 },
        { x: -370, y: 195 },
        { x: -315, y: 195 },
        { x: -315, y: 225 },
      ],
    },
  ];

  // 右侧 4 个信度与属性卡片数据与科技总线曲折走线路径
  const RIGHT_CARDS_DATA = [
    {
      id: 'right-score',
      pinX: 410,
      pinY: -225,
      bezelX: 278,
      bezelY: -225,
      cardLeft: 415,
      cardTop: -285,
      circuitPath: 'M 410 -225 L 370 -225 L 370 -195 L 315 -195 L 315 -225 L 278 -225',
      nodes: [
        { x: 370, y: -225 },
        { x: 370, y: -195 },
        { x: 315, y: -195 },
        { x: 315, y: -225 },
      ],
    },
    {
      id: 'right-contract',
      pinX: 465,
      pinY: -75,
      bezelX: 352,
      bezelY: -75,
      cardLeft: 470,
      cardTop: -135,
      circuitPath: 'M 465 -75 L 425 -75 L 425 -110 L 380 -110 L 380 -75 L 352 -75',
      nodes: [
        { x: 425, y: -75 },
        { x: 425, y: -110 },
        { x: 380, y: -110 },
        { x: 380, y: -75 },
      ],
    },
    {
      id: 'right-logic',
      pinX: 465,
      pinY: 75,
      bezelX: 352,
      bezelY: 75,
      cardLeft: 470,
      cardTop: 15,
      circuitPath: 'M 465 75 L 425 75 L 425 110 L 380 110 L 380 75 L 352 75',
      nodes: [
        { x: 425, y: 75 },
        { x: 425, y: 110 },
        { x: 380, y: 110 },
        { x: 380, y: 75 },
      ],
    },
    {
      id: 'right-memory',
      pinX: 410,
      pinY: 225,
      bezelX: 278,
      bezelY: 225,
      cardLeft: 415,
      cardTop: 165,
      circuitPath: 'M 410 225 L 370 225 L 370 195 L 315 195 L 315 225 L 278 225',
      nodes: [
        { x: 370, y: 225 },
        { x: 370, y: 195 },
        { x: 315, y: 195 },
        { x: 315, y: 225 },
      ],
    },
  ];

  return (
    <div
      className="relative flex items-center justify-center select-none py-10 my-auto"
      style={{ minHeight: 840, width: '100%' }}
    >
      {/* 居中工作视界容器 (1520px 宽度，中间为 720px 表盘，左右为水平环绕卡片) */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 1520, height: 760 }}
      >
        {/* 原「表盘正上方悬浮 HUD」已整体删除（AI 表面 S2-c）。它整块都是编造的：
            `WORKSTREAM: CAP-P-01`、`AUTONOMOUS RUNNING`、`142.6 t/s`、`18ms 突触延迟`、
            `4/4 智能体神经网络同频`、`5/5 记忆星云` —— 服务端没有任何一个数能对上，
            而它长得像实时遥测，正是 §4.7「不伪造」最不容忍的形态。全局态势改由页面级
            `PipelineLaneStrip` 承担，那里每一格都能追到端点。 */}

        {/* ============================================================ */}
        {/* 1. 科技总线曲折线 SVG 连线层 (Stepped Circuit Zig-Zag Cables) */}
        {/* ============================================================ */}
        <svg
          className="pointer-events-none absolute inset-0 size-full overflow-visible z-10"
          viewBox="-760 -380 1520 760"
        >
          <defs>
            <linearGradient id="wireGlowLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--accent-purple))" stopOpacity="0.85" />
              <stop offset="100%" stopColor="hsl(var(--accent-green))" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="wireGlowRight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--accent-green))" stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(var(--accent-blue))" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* 左侧曲折接线：连接 4 个工位卡端子到表盘外壳 */}
          {LEFT_STATION_GEOMETRY.map((item, idx) => {
            const station = stations[idx];
            // 没有同事就没有工位——不画一根通向空位的走线
            if (!station) return null;
            const isHovered =
              hoveredSideCard === station.memberId || selectedAgentId === station.memberId;

            return (
              <g key={`wire-left-${idx}`}>
                {/* 基础物理电路母线 (带直角圆滑拐角) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke={
                    isHovered
                      ? isDark
                        ? 'hsl(var(--accent-purple) / 0.85)'
                        : 'hsl(var(--accent-purple) / 0.85)'
                      : isDark
                      ? 'hsl(var(--foreground) / 0.22)'
                      : 'hsl(var(--foreground) / 0.22)'
                  }
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 闪光高能激光脉冲 (沿曲折线向表盘流动) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke="url(#wireGlowLeft)"
                  strokeWidth={isHovered ? 3.5 : 2.2}
                  strokeDasharray="12 28"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 6px hsl(var(--accent-green) / 0.8))'
                      : 'drop-shadow(0 0 4px hsl(var(--accent-purple) / 0.6))',
                  }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="40"
                    to="0"
                    dur={isHovered ? '0.8s' : `${1.5 + idx * 0.2}s`}
                    repeatCount="indefinite"
                  />
                </path>

                {/* 曲折走线上的微型焊点中继晶体 (Circuit Junction Nodes) */}
                {item.nodes.map((node, nIdx) => (
                  <circle
                    key={`node-l-${idx}-${nIdx}`}
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? 3 : 2}
                    fill={isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))'}
                    opacity={0.85}
                  />
                ))}

                {/* 卡片端子接线引脚 (Pin) */}
                <circle cx={item.pinX} cy={item.pinY} r="4" fill="hsl(var(--accent-purple))" />
                <circle cx={item.pinX} cy={item.pinY} r="1.8" fill="hsl(var(--primary-foreground))" />

                {/* 表盘外壳接线座 (Bezel Socket) */}
                <circle cx={item.bezelX} cy={item.bezelY} r="4.5" fill="hsl(var(--accent-green))" />
                <circle cx={item.bezelX} cy={item.bezelY} r="2" fill="hsl(var(--primary-foreground))" />
              </g>
            );
          })}

          {/* 右侧曲折接线：连接 4 个水平信度卡片端子到表盘外壳 */}
          {RIGHT_CARDS_DATA.map((item, idx) => {
            const isHovered = hoveredSideCard === item.id;

            return (
              <g key={`wire-right-${idx}`}>
                {/* 基础物理电路母线 (带直角圆滑拐角) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke={
                    isHovered
                      ? isDark
                        ? 'hsl(var(--accent-green) / 0.85)'
                        : 'hsl(var(--accent-green) / 0.85)'
                      : isDark
                      ? 'hsl(var(--foreground) / 0.22)'
                      : 'hsl(var(--foreground) / 0.22)'
                  }
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 闪光高能激光脉冲 (沿曲折线向表盘流动) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke="url(#wireGlowRight)"
                  strokeWidth={isHovered ? 3.5 : 2.2}
                  strokeDasharray="12 28"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 6px hsl(var(--accent-purple) / 0.8))'
                      : 'drop-shadow(0 0 4px hsl(var(--accent-green) / 0.6))',
                  }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="40"
                    dur={isHovered ? '0.8s' : `${1.6 + idx * 0.2}s`}
                    repeatCount="indefinite"
                  />
                </path>

                {/* 曲折走线上的微型焊点中继晶体 (Circuit Junction Nodes) */}
                {item.nodes.map((node, nIdx) => (
                  <circle
                    key={`node-r-${idx}-${nIdx}`}
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? 3 : 2}
                    fill={isDark ? 'hsl(var(--accent-green))' : 'hsl(var(--accent-green))'}
                    opacity={0.85}
                  />
                ))}

                {/* 卡片端子接线引脚 (Pin) */}
                <circle cx={item.pinX} cy={item.pinY} r="4" fill="hsl(var(--accent-green))" />
                <circle cx={item.pinX} cy={item.pinY} r="1.8" fill="hsl(var(--primary-foreground))" />

                {/* 表盘外壳接线座 (Bezel Socket) */}
                <circle cx={item.bezelX} cy={item.bezelY} r="4.5" fill="hsl(var(--accent-purple))" />
                <circle cx={item.bezelX} cy={item.bezelY} r="2" fill="hsl(var(--primary-foreground))" />
              </g>
            );
          })}
        </svg>

        {/* ============================================================ */}
        {/* 2. 左侧 4 个水平工位卡（内容来自 office 真实口径；同事不够就少几张） */}
        {/* ============================================================ */}
        {/* 空态：三种"空"必须说清是哪种，且一律不用假人填版面（§4.7 不伪造） */}
        {stations.length === 0 && (
          <div
            className="absolute rounded-2xl p-3.5 backdrop-blur-2xl border border-current/10"
            style={{
              left: `calc(50% + ${LEFT_STATION_GEOMETRY[0].cardLeft}px)`,
              top: `calc(50% + ${LEFT_STATION_GEOMETRY[0].cardTop}px)`,
              width: 295,
            }}
          >
            <p className="mb-1 text-xs font-bold tracking-tight">
              {stationsStatus === 'loading'
                ? '正在读取同事状态…'
                : stationsStatus === 'error'
                ? '同事状态读取失败'
                : '暂无可显示的工位'}
            </p>
            <p className="font-mono text-muted-foreground" style={{ fontSize: 9 }}>
              {stationsStatus === 'loading'
                ? '数据来自 GET /office/summary'
                : stationsStatus === 'error'
                ? '不显示占位数据以免被当成真实状态；请检查网络或稍后重试'
                : '当前项目下没有 AI 同事；可在办公室页面添加同事或派发执行'}
            </p>
          </div>
        )}

        {LEFT_STATION_GEOMETRY.map((geo, idx) => {
          const station = stations[idx];
          // 工位数由真实同事数决定：不足 4 个就少几张卡，**不补假人**（§4.7 不伪造）
          if (!station) return null;
          const isSelected = selectedAgentId === station.memberId;

          return (
            <div
              key={station.memberId}
              data-ai-component="ai-surface.station-card"
              // 就地解释（CAP-C-07）：AISlot 靠 DOM 上的 `kind:id` 找目标。此前本面
              // **一个 data-ai-entity 都没有**，Ctrl+左键 `closest()` 恒返回 null →
              // 静默无反应（看着像功能没做，其实是没接）。`member` 已在 card-explain
              // 支持清单内，故补属性即可，服务端零改动。
              data-ai-entity={`member:${station.memberId}`}
              onClick={() => onSelectAgent(station.memberId)}
              onMouseEnter={() => setHoveredSideCard(station.memberId)}
              onMouseLeave={() => setHoveredSideCard(null)}
              className={cn(
                'absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border cursor-pointer select-text shadow-xs',
                isSelected ? '' : 'hover:opacity-95',
              )}
              style={{
                left: `calc(50% + ${geo.cardLeft}px)`,
                top: `calc(50% + ${geo.cardTop}px)`,
                width: 295,
                borderColor: isSelected
                  ? isDark
                    ? 'hsl(var(--accent-purple) / 0.7)'
                    : 'hsl(var(--accent-purple) / 0.6)'
                  : isDark
                  ? 'hsl(var(--foreground) / 0.12)'
                  : 'hsl(var(--foreground) / 0.12)',
                background: isDark
                  ? isSelected
                    ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.14) 0%, hsl(var(--foreground) / 0.05) 100%)'
                    : 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.025) 100%)'
                  : isSelected
                  ? 'linear-gradient(135deg, hsl(var(--background) / 0.98) 0%, hsl(var(--background) / 0.92) 100%)'
                  : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.82) 100%)',
                color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
              }}
            >
              {/* 顶部行：头像、状态灯、姓名与状态徽标、信度分 */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="relative flex items-center justify-center size-8 rounded-xl text-xs font-semibold shrink-0 text-primary-foreground"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--accent-purple)) 0%, hsl(var(--accent-purple)) 100%)',
                    }}
                  >
                    {/* 有头像用头像，没有就用姓名首字——不再拿 ✦◈⚡🛡 这类装饰符冒充头像。
                        圆角加在 img 自身而非父级 overflow-hidden：后者会把 -top-0.5 的状态灯裁掉 */}
                    {station.avatarUrl ? (
                      <img src={station.avatarUrl} alt="" className="size-full rounded-xl object-cover" />
                    ) : (
                      station.displayName.slice(0, 1)
                    )}
                    <span
                      className={cn(
                        'absolute -top-0.5 -right-0.5 size-2 rounded-full',
                        STATE_DOT[station.status],
                      )}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs tracking-tight truncate">{station.displayName}</h4>
                      <span
                        className="px-1.5 py-0.2 rounded font-mono font-semibold"
                        style={{
                          fontSize: 8.5,
                          background: isDark ? 'hsl(var(--accent-purple) / 0.2)' : 'hsl(var(--accent-purple) / 0.12)',
                          color: isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))',
                        }}
                      >
                        {OFFICE_STATUS_LABEL[station.status]}
                      </span>
                    </div>
                    <p
                      className="truncate font-mono"
                      style={{
                        fontSize: 9,
                        color: isDark ? 'hsl(var(--foreground) / 0.6)' : 'hsl(var(--foreground) / 0.6)',
                      }}
                    >
                      {station.title ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {/* 服务端没给信度分就是没有——显示破折号，不落回写死的高分 */}
                  <span
                    className="font-mono font-bold block"
                    style={{
                      fontSize: 11,
                      color:
                        station.trustScore != null
                          ? 'hsl(var(--accent-green))'
                          : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {station.trustScore != null ? `${station.trustScore}%` : '—'}
                  </span>
                  <span
                    className="font-mono block"
                    style={{
                      fontSize: 8,
                      color: isDark ? 'hsl(var(--foreground) / 0.45)' : 'hsl(var(--foreground) / 0.45)',
                    }}
                  >
                    信度
                  </span>
                </div>
              </div>

              {/* 在干什么：当前执行（与办公室页 ColleagueCard 同规则：工单标题优先，退化到本次目标） */}
              <div
                className="mb-1.5 px-2 py-1 rounded flex items-center gap-1.5 border border-current/10"
                style={{
                  fontSize: 8.5,
                  background: isDark ? 'hsl(var(--foreground) / 0.05)' : 'hsl(var(--foreground) / 0.04)',
                }}
              >
                {station.run ? (
                  <>
                    <PlayCircle className="size-2.5 shrink-0 text-accent-purple" />
                    <span className="truncate" title={station.run.label}>
                      {station.run.label}
                    </span>
                    {/* 执行状态原样透传，不做语义美化；来源（快照/事件）用 title 交代，
                        因为终态事件会覆写快照值——读者得能分辨这个 status 有多新 */}
                    <span
                      className="ml-auto shrink-0 font-mono text-muted-foreground"
                      title={
                        station.run.statusSource === 'event'
                          ? '来自执行终态事件（runtime.execution.result），比快照新'
                          : '来自 office 快照（冷启动抓取），可能滞后于事件'
                      }
                    >
                      {station.run.status}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">当前无执行</span>
                )}
              </div>

              {/* 实时进展：只放事件里真实存在的话；没有事件就明说没有（§3.1 诚实粒度） */}
              {station.progress ? (
                <p
                  className="truncate font-mono mb-1.5"
                  style={{ fontSize: 9, color: 'hsl(var(--foreground) / 0.8)' }}
                  title={`来源事件 ${station.progress.eventName}`}
                >
                  {formatStationProgress(station.progress)}
                </p>
              ) : station.run ? (
                <p
                  className="truncate font-mono mb-1.5 text-muted-foreground"
                  style={{ fontSize: 9 }}
                  title="该执行尚未上报进展事件；表面不推测它跑到哪一步"
                >
                  已派发，暂无进展事件
                </p>
              ) : null}

              {/* 本次执行的 token/成本 / 工件数：**各按各的存在性**，有哪个写哪个，
                  都没有就整行不渲染（不补 0、不写"未知"占位）。
                  与下方「本周 …」是两个口径，标签必须不同。 */}
              {station.progress && formatRunFacts(station.progress) ? (
                <p
                  className="truncate font-mono mb-1.5 text-muted-foreground"
                  style={{ fontSize: 8.5 }}
                  title="CLI 终事件上报的单次执行用量（runtime.execution.result），非周报口径"
                >
                  {formatRunFacts(station.progress)}
                </p>
              ) : null}

              {/* 容量与本周用量（与办公室页同一口径；标签必须写明"本周"） */}
              <div className="pt-1 border-t border-current/10">
                <div
                  className="flex items-center justify-between gap-1 font-mono"
                  style={{ fontSize: 8 }}
                >
                  <span className="text-muted-foreground">
                    {`并行 ${station.capacity.activeRuns}/${station.capacity.capacityLimit}`}
                  </span>
                  <span className="text-muted-foreground" title="本周消耗（服务端聚合口径）">
                    {`本周 ${(station.capacity.weeklyTokens / 1000).toFixed(1)}k tokens · $${station.capacity.weeklyCostUsd.toFixed(2)}`}
                    {/* 预算占比仅项目域返回；没有就不写 */}
                    {station.capacity.budgetUsagePct != null
                      ? ` · 预算已用 ${station.capacity.budgetUsagePct}%`
                      : ''}
                  </span>
                </div>
                <div
                  className="mt-1 h-1 overflow-hidden rounded-full"
                  style={{ background: 'hsl(var(--foreground) / 0.1)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(2, station.capacity.loadPct))}%`,
                      background: ACCEPTABILITY_BAR[station.capacity.acceptability],
                    }}
                  />
                </div>
                <div
                  className="mt-1 flex items-center justify-between gap-1 font-mono"
                  style={{ fontSize: 8 }}
                >
                  <span style={{ color: ACCEPTABILITY_BAR[station.capacity.acceptability] }}>
                    {ACCEPTABILITY_LABEL[station.capacity.acceptability]}
                  </span>
                  <span className="text-muted-foreground">
                    {`待决 阻塞 ${station.blocking} · 待议 ${station.advisory}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* ============================================================ */}
        {/* 3. 中间圆形精密手表表盘 (放大至 720px Central Watch Dial) */}
        {/* ============================================================ */}
        <div className="z-20">
          <CentralWatchDial
            artifacts={artifacts}
            messages={messages}
            isDark={isDark}
          />
        </div>

        {/* ============================================================ */}
        {/* 4. 右侧 4 个水平信度与记忆卡片 (保持原有丰富信息状态，水平向心排列) */}
        {/* ============================================================ */}
        {/* 卡片 1：项目信度总分 (95.4 / Level 3 准自主) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-score')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[0].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[0].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'hsl(var(--foreground) / 0.12)' : 'hsl(var(--foreground) / 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.025) 100%)'
              : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.82) 100%)',
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-bold text-xs tracking-tight">项目信度总分</span>
          </div>

          <NoMetricNote
            reason="服务端没有项目级信度聚合接口，也没有信任等级字段，故此处不显示数字。"
            where="单个 AI 同事的信度分见左侧工位卡（来自 GET /office/summary）；项目健康分见仪表盘。"
          />
        </div>

        {/* 卡片 2：契约合规率 (OpenAPI 99.2%) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-contract')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[1].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[1].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'hsl(var(--foreground) / 0.12)' : 'hsl(var(--foreground) / 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.025) 100%)'
              : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.82) 100%)',
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-xs">契约合规率 (OpenAPI)</span>
          </div>
          <NoMetricNote
            reason="契约漂移由 CI 的 contract:check 判定，其结果没有开放接口，故此处不显示百分比。"
            where="零漂移是构建结论而非运行时可读数：以 pnpm contract:check 的输出为准。"
          />
        </div>

        {/* 卡片 3：逻辑完备度与 Token ROI */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-logic')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[2].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[2].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'hsl(var(--foreground) / 0.12)' : 'hsl(var(--foreground) / 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.025) 100%)'
              : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.82) 100%)',
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-xs">逻辑完备度 / Token 产出比</span>
          </div>
          <NoMetricNote
            reason="两项评测类指标尚未实装（服务端无对应口径），故此处不显示百分比。"
            where="Token 的真实消耗见左侧工位卡的「本周 tokens · 花费」（来自 GET /office/summary）。"
          />
        </div>

        {/* 卡片 4：治理记忆星云原子 (Memory Atoms - 支持展开交互) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-memory')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[3].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[3].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'hsl(var(--foreground) / 0.12)' : 'hsl(var(--foreground) / 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.025) 100%)'
              : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.82) 100%)',
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          }}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Database className="size-3 text-accent-purple" />
              <span className="font-bold text-xs">治理记忆星云原子</span>
              {/* 条目内容是**示例剧本**（真记忆原子在「设置 · 记忆」，走 /memory 既有服务）；
                  故就地标注，不靠页头那枚隔着整屏的徽标。 */}
              <SampleTag title="以下条目为示例内容；真实记忆原子见「设置 · 记忆」（GET /memory）" />
            </div>
            <span
              className="font-mono"
              style={{
                fontSize: 8.5,
                color: isDark ? 'hsl(var(--foreground) / 0.45)' : 'hsl(var(--foreground) / 0.45)',
              }}
            >
              {memoryAtoms.length} 条
            </span>
          </div>

          {/* 全部记忆原子标签列表 */}
          <div className="flex flex-wrap gap-1">
            {memoryAtoms.map((atom) => (
              <button
                key={atom.id}
                type="button"
                onClick={() => setActiveMemory(activeMemory?.id === atom.id ? null : atom)}
                className="px-1.5 py-0.5 rounded font-mono transition-colors text-left cursor-pointer"
                style={{
                  fontSize: 8.5,
                  background:
                    activeMemory?.id === atom.id
                      ? 'linear-gradient(135deg, hsl(var(--accent-purple)), hsl(var(--accent-purple)))'
                      : isDark
                      ? 'hsl(var(--foreground) / 0.07)'
                      : 'hsl(var(--accent-purple) / 0.08)',
                  color:
                    activeMemory?.id === atom.id
                      ? 'hsl(var(--primary-foreground))'
                      : isDark
                      ? 'hsl(var(--muted-foreground))'
                      : 'hsl(var(--accent-purple))',
                }}
                title={atom.summary}
              >
                #{atom.key}
              </button>
            ))}
          </div>

          {/* 点击展开的记忆原子详情 */}
          {activeMemory && (
            <div
              className="mt-1.5 p-1.5 rounded-lg leading-relaxed border border-current/10 animate-in fade-in duration-150"
              style={{
                fontSize: 8.5,
                background: isDark ? 'hsl(var(--background) / 0.5)' : 'hsl(var(--background) / 0.9)',
              }}
            >
              <div className="flex items-center gap-1 text-accent-purple font-mono mb-0.5">
                <Info className="size-2.5" />
                {/* 原实现显示「权重 98%」——那是编造的精度：服务端权重不是这样读的，
                    也不该由前端拍一个数出来。分类是示例内容自身的属性，照留。 */}
                <span>{activeMemory.category}</span>
              </div>
              <p className="text-muted-foreground">{activeMemory.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
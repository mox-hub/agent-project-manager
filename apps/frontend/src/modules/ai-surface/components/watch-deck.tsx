import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MemoryAtom, ArtifactItem, CognitiveMessage } from '../types';
import type { StationCard as StationCardModel } from '../adapters/office-to-station';
import { CentralWatchDial } from './central-watch-dial';
import { StationCard } from './station-card';
import { SampleTag, NoMetricNote } from './sample-tag';
import { Database, Info } from 'lucide-react';

interface WatchDeckProps {
  /** 工位卡：来自 office 真实口径（`GET /office/summary`）叠加投影层进展，见 adapters/office-to-station */
  stations: StationCardModel[];
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
  /**
   * 右栏「该你了」待办区（ARCH-AISURFACE-001 §3.1 右栏）。
   * 盯盘面传挂 hook 的 `DecisionQueuePanel`，回放页传 props 驱动的 `DecisionQueuePanelView`
   * ——同一个渲染位、两个数据源，与「同一批组件，另一个数据源」的回放纪律一致。
   */
  queueSlot: ReactNode;
}

/**
 * 表盘外径的响应式取值：随视口高度收缩（高度是本页最紧的约束——顶栏/总述/泳道/dock
 * 都在纵向排队），并钳在可读下限与设计上限之间。事件期读布局（非渲染期），不违反纯度规则。
 */
const DIAL_MIN = 340;
const DIAL_MAX = 624;
const DIAL_VERTICAL_RESERVE = 400;

/** 三张「无口径」治理卡的合并呈现：同一张卡三行，每行 still 用 NoMetricNote 给出去向 */
const METRIC_BASIS_ROWS = [
  {
    id: 'score',
    title: '项目信度总分',
    reason: '服务端没有项目级信度聚合接口，也没有信任等级字段，故此处不显示数字。',
    where:
      '单个 AI 同事的信度分见左侧工位卡（来自 GET /office/summary）；项目健康分见仪表盘。',
  },
  {
    id: 'contract',
    title: '契约合规率 (OpenAPI)',
    reason: '契约漂移由 CI 的 contract:check 判定，其结果没有开放接口，故此处不显示百分比。',
    where: '零漂移是构建结论而非运行时可读数：以 pnpm contract:check 的输出为准。',
  },
  {
    id: 'logic',
    title: '逻辑完备度 / Token 产出比',
    reason: '两项评测类指标尚未实装（服务端无对应口径），故此处不显示百分比。',
    where: 'Token 的真实消耗见左侧工位卡的「本周 tokens · 花费」（来自 GET /office/summary）。',
  },
];

export function WatchDeck({
  stations,
  stationsStatus = 'ready',
  selectedAgentId,
  onSelectAgent,
  memoryAtoms,
  artifacts,
  messages,
  isDark = true,
  queueSlot,
}: WatchDeckProps) {
  const [activeMemory, setActiveMemory] = useState<MemoryAtom | null>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [dialSize, setDialSize] = useState(DIAL_MAX);

  // 表盘随视口缩放：resize 事件期读一次视口高与中栏宽（都不是渲染期读数）
  useEffect(() => {
    const compute = () => {
      const byHeight = window.innerHeight - DIAL_VERTICAL_RESERVE;
      const byWidth = centerRef.current?.clientWidth ?? DIAL_MAX;
      setDialSize(Math.max(DIAL_MIN, Math.min(DIAL_MAX, byHeight, byWidth)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div
      className="flex min-h-0 w-full flex-col gap-4 lg:h-full lg:flex-row"
      data-ai-component="ai-surface.watch-deck"
    >
      {/* ══════════════════════════════════════════════════════════════
          左栏：同事工位列（ARCH-AISURFACE-001 §3.1「左：同事工位列」）。
          三种「空」必须说清是哪种，且一律不用假人填版面（§4.7 不伪造）。
          ══════════════════════════════════════════════════════════════ */}
      <aside
        aria-label="同事工位"
        className="no-scrollbar flex w-full shrink-0 flex-col gap-2 lg:w-72 lg:min-h-0 lg:overflow-y-auto"
      >
        {stations.length === 0 ? (
          <div className="w-full rounded-xl border border-foreground/10 bg-foreground/5 p-3.5">
            <p className="mb-1 text-xs font-semibold tracking-tight">
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
        ) : (
          stations.map((station) => (
            <StationCard
              key={station.memberId}
              station={station}
              isDark={isDark}
              isSelected={selectedAgentId === station.memberId}
              onSelect={() => onSelectAgent(station.memberId)}
            />
          ))
        )}
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          中栏：中央表盘（响应尺寸）+ 治理口径合并卡。
          ══════════════════════════════════════════════════════════════ */}
      <div
        ref={centerRef}
        className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 lg:min-h-0"
      >
        <CentralWatchDial
          artifacts={artifacts}
          messages={messages}
          isDark={isDark}
          size={dialSize}
        />

        {/* 治理口径：三样「服务端没有口径」的指标合并一张卡（原为表盘右侧三张绝对定位卡）。
            清零不是留白：每行都说明该去哪看真数（S2-e 纪律，文本逐字保留）。 */}
        <div className="w-full max-w-xl rounded-xl border border-foreground/10 bg-foreground/5 p-3.5">
          <div className="flex flex-col gap-2.5">
            {METRIC_BASIS_ROWS.map((row) => (
              <div key={row.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tracking-tight">{row.title}</span>
                </div>
                <NoMetricNote reason={row.reason} where={row.where} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          右栏：该你了（待你拍板，限高内滚）+ 治理记忆原子卡。
          ══════════════════════════════════════════════════════════════ */}
      <aside
        aria-label="待你拍板与治理记忆"
        className="flex w-full shrink-0 flex-col gap-3 lg:w-80 lg:min-h-0"
      >
        <div className="min-h-0 flex-1 lg:overflow-y-auto">{queueSlot}</div>

        {/* 治理记忆星云原子：条目内容是**示例剧本**（真记忆原子在「设置 · 记忆」，
            走 /memory 既有服务），故就地标注。原为表盘右下角绝对定位卡，逐字迁移。 */}
        <div
          className="shrink-0 rounded-xl border p-3.5 backdrop-blur-2xl select-text"
          style={{
            borderColor: 'hsl(var(--foreground) / 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.025) 100%)'
              : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.82) 100%)',
            color: 'hsl(var(--foreground))',
          }}
        >
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <Database className="size-3 text-accent-purple" />
              <span className="text-xs font-semibold tracking-tight">治理记忆星云原子</span>
              <SampleTag title="以下条目为示例内容；真实记忆原子见「设置 · 记忆」（GET /memory）" />
            </div>
            <span
              className="font-mono"
              style={{
                fontSize: 8.5,
                color: 'hsl(var(--foreground) / 0.45)',
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
                className="cursor-pointer rounded-sm px-1.5 py-0.5 font-mono transition-colors text-left"
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
              className="mt-1.5 rounded-lg border border-current/10 p-1.5 leading-relaxed animate-in fade-in duration-normal"
              style={{
                fontSize: 8.5,
                background: isDark ? 'hsl(var(--background) / 0.5)' : 'hsl(var(--background) / 0.9)',
              }}
            >
              <div className="mb-0.5 flex items-center gap-1 font-mono text-accent-purple">
                <Info className="size-2.5" />
                {/* 原实现显示「权重 98%」——那是编造的精度：服务端权重不是这样读的，
                    也不该由前端拍一个数出来。分类是示例内容自身的属性，照留。 */}
                <span>{activeMemory.category}</span>
              </div>
              <p className="text-muted-foreground">{activeMemory.summary}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

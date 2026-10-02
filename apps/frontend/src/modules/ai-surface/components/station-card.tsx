import type { RuntimeUsagePayload } from '@apm/shared/events/domain-events';
import type { StationCard as StationCardModel, StationProgress } from '../adapters/office-to-station';
import { cn } from '@/lib/utils';
import { STATE_DOT } from '@/modules/assistant/components/assistant-status-dot';
import { PlayCircle } from 'lucide-react';

/**
 * 同事状态的**展示**文案。状态值本身来自服务端 `OfficeStatus` 四值（经适配器透传），
 * 这里只是中文渲染——与办公室页 `office.status.*` 一一对应，不新增档位。
 * （原实现自造了 reasoning/executing/auditing 三个服务端不存在的档位。）
 */
const OFFICE_STATUS_LABEL: Record<StationCardModel['status'], string> = {
  needYou: '需要你',
  working: '进行中',
  suggestions: '有建议',
  idle: '空闲',
};

/** 可接活度色：与办公室页 ColleagueCard 同一语义（可用/繁忙/饱和） */
const ACCEPTABILITY_BAR: Record<StationCardModel['capacity']['acceptability'], string> = {
  available: 'hsl(var(--accent-green))',
  busy: 'hsl(var(--accent-yellow))',
  saturated: 'hsl(var(--accent-red))',
};

const ACCEPTABILITY_LABEL: Record<StationCardModel['capacity']['acceptability'], string> = {
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

interface StationCardProps {
  station: StationCardModel;
  isDark: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * 同事工位卡（ARCH-AISURFACE-001 §3.1「左：同事工位列」）。
 *
 * 自旧 `RadialWatchDeck` 的绝对定位画布抽出（2026-10-02 布局重排）：内容、口径、
 * `data-ai-*` 标注逐字保留，只把「钉在表盘左侧第 N 个坐标槽」改成文档流里的一张卡——
 * 卡片自身不再携带任何几何，放多少张、放哪里由父级布局决定。
 */
export function StationCard({
  station,
  isDark,
  isSelected,
  onSelect,
}: StationCardProps) {
  return (
    <div
      data-ai-component="ai-surface.station-card"
      // 就地解释（CAP-C-07）：AISlot 靠 DOM 上的 `kind:id` 找目标。此前本面
      // **一个 data-ai-entity 都没有**，Ctrl+左键 `closest()` 恒返回 null →
      // 静默无反应（看着像功能没做，其实是没接）。`member` 已在 card-explain
      // 支持清单内，故补属性即可，服务端零改动。
      data-ai-entity={`member:${station.memberId}`}
      onClick={onSelect}
      className={cn(
        'w-full cursor-pointer select-text rounded-xl border p-3.5 backdrop-blur-2xl transition-all duration-slow shadow-xs hover:opacity-95',
      )}
      style={{
        borderColor: isSelected
          ? 'hsl(var(--accent-purple) / 0.7)'
          : 'hsl(var(--foreground) / 0.12)',
        background: isDark
          ? isSelected
            ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.14) 0%, hsl(var(--foreground) / 0.05) 100%)'
            : 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.025) 100%)'
          : isSelected
          ? 'linear-gradient(135deg, hsl(var(--background) / 0.98) 0%, hsl(var(--background) / 0.92) 100%)'
          : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.82) 100%)',
        color: 'hsl(var(--foreground))',
      }}
    >
      {/* 顶部行：头像、状态灯、姓名与状态徽标、信度分 */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="relative flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-primary-foreground"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--accent-purple)) 0%, hsl(var(--accent-purple)) 100%)',
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
              <h4 className="truncate text-xs font-semibold tracking-tight">{station.displayName}</h4>
              <span
                className="rounded-sm px-1.5 py-0.2 font-mono font-semibold"
                style={{
                  fontSize: 8.5,
                  background: isDark ? 'hsl(var(--accent-purple) / 0.2)' : 'hsl(var(--accent-purple) / 0.12)',
                  color: 'hsl(var(--accent-purple))',
                }}
              >
                {OFFICE_STATUS_LABEL[station.status]}
              </span>
            </div>
            <p
              className="truncate font-mono"
              style={{
                fontSize: 9,
                color: 'hsl(var(--foreground) / 0.6)',
              }}
            >
              {station.title ?? '—'}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          {/* 服务端没给信度分就是没有——显示破折号，不落回写死的高分 */}
          <span
            className="block font-mono font-semibold"
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
            className="block font-mono"
            style={{
              fontSize: 8,
              color: 'hsl(var(--foreground) / 0.45)',
            }}
          >
            信度
          </span>
        </div>
      </div>

      {/* 在干什么：当前执行（与办公室页 ColleagueCard 同规则：工单标题优先，退化到本次目标） */}
      <div
        className="mb-1.5 flex items-center gap-1.5 rounded-sm border border-current/10 px-2 py-1"
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
          className="mb-1.5 truncate font-mono"
          style={{ fontSize: 9, color: 'hsl(var(--foreground) / 0.8)' }}
          title={`来源事件 ${station.progress.eventName}`}
        >
          {formatStationProgress(station.progress)}
        </p>
      ) : station.run ? (
        <p
          className="mb-1.5 truncate font-mono text-muted-foreground"
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
          className="mb-1.5 truncate font-mono text-muted-foreground"
          style={{ fontSize: 8.5 }}
          title="CLI 终事件上报的单次执行用量（runtime.execution.result），非周报口径"
        >
          {formatRunFacts(station.progress)}
        </p>
      ) : null}

      {/* 容量与本周用量（与办公室页同一口径；标签必须写明"本周"） */}
      <div className="border-t border-current/10 pt-1">
        <div
          className="flex items-center justify-between gap-1 font-mono"
          style={{ fontSize: 8 }}
        >
          <span className="text-muted-foreground">
            {`并行 ${station.capacity.activeRuns}/${station.capacity.capacityLimit}`}
          </span>
          <span className="truncate text-muted-foreground" title="本周消耗（服务端聚合口径）">
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
}

import { RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DualTrackMetricPill } from '@/shared/components/dual-track-metric-pill';
import type { SurfaceNarration } from '../adapters/surface-narration';
import type { UseSurfaceNarrationResult } from '../hooks/use-surface-narration';

/**
 * 顶栏 AI 状态总述（ARCH-AISURFACE-001 §3.1「顶栏：AI 一句话总述」）。
 *
 * ## 四态各自长什么样（不能混）
 *
 * | state | 呈现 |
 * |-------|------|
 * | `idle` | **不渲染**——没有事实可讲时不占位，也不说"暂无"来填坑 |
 * | `pending` | 一行"正在读盘…"，明确这是**等待中**而不是结论 |
 * | `ready` | AI 总述 + 动态 + 阻塞 + 缺口 |
 * | `degraded` | 同上，但**就地**挂「规则生成的摘要」并说明原因 |
 *
 * ## 三条纪律
 *
 * 1. **降级就是降级**：`degraded` 必须打标（§3.3 约束③）。不标注会让人把规则拼出来的
 *    句子当成 AI 的判断——那是"降级"里最坏的一种失败：功能没挂，可信度挂了。
 * 2. **开销可见**：叙述自己花的 token/成本经 `DualTrackMetricPill` 显示（§3.3 约束②）。
 *    `costUsd` 为 `null`（估价口径不可用）时**不传**该字段，宁可不显示也不写 `$0.00`。
 * 3. **这里不是第二个拍板入口**：`needsYou` 只呈现**为什么需要你**（一句话），
 *    不带任何按钮、不落任何写路径——真正拍板仍在右栏决策卡（§3.2 纪律）。
 */
export function SurfaceNarrationBar({
  narration,
  state,
  degradedNote,
  generatedAt,
  usage,
  onRefresh,
  className,
}: {
  narration: SurfaceNarration | null;
  state: UseSurfaceNarrationResult['state'];
  degradedNote?: string;
  generatedAt?: number | null;
  usage?: UseSurfaceNarrationResult['usage'];
  onRefresh?: () => void;
  className?: string;
}) {
  // 没有事实可讲：不占位（§4.7「无数据就显示无数据」，但这里连"没有"都不必说——
  // 屏幕上已经能看出没有同事/没有待办，再补一句是噪音）
  if (state === 'idle' || (!narration && state !== 'pending')) return null;

  return (
    <section
      className={cn('w-full', className)}
      data-ai-component="ai-surface.narration"
      data-ai-role="panel"
      data-narration-source={narration?.source ?? 'pending'}
      aria-label="AI 状态总述"
    >
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5">
        {state === 'pending' || !narration ? (
          <p className="text-11 text-muted-foreground">正在读盘…</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
                <p className="text-xs font-medium leading-snug text-foreground">
                  {narration.headline}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <NarrationProvenance
                  source={narration.source}
                  degradedNote={degradedNote}
                  generatedAt={generatedAt ?? null}
                />
                {usage ? (
                  <DualTrackMetricPill
                    tokens={usage.totalTokens}
                    // null = 估价口径不可用 → 不传，pill 不渲染金额（不写 $0.00）
                    costUsd={usage.costUsd ?? undefined}
                    model={usage.model}
                  />
                ) : null}
                {onRefresh ? (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="重新读盘（会消耗一次模型调用）"
                    data-ai-action="ai-surface.narration.refresh"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                ) : null}
              </div>
            </div>

            {narration.highlights.length > 0 && (
              <ul className="space-y-0.5 pl-5.5">
                {narration.highlights.map((line) => (
                  <li key={line} className="text-11 text-muted-foreground">
                    · {line}
                  </li>
                ))}
              </ul>
            )}

            {narration.blockers.length > 0 && (
              <ul className="space-y-0.5 pl-5.5">
                {narration.blockers.map((blocker) => (
                  <li
                    key={`${blocker.what}-${blocker.who ?? ''}`}
                    className="text-11 text-muted-foreground"
                  >
                    <span className="text-accent-red">▲</span> {blocker.what}
                    {blocker.who ? `（${blocker.who}）` : ''}
                    {blocker.why ? ` — ${blocker.why}` : ''}
                  </li>
                ))}
              </ul>
            )}

            {/* 「为什么需要你」——只有理由，没有动作（拍板入口仍在右栏） */}
            {narration.needsYou.length > 0 && (
              <ul className="space-y-0.5 pl-5.5">
                {narration.needsYou.slice(0, 2).map((item) => (
                  <li key={item.decisionId} className="text-11 text-muted-foreground">
                    <span className="text-accent-purple">■</span> 等你拍板：
                    {item.oneLineWhy ?? item.decisionId}
                  </li>
                ))}
              </ul>
            )}

            {narration.honestGaps.length > 0 && (
              <ul className="space-y-0.5 pl-5.5">
                {narration.honestGaps.map((gap) => (
                  <li key={gap} className="font-mono text-10 text-muted-foreground/80">
                    ⓘ {gap}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** 出处标注：AI / 规则生成 + 生成时刻；降级时必须显式说明"为什么是规则生成的" */
function NarrationProvenance({
  source,
  degradedNote,
  generatedAt,
}: {
  source: SurfaceNarration['source'];
  degradedNote?: string;
  generatedAt: number | null;
}) {
  const age = generatedAt ? formatAge(generatedAt) : null;
  const timeTitle = generatedAt
    ? `生成于 ${new Date(generatedAt).toLocaleString()}`
    : undefined;

  if (source === 'template') {
    return (
      <span
        className="flex items-center gap-1 font-mono text-10"
        title={degradedNote ?? '以下为规则生成的摘要'}
        data-ai-component="ai-surface.narration.degraded-tag"
      >
        <span className="rounded-full bg-accent-yellow/15 px-1.5 py-0.5 font-medium text-accent-yellow">
          规则生成的摘要
        </span>
        {age ? <span className="text-muted-foreground" title={timeTitle}>{age}</span> : null}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 font-mono text-10 text-muted-foreground">
      <span title="本段由 AI 依据同屏事实翻译生成，未做任何计算">AI 读盘</span>
      {age ? <span title={timeTitle}>{age}</span> : null}
    </span>
  );
}

/** 生成时刻人话化（与进展列的等待时长同口径：不足 1 分钟说"刚刚"） */
function formatAge(at: number, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - at) / 60000));
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

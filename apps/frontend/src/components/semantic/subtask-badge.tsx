/**
 * SubtaskBadge - 子任务进度徽章（Task Atoms 套件 · 22px 外框标准）
 *
 * 行尾「进度环 + 计数」胶囊：左侧进度环与左/上/下边框等距贴合
 * （环 18px，四周间隙统一 2px = pl-0.5 + 垂直居中余量），右侧计数放大至 text-xs。
 * 提取自 task-rows / task-simple-list / 设计系统画廊的三份重复实现（2026-09-29）。
 *
 * props 面封闭（G8）：不接 className，形态由组件基线负责。
 */
import { cn } from '@/lib/utils';

function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 18;
  const r = (size - 2.75) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = total > 0 ? done / total : 0;
  const stroke =
    ratio === 1
      ? 'hsl(var(--accent-green))'
      : ratio > 0
        ? 'hsl(var(--accent-blue))'
        : 'hsl(var(--muted-foreground))';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground/20" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="2.75"
        strokeDasharray={`${ratio * circ} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SubtaskBadge({ done, total }: { done: number; total: number }) {
  return (
    <span
      title={`子任务 ${done}/${total}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 h-5.5 pl-0.5 pr-2 ml-1.5',
        'rounded-md border border-border/80 bg-muted/50 font-mono font-medium text-muted-foreground',
      )}
    >
      <ProgressRing done={done} total={total} />
      <span className="text-xs">{done}/{total}</span>
    </span>
  );
}

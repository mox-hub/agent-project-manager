import { cn } from '@/lib/utils';

/**
 * 「示例」就地标注（S2-e）。
 *
 * ## 为什么要就地
 *
 * S2-b 之前全页只有一枚挂在页头的「示例数据」徽标。问题不在于写了什么，而在于**位置**：
 * 徽标在页头、编造的数字在表盘里，中间隔着一整屏——读者的视线落到 `99.2%` 时，
 * 那枚徽标早已不在视野内。徽标的射程 ≠ 读者的视线射程，于是"标注了"并不等于"没误导"。
 *
 * 真数据逐块进来后，页头徽标按区域**逐个摘除**（工位卡 S2-b / 六站泳道 S2-c / 待办区 S2-d），
 * 剩下的示例区域改为在此就地打标：标注长在区域标题旁边，与那个数字同屏同框。
 *
 * ## 纪律：标注 ≠ 开脱
 *
 * 本组件只用于**确认是示例剧本**的内容（叙事、清单、条目）。凡「长得像实时遥测、
 * 实际没有口径」的呈现，一律**清零**而不是拿这个标签兜底——把编造数字标成"示例"
 * 仍然是拿假数据占着真数据的位置（§4.7 不伪造：无数据就显示无数据）。
 */
export function SampleTag({ className, title }: { className?: string; title?: string }) {
  return (
    <span
      data-ai-component="ai-surface.sample-tag"
      className={cn(
        'shrink-0 rounded-full bg-accent-yellow/15 px-1.5 py-0.5 font-mono text-10 font-medium text-accent-yellow',
        className,
      )}
      title={title ?? '本区域内容为示例演示，尚未接入真实数据源'}
    >
      示例
    </span>
  );
}

/**
 * 「无该口径」占位（S2-e）。
 *
 * 与 `SampleTag` 分工明确：
 * · `SampleTag` = 这里**有**内容，内容是示例剧本；
 * · `NoMetricNote` = 这里**没有**数据，据此不显示任何数字。
 *
 * 后者是"无数据就显示无数据"的落地形态：它必须给出**去向**（该数在哪个真实页面/模块），
 * 否则读者只知道"这里没有"，不知道该去哪儿看。
 */
export function NoMetricNote({ reason, where }: { reason: string; where?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground" style={{ fontSize: 9 }}>
        {reason}
      </p>
      {where ? (
        <p className="text-muted-foreground" style={{ fontSize: 8.5, opacity: 0.75 }}>
          {where}
        </p>
      ) : null}
    </div>
  );
}

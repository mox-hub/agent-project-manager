import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/shared/lib/date-format';
import { TONE_LIGHT_CLASS, type StatusTone } from '@/shared/status/status-visuals';
import { useSurfaceFreshness } from '../hooks/use-surface-feed';

/**
 * 面级实时信号灯（ARCH-AISURFACE-001 §4.1 断连 / §3.1 诚实粒度）。
 *
 * 只报三个**真实**事实，一个都不推算：
 * - `connected`：WS 连接态（来自 EventClient 的 connected / disconnected 伪事件）
 * - `staleDropped`：因乱序（迟到）被丢弃的条数——显式可见，**不静默**
 * - `lastEventAt`：最近一次收到实时事件的真实时刻
 *
 * 刻意**不做**的三件事：不显示"延迟 N ms"（没有 RTT 口径）、不报事件速率
 * （事件级粒度下没有分母）、不把丢弃条数渲染成百分比。宁可少报，不可造报。
 */
export function SurfaceLiveness() {
  const { connected, lastEventAt, staleDropped } = useSurfaceFreshness();
  const tone: StatusTone = connected ? 'success' : 'danger';

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-11',
          TONE_LIGHT_CLASS[tone],
        )}
        title={
          connected
            ? '实时通道已连接：进展随领域事件推送更新'
            : '实时通道已断开：数据可能滞后；重连后会自动重取快照对齐'
        }
      >
        <Radio className={cn('size-3', connected && 'animate-pulse')} />
        <span>{connected ? '实时' : '实时已断开'}</span>
      </div>

      {/* 乱序丢弃不静默：有丢就显式报出来（含条数），让"没看到某条"可被追责 */}
      {staleDropped > 0 && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-10',
            TONE_LIGHT_CLASS.warning,
          )}
          title="乱序（迟到）事件已被丢弃，未覆盖较新的状态；此处为累计条数"
        >
          {`乱序丢弃 ${staleDropped}`}
        </span>
      )}

      {/* 断开时**不**显示新鲜度：那会让"最后一次事件很新"读成"现在是活的"，属误导 */}
      {connected && lastEventAt !== null && (
        <span
          className="font-mono text-10 text-muted-foreground"
          title="最近一次收到实时事件的时刻"
        >
          {`最近事件 ${formatRelativeTime(new Date(lastEventAt))}`}
        </span>
      )}
    </div>
  );
}

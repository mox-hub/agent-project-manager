import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_LIGHT_CLASS } from '@/shared/status/status-visuals';
import { usePipelineProjectFilter } from '@/shared/layout/pipeline-focus';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import type { Decision } from '@/shared/decision-card/types';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';
import { useDecisionQueue, type DecisionQueue } from '../hooks/use-decision-queue';

/**
 * 「该你了」待办区（ARCH-AISURFACE-001 §3.1 右栏 / §3.2 待拍板决策卡就地展开）。
 *
 * ## 纪律：不开第二个拍板入口
 *
 * 展开态直接复用 `DecisionCard`（= `DecisionCardShell` 五段式 + 各 kind 槽位），
 * 决议经 `useResolveDecision` → **既有**端点（approval / acceptance / proposals
 * 各自的原生写路径）。本组件**不**自建动作栏、**不**直连 api、**不**改决策语义——
 * 「就地拍板」的增量价值只是**不跳页**，写路径必须与决策收件箱完全一致。
 *
 * ## 诚实粒度
 *
 * · 三类「空」分开说：读取中 / 读取失败 / 确实没有待你拍板的事；
 * · 分页截断如实报（`另有 N 项未显示`），不假装列表就是全部；
 * · 等待时长由真实 `createdAt` 推出，**不**编造"剩余时限"（无该字段）。
 */

/**
 * 等待时长人话化；`createdAt` 不可解析时返回 null（→ 显示破折号，不猜）。
 *
 * 参考时刻缺省取当前时刻。**取默认值这件事刻意留在函数体里**：读时钟是个不纯操作，
 * 而 React 的纯度规则禁止在渲染期直接调用（`react-hooks/purity` 会直接报错）。
 * 调用方若要一个非"现在"的参考时刻（回放态取**剧本时钟**），必须显式传 `nowMs`。
 */
export function formatWaiting(createdAt: string, nowMs?: number): string | null {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return null;
  const now = nowMs ?? Date.now();
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时`;
  return `${Math.floor(hours / 24)} 天`;
}

export function DecisionQueuePanel() {
  const { focusProjectId } = usePipelineProjectFilter();
  const { queue, isPending, isError } = useDecisionQueue(focusProjectId ?? undefined);
  // 与收件箱**同一个**动作接线（含成功/失败 toast）——不在此另写一份 mutate
  const { handleAction, busyId } = useDecisionActions();

  return (
    <DecisionQueuePanelView
      queue={queue}
      isPending={isPending}
      isError={isError}
      sourceNote="来自决策收件箱同一端点"
      onAction={handleAction}
      busyId={busyId}
    />
  );
}

/**
 * 待办区的**渲染本体**：只吃 props，不碰任何 hook。
 *
 * 抽出它的是 S5 回放：回放要放**同一块待办区**，但数据来自剧本帧。理由同泳道
 * （见 `pipeline-lane-strip.tsx`）——演示给新手看的那块界面，必须就是真实项目里
 * 那一块，而不是"照着它另画的一块"。
 *
 * ## `readOnly`：回放里不能有能按的动作键
 *
 * 剧本里的决策是**已发生事实的复述**，其 `id` 在服务端并不存在。若照常渲染动作栏，
 * 点下去的每一下都是"看起来批了、其实什么都没落"——正是 S2-e 删掉那个假「准入」
 * 按钮时定下的同一类错误。故回放态**整条动作栏不渲染**，并在原处写明为什么。
 */
export function DecisionQueuePanelView({
  queue,
  isPending,
  isError,
  sourceNote,
  onAction,
  busyId,
  readOnly = false,
  readOnlyNote,
  waitingNowMs,
}: {
  queue: DecisionQueue;
  isPending: boolean;
  isError: boolean;
  /** 表头出处注脚。回放态必须写明数据不是从收件箱取的 */
  sourceNote: string;
  onAction: (action: string, d: Decision, opts?: { reason?: string; answer?: string }) => void;
  busyId: string | null;
  /** 只读预览（回放）：不渲染动作栏 */
  readOnly?: boolean;
  /** 只读时在原动作栏位置给出的说明（调用方给文案，避免为回放另起 i18n 管道） */
  readOnlyNote?: string;
  /**
   * 「等待时长」的参考时刻，缺省取当前时刻。
   *
   * 回放态必须传**剧本时刻**：等待时长是 `createdAt` 与"现在"的差值，而在回放里
   * 唯一有意义的时钟是剧本自己的时钟。若沿用墙上时间，一条剧本里刚出现的待办会
   * 显示「等了 4 天」——一个精确、具体、而且与屏幕上其他每一处都矛盾的读数。
   */
  waitingNowMs?: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 表头状态是**出处/健康**注脚，正文才是内容态——两者措辞须不同，
  // 否则同一句话在一屏里出现两遍（读起来像复读，也让人分不清是哪一层的状态）
  const statusText = isError
    ? '待办读取失败（不显示占位数据）'
    : isPending
      ? '读取中'
      : sourceNote;

  return (
    <section
      className="w-full"
      data-ai-component="ai-surface.decision-queue"
      data-ai-role="panel"
      aria-label="待你拍板"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-11 font-semibold tracking-tight text-foreground">该你了</h2>
          {!isPending && !isError && (
            <span className="flex items-center gap-1 font-mono text-10">
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5',
                  queue.blocking > 0 ? TONE_LIGHT_CLASS.danger : TONE_LIGHT_CLASS.success,
                )}
                title="紧迫度 blocking：执行已暂停等待裁决"
              >
                阻断 {queue.blocking}
              </span>
              <span
                className={cn('rounded-full px-1.5 py-0.5', TONE_LIGHT_CLASS.default)}
                title="紧迫度 advisory：排队判断题，不挡其他工作推进"
              >
                排队 {queue.advisory}
              </span>
            </span>
          )}
        </div>
        <span className="font-mono text-10 text-muted-foreground">{statusText}</span>
      </div>

      {isError ? (
        <p className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-3 text-11 text-muted-foreground">
          待你拍板的事项读取失败。不显示占位条目，以免被当成真实待办；请检查网络或稍后重试。
        </p>
      ) : isPending ? (
        <p className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-3 text-11 text-muted-foreground">
          正在读取待办…
        </p>
      ) : queue.items.length === 0 ? (
        <p className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-3 text-11 text-muted-foreground">
          没有待你拍板的事项
        </p>
      ) : (
        <ul className="space-y-1.5">
          {queue.items.map((decision) => (
            <QueueRow
              key={decision.id}
              decision={decision}
              expanded={expandedId === decision.id}
              busy={busyId === decision.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === decision.id ? null : decision.id))
              }
              onAction={onAction}
              readOnly={readOnly}
              readOnlyNote={readOnlyNote}
              waitingNowMs={waitingNowMs}
            />
          ))}
        </ul>
      )}

      {queue.hiddenCount > 0 && (
        <p className="mt-1.5 px-1 font-mono text-10 text-muted-foreground">
          {`另有 ${queue.hiddenCount} 项未显示（本次取出 ${queue.items.length} / 共 ${queue.total}）`}
        </p>
      )}
    </section>
  );
}

function QueueRow({
  decision,
  expanded,
  busy,
  onToggle,
  onAction,
  readOnly,
  readOnlyNote,
  waitingNowMs,
}: {
  decision: Decision;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onAction: (action: string, d: Decision, opts?: { reason?: string; answer?: string }) => void;
  readOnly: boolean;
  readOnlyNote?: string;
  waitingNowMs?: number;
}) {
  const isBlocking = decision.urgency === 'blocking';
  const waiting = formatWaiting(decision.createdAt, waitingNowMs);

  return (
    <li
      className={cn(
        'overflow-hidden rounded-xl border border-foreground/10 bg-foreground/5',
        isBlocking && 'border-l-2 border-l-accent-red',
      )}
      data-ai-component="ai-surface.decision-row"
      data-decision-id={decision.id}
      // 就地解释（CAP-C-07）：行本身此前只有 `data-decision-id`，而 AISlot 读的是
      // `data-ai-entity` 的 `kind:id`——**收起状态**下 Ctrl+左键无效（展开后是
      // DecisionCardShell 带出来的同名属性，属另一条路径）。这里补的是"没展开也想问"
      // 的那一半。注意前缀：决策卡壳的既有约定是 `decision:`，不能裸用 data-decision-id
      data-ai-entity={`decision:${decision.id}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-foreground/10"
        aria-expanded={expanded}
        data-ai-action={`ai-surface.decision.${decision.kind}.toggle`}
      >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-10',
            isBlocking ? TONE_LIGHT_CLASS.danger : TONE_LIGHT_CLASS.default,
          )}
        >
          {decision.kind}
        </span>
        <span className="min-w-0 flex-1 truncate text-11 text-foreground">{decision.title}</span>
        {decision.projectName ? (
          <span className="shrink-0 font-mono text-10 text-muted-foreground">
            {decision.projectName}
          </span>
        ) : null}
        {/* 等待时长由真实 createdAt 推出；不可解析时给破折号，不猜 */}
        <span
          className="shrink-0 font-mono text-10 text-muted-foreground"
          title={`创建于 ${decision.createdAt}`}
        >
          {waiting ?? '—'}
        </span>
      </button>

      {/* 就地展开：既有决策卡文法（五段式 + 各 kind 槽位），写路径同收件箱 */}
      {expanded && (
        <div className="px-2.5 pb-2.5">
          <DecisionCard
            decision={decision}
            onAction={onAction}
            busy={busy}
            readOnly={readOnly}
            readOnlyNote={readOnlyNote}
          />
        </div>
      )}
    </li>
  );
}

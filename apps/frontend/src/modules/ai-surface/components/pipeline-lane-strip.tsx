import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TONE_LIGHT_CLASS } from '@/shared/status/status-visuals';
import { usePipelineProjectFilter } from '@/shared/layout/pipeline-focus';
import { usePipelineLanes, type PipelineLane } from '../hooks/use-pipeline-lanes';

/**
 * 六站管道泳道（ARCH-AISURFACE-001 §3.1「中：六站管道泳道」）。
 *
 * 站清单与顺序来自 `PIPELINE_STAGES`（唯一定义源），计数逐一取自各站**既有**服务。
 * 本组件只做渲染与导航，没有任何写死的数字。
 *
 * ## 两种「空」必须长得不一样
 *
 * - `0` = 服务端确实说了零（有口径、值为 0）
 * - `—` = **没有口径**或还没取到（鼠标悬停给出原因与来源端点）
 *
 * 二者若同样渲染成空白或同样渲染成 0，都会把「查不到」读成「一条都没有」——
 * 这正是本页原先把硬编码数字当实时数据时犯的错，此处不重犯。
 */
export function PipelineLaneStrip() {
  const navigate = useNavigate();
  const { focusProjectId } = usePipelineProjectFilter();
  const { lanes, isPending, isError } = usePipelineLanes(focusProjectId ?? undefined);

  const openStage = (lane: PipelineLane) => {
    // 保持项目聚焦：管道六站本就以 ?project 联动（CAP-A-15）
    navigate(focusProjectId ? `${lane.to}?project=${focusProjectId}` : lane.to);
  };

  return (
    <PipelineLaneStripView
      lanes={lanes}
      scopeNote={focusProjectId ? '项目聚焦' : '全部项目'}
      // 拓扑/取数状态如实报：未就绪时破折号是"还没取到"，不是"没有"
      statusNote={
        isError ? '部分站取数失败（破折号=未取到）' : isPending ? '正在取数…' : '取自各站既有服务'
      }
      onOpenStage={openStage}
    />
  );
}

/**
 * 泳道的**渲染本体**：只吃 props，不碰任何 hook。
 *
 * 抽出它的是 S5 回放：回放态要放**同一块泳道**，但数据来自剧本帧而不是各站服务。
 * 若给回放另画一块"看起来一样"的泳道，两份渲染迟早会长歪（一处改了数字排版、
 * 另一处没改），于是演示给新手看的界面与真实项目里那个**不是同一个东西**——
 * 而演示的全部价值就在于"你看到的就是你会得到的"。故此处一条渲染路径、两个数据源。
 */
export function PipelineLaneStripView({
  lanes,
  scopeNote,
  statusNote,
  onOpenStage,
}: {
  lanes: PipelineLane[];
  /** 左上角范围注脚（项目聚焦 / 全部项目 / 回放剧本） */
  scopeNote: string;
  /** 右上角取数状态注脚——回放态必须写明数据不是取的 */
  statusNote: string;
  onOpenStage: (lane: PipelineLane) => void;
}) {
  return (
    <section
      className="w-full"
      data-ai-component="ai-surface.pipeline-lane-strip"
      data-ai-role="panel"
      aria-label="六站管道泳道"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-11 font-semibold tracking-tight text-foreground">六站管道</h2>
          <span className="font-mono text-10 text-muted-foreground">{scopeNote}</span>
        </div>
        <span className="font-mono text-10 text-muted-foreground">{statusNote}</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {lanes.map((lane) => (
          <button
            key={lane.to}
            type="button"
            onClick={() => onOpenStage(lane)}
            className={cn(
              'group flex cursor-pointer flex-col gap-1 rounded-xl border border-foreground/10 px-2.5 py-2 text-left transition-colors',
              'bg-foreground/5 hover:bg-foreground/10',
            )}
            title={`${lane.label}（${lane.hint}）· 计数来源 ${lane.source}`}
            data-ai-action={`ai-surface.pipeline.${lane.stageNumber}.click`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-10 text-muted-foreground">{lane.stageNumber}</span>
              <span className="truncate text-11 font-semibold text-foreground">{lane.label}</span>
            </div>

            <div className="flex items-baseline justify-between gap-1">
              {/* count === null → 破折号（无口径/未取到），绝不当 0 渲染 */}
              <span className="font-mono text-sm font-bold text-foreground">
                {lane.count ?? '—'}
              </span>
              <BlockedBadge lane={lane} />
            </div>

            <span className="truncate font-mono text-10 text-muted-foreground">{lane.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** 阻塞格：有口径给数字（0 也如实写 0），无口径给破折号并把原因挂在悬停上 */
function BlockedBadge({ lane }: { lane: PipelineLane }) {
  if (lane.blocked === null) {
    return (
      <span
        className="font-mono text-10 text-muted-foreground"
        title={`无阻塞计数口径：${lane.blockedNote ?? '未接入'}（这不等于"无阻塞"）`}
      >
        阻塞 —
      </span>
    );
  }

  const scope = lane.blockedScopeNote ? ` · ${lane.blockedScopeNote}` : '';
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 font-mono text-10',
        lane.blocked > 0 ? TONE_LIGHT_CLASS.danger : TONE_LIGHT_CLASS.success,
      )}
      title={`阻塞 ${lane.blocked}${scope} · 来源 ${lane.source}`}
    >
      {`阻塞 ${lane.blocked}`}
    </span>
  );
}

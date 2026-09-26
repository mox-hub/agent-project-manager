/**
 * Workflow 运行阶段时间线（CAP-S-03 呈现层，ZCode 工作流卡形态复刻）。
 * 横向站列：每站纵向分组（站头行 = 状态灯+站名+徽标；站下 = 执行药丸列），
 * 站间连接线对齐站头行中线。状态灯语义：done 绿 / failed 红 / running 黄
 * 脉冲 / waiting 黄 / pending·skipped 空心。
 */
import {
  Bot,
  CheckCircle2,
  CircleDashed,
  Clock,
  GitBranch,
  Globe,
  Layers,
  Repeat,
  Sparkles,
  UserCheck,
  Workflow,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { RunPill, RunStation, StationStatus } from './run-view/build-run-view';

const STATION_LAMP: Record<StationStatus, string> = {
  done: 'bg-accent-green',
  failed: 'bg-accent-red',
  running: 'bg-accent-yellow animate-pulse',
  waiting: 'bg-accent-yellow',
  pending: 'border border-muted-foreground/40 bg-transparent',
  skipped: 'border border-muted-foreground/40 bg-transparent',
};

/** 节点类型 → 瓦片图标与语义色底（与画布 STEP_NODE_STYLE 同色系，v2 型扩展） */
const NODE_TYPE_META: Record<string, { icon: LucideIcon; tile: string }> = {
  llm: { icon: Sparkles, tile: 'bg-accent-purple/15 text-accent-purple' },
  agent: { icon: Bot, tile: 'bg-accent-blue/15 text-accent-blue' },
  human: { icon: UserCheck, tile: 'bg-accent-yellow/15 text-accent-yellow' },
  'human-confirm': { icon: UserCheck, tile: 'bg-accent-yellow/15 text-accent-yellow' },
  action: { icon: Wrench, tile: 'bg-accent-green/15 text-accent-green' },
  condition: { icon: GitBranch, tile: 'bg-accent-orange/15 text-accent-orange' },
  'fan-out': { icon: Layers, tile: 'bg-accent-blue/15 text-accent-blue' },
  loop: { icon: Repeat, tile: 'bg-accent-purple/15 text-accent-purple' },
  wait: { icon: Clock, tile: 'bg-muted text-muted-foreground' },
  http: { icon: Globe, tile: 'bg-accent-blue/15 text-accent-blue' },
};

const FALLBACK_META = { icon: Workflow, tile: 'bg-muted text-muted-foreground' };

const PILL_TAIL: Record<string, { icon: LucideIcon; className: string; spin?: boolean }> = {
  succeeded: { icon: CheckCircle2, className: 'text-accent-green' },
  failed: { icon: XCircle, className: 'text-accent-red' },
  running: { icon: CircleDashed, className: 'text-accent-blue', spin: true },
  waiting: { icon: UserCheck, className: 'text-accent-yellow' },
  skipped: { icon: CircleDashed, className: 'text-muted-foreground' },
};

function PillTailIcon({ status }: { status: string }) {
  const meta = PILL_TAIL[status] ?? PILL_TAIL.running;
  const Icon = meta.icon;
  return (
    <Icon
      className={cn('size-3.5 shrink-0', meta.className, meta.spin && 'animate-spin')}
      aria-hidden
    />
  );
}

function RunPillRow({ pill }: { pill: RunPill }) {
  const meta = NODE_TYPE_META[pill.type] ?? FALLBACK_META;
  const TileIcon = meta.icon;
  return (
    <div
      className="flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2"
      title={pill.error ?? undefined}
      data-ai-entity={`workflow-node:${pill.key}`}
    >
      <span
        className={cn('flex size-4 shrink-0 items-center justify-center rounded', meta.tile)}
        aria-hidden
      >
        <TileIcon className="size-2.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs">{pill.label}</span>
      <PillTailIcon status={pill.status} />
    </div>
  );
}

function StationHead({ station }: { station: RunStation }) {
  const { t } = useTranslation();
  return (
    <div className="flex w-42 items-center gap-1.5">
      <span
        className={cn('size-2.5 shrink-0 rounded-full', STATION_LAMP[station.status])}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{station.title}</span>
      {station.rounds > 0 ? (
        <span
          className="flex shrink-0 items-center gap-0.5 text-10 font-mono tabular-nums text-muted-foreground"
          title={t('workflow.runPanel.loopRounds', { count: station.rounds })}
        >
          <Repeat className="size-3" aria-hidden />
          {station.rounds}
        </span>
      ) : null}
      {station.total > 0 ? (
        <span className="shrink-0 text-10 font-mono tabular-nums text-muted-foreground">
          {station.settled}/{station.total}
        </span>
      ) : null}
    </div>
  );
}

export function WorkflowRunTimeline({
  stations,
  expanded = true,
}: {
  stations: RunStation[];
  /** 收起时只显示轨道行，藏药丸列（ZCode 折叠语义） */
  expanded?: boolean;
}) {
  if (stations.length === 0) return null;
  return (
    <div className="overflow-x-auto pb-1" data-ai="workflow.run.timeline">
      <div className="flex min-w-max items-start">
        {stations.map((station, index) => (
          <div key={station.id} className="flex items-start">
            {index > 0 ? (
              <div className="w-6 shrink-0 pt-2" aria-hidden>
                <span className="block h-px w-full bg-border" />
              </div>
            ) : null}
            <div className="flex flex-col">
              <StationHead station={station} />
              {expanded && station.pills.length > 0 ? (
                <div className="mt-1.5 flex w-42 flex-col gap-1.5">
                  {station.pills.map((pill) => (
                    <RunPillRow key={pill.key} pill={pill} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

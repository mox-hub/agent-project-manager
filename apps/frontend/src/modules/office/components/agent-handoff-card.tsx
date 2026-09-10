import { ArrowRight, CheckCircle2, Clock, FileCode, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DualTrackMetricPill } from '@/shared/components/dual-track-metric-pill';

export interface HandoffGate {
  id: string;
  label: string;
  status: 'passed' | 'pending' | 'blocked';
}

export interface AgentHandoffCardProps {
  fromAgent: { name: string; role: string };
  toAgent: { name: string; role: string };
  artifact: { title: string; type: string; path?: string };
  description?: string;
  gates: HandoffGate[];
  metrics?: { tokens?: number; durationMs?: number; costUsd?: number };
  className?: string;
}

/**
 * AgentHandoffCard - [AI] 多 Agent 协作交接卡 (DESIGN.md §6.1)
 * 清晰展示多 Agent 间的工件流转与 3 项工程治理验收门禁，打破协作黑盒。
 */
export function AgentHandoffCard({
  fromAgent,
  toAgent,
  artifact,
  description,
  gates,
  metrics,
  className,
}: AgentHandoffCardProps) {
  const getGateBadge = (status: HandoffGate['status']) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-accent-green-light px-1.5 py-0.5 text-10 font-medium text-accent-green">
            <CheckCircle2 className="size-3" /> 已就绪
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-accent-red-light px-1.5 py-0.5 text-10 font-medium text-accent-red">
            <ShieldAlert className="size-3" /> 阻断
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-10 font-medium text-content-text-muted">
            <Clock className="size-3" /> 校验中
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-3 shadow-xs transition-colors hover:border-border',
        className,
      )}
      data-ai-component="agent-handoff-card"
    >
      {/* 头部：Agent 流转链路 */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-medium text-content-text">
            <Sparkles className="size-3 text-accent-purple" />
            {fromAgent.name}
            <span className="text-10 text-content-text-muted">({fromAgent.role})</span>
          </span>
          <ArrowRight className="size-3 text-content-text-muted shrink-0" />
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-medium text-content-text">
            {toAgent.name}
            <span className="text-10 text-content-text-muted">({toAgent.role})</span>
          </span>
        </div>
        <span className="rounded bg-accent-blue-light/60 px-1.5 py-0.5 text-10 font-medium text-accent-blue">
          Handoff
        </span>
      </div>

      {/* 工件与说明 */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-content-text">
          <FileCode className="size-4 shrink-0 text-accent-blue" />
          <span className="truncate">{artifact.title}</span>
          <span className="rounded bg-muted/60 px-1 font-mono text-10 text-content-text-muted">
            {artifact.type}
          </span>
        </div>
        {description && (
          <p className="text-xs text-content-text-muted leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* 治理门禁横排 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-content-bg-secondary/40 p-2 text-11">
        <span className="text-10 font-semibold text-content-text-muted uppercase">
          治理门禁:
        </span>
        {gates.map((g) => (
          <div key={g.id} className="flex items-center gap-1">
            <span className="text-content-text-secondary">{g.label}</span>
            {getGateBadge(g.status)}
          </div>
        ))}
      </div>

      {/* 底部指标微卡 */}
      {metrics && (
        <div className="flex items-center justify-end pt-1">
          <DualTrackMetricPill
            tokens={metrics.tokens}
            durationMs={metrics.durationMs}
            costUsd={metrics.costUsd}
          />
        </div>
      )}
    </div>
  );
}

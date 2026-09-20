/**
 * Workflow 节点画布（CAP-A-12）：definition 步骤链 → React Flow 节点图。
 * 转换器 stepsToFlow 是纯函数（可独立测试）；节点形态按步骤类型区分，
 * human-confirm 高亮（人工闸门语义），condition 预留分支形态（文法 v2 扩展点）。
 * 节点带 Handle 连接点（边的挂载位）+ 类型图标 + 描述行；MiniMap 左下角预览小窗。
 */
import { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Globe, GitBranch, UserCheck, Sparkles, PlayCircle, Flag, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** 步骤摘要形状（definition.steps[] 成员的展示最小集，desc 由调用方算好传入） */
export interface CanvasStep {
  id: string;
  type: string;
  title?: string;
  /** 描述行（prompt/url/message 摘要等，调用方按类型生成） */
  desc?: string;
}

interface FlowShape {
  nodes: Node[];
  edges: Edge[];
}

const STEP_NODE_STYLE: Record<
  string,
  { icon: typeof Sparkles; className: string; handleClass: string; labelKey: string }
> = {
  llm: {
    icon: Sparkles,
    className: 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple',
    handleClass: 'bg-accent-purple/60',
    labelKey: 'workflow.canvas.step.llm',
  },
  'human-confirm': {
    // 人工确认节点图标=UserCheck（ShieldCheck 三方重叠裁决：ShieldCheck 保留给验收实体）
    icon: UserCheck,
    className: 'border-accent-yellow/50 bg-accent-yellow/10 text-accent-yellow',
    handleClass: 'bg-accent-yellow/60',
    labelKey: 'workflow.canvas.step.humanConfirm',
  },
  http: {
    icon: Globe,
    className: 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue',
    handleClass: 'bg-accent-blue/60',
    labelKey: 'workflow.canvas.step.http',
  },
  condition: {
    icon: GitBranch,
    className: 'border-accent-orange/40 bg-accent-orange/10 text-accent-orange',
    handleClass: 'bg-accent-orange/60',
    labelKey: 'workflow.canvas.step.condition',
  },
  action: {
    icon: Wrench,
    className: 'border-accent-green/40 bg-accent-green/10 text-accent-green',
    handleClass: 'bg-accent-green/60',
    labelKey: 'workflow.canvas.step.action',
  },
};

export const CANVAS_TERMINAL_START = 'canvas-start';
export const CANVAS_TERMINAL_END = 'canvas-end';

const NEUTRAL_STYLE = {
  icon: Globe,
  className: 'border-border bg-muted/40 text-muted-foreground',
  handleClass: 'bg-muted-foreground/50',
  labelKey: 'workflow.canvas.step.unknown',
};

function nodeStyleOf(type: string) {
  return STEP_NODE_STYLE[type] ?? NEUTRAL_STYLE;
}

/** 边的语义样式：人工确认步骤 animated 强调闸门；smoothstep 折线 + 柔和描边 */
const EDGE_STYLE = { stroke: 'var(--content-border, hsl(var(--border)))', strokeWidth: 1.5 } as const;

/**
 * 步骤链 → 节点/边。垂直布局（线性链）：触发 → step… → 完成。
 * 未知步骤类型回落中性形态（文法 v2 前向兼容，不炸渲染）。
 */
export function stepsToFlow(steps: CanvasStep[], labelOf: (key: string) => string): FlowShape {
  const nodes: Node[] = [
    {
      id: CANVAS_TERMINAL_START,
      position: { x: 0, y: 0 },
      data: { label: labelOf('workflow.canvas.trigger') },
      type: 'terminal',
      draggable: false,
      selectable: false,
    },
  ];
  const edges: Edge[] = [];
  let prevId = CANVAS_TERMINAL_START;

  steps.forEach((step, index) => {
    const id = step.id || `step-${index}`;
    nodes.push({
      id,
      position: { x: 0, y: (index + 1) * 110 },
      data: { step },
      type: 'step',
      draggable: false,
    });
    edges.push({
      id: `${prevId}->${id}`,
      source: prevId,
      target: id,
      type: 'smoothstep',
      style: EDGE_STYLE,
      animated: step.type === 'human-confirm',
    });
    prevId = id;
  });

  nodes.push({
    id: CANVAS_TERMINAL_END,
    position: { x: 0, y: (steps.length + 1) * 110 },
    data: { label: labelOf('workflow.canvas.completed') },
    type: 'terminal',
    draggable: false,
    selectable: false,
  });
  edges.push({
    id: `${prevId}->${CANVAS_TERMINAL_END}`,
    source: prevId,
    target: CANVAS_TERMINAL_END,
    type: 'smoothstep',
    style: EDGE_STYLE,
  });

  return { nodes, edges };
}

/** 统一 Handle 连接点（边的挂载位；无 Handle 则边不渲染） */
function StepHandles({ handleClass }: { handleClass: string }) {
  return (
    <>
      <Handle type="target" position={Position.Top} className={cn('!size-2 !border-none', handleClass)} />
      <Handle type="source" position={Position.Bottom} className={cn('!size-2 !border-none', handleClass)} />
    </>
  );
}

function TerminalNode({ data }: NodeProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <StepHandles handleClass={NEUTRAL_STYLE.handleClass} />
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-11 text-muted-foreground">
        {data.id === CANVAS_TERMINAL_START ? (
          <PlayCircle className="size-3" />
        ) : (
          <Flag className="size-3" />
        )}
        {typeof data.label === 'string' ? data.label : t('workflow.canvas.step.unknown')}
      </div>
    </div>
  );
}

function StepNode({ data }: NodeProps) {
  const { t } = useTranslation();
  const step = (data.step ?? {}) as CanvasStep;
  const style = nodeStyleOf(step.type);
  const Icon = style.icon;
  return (
    <div
      className={cn(
        'group flex w-64 items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md',
        style.className,
        data.selected && 'ring-2 ring-ring ring-offset-1',
      )}
    >
      <StepHandles handleClass={style.handleClass} />
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{step.title || step.id}</p>
        {step.desc ? (
          <p className="mt-0.5 line-clamp-2 text-11 leading-relaxed opacity-75">{step.desc}</p>
        ) : (
          <p className="mt-0.5 text-11 opacity-75">{t(style.labelKey)}</p>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = { terminal: TerminalNode, step: StepNode };

/** 按步骤类型生成 MiniMap 节点色（语义色一致性） */
const MINIMAP_COLOR: Record<string, string> = {
  llm: 'var(--accent-purple, #8b5cf6)',
  'human-confirm': 'var(--accent-yellow, #eab308)',
  http: 'var(--accent-blue, #3b82f6)',
  condition: 'var(--accent-orange, #f97316)',
  action: 'var(--accent-green, #22c55e)',
};

export function WorkflowCanvas({
  steps,
  selectedId,
  onStepClick,
}: {
  steps: CanvasStep[];
  /** 编辑模式：当前选中步骤 id（高亮由 selected 样式承载） */
  selectedId?: string | null;
  /** 编辑模式：点击步骤节点回调（只读模式不传） */
  onStepClick?: (stepId: string) => void;
}) {
  const { t } = useTranslation();
  const flow = useMemo(() => {
    const f = stepsToFlow(steps, (key) => t(key));
    if (selectedId) {
      f.nodes = f.nodes.map((n) =>
        n.id === selectedId ? { ...n, selected: true } : n,
      );
    }
    return f;
  }, [steps, t, selectedId]);

  return (
    <div className="h-full min-h-0 w-full rounded-lg border border-border bg-content-bg" data-ai="workflow.canvas">
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable={!!onStepClick}
        onNodeClick={(_event, node) => {
          if (onStepClick && node.type === 'step') onStepClick(node.id);
        }}
        minZoom={0.3}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          className="!bg-card !border-border"
          nodeColor={(node) => {
            const step = (node.data as { step?: CanvasStep }).step;
            return (step && MINIMAP_COLOR[step.type]) || 'var(--muted, #94a3b8)';
          }}
        />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

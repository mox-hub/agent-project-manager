/**
 * Workflow 节点画布（CAP-A-12 切片①）：definition 步骤链 → React Flow 只读节点图。
 * 转换器 stepsToFlow 是纯函数（可独立测试）；节点形态按步骤类型区分，
 * human-confirm 高亮（人工闸门语义），condition 预留分支形态（文法 v2 扩展点）。
 */
import { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Globe, GitBranch, ShieldCheck, Sparkles, PlayCircle, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** 步骤摘要形状（与 stepsSummary / definition.steps 对齐的最小集） */
export interface CanvasStep {
  id: string;
  type: string;
  title?: string;
}

interface FlowShape {
  nodes: Node[];
  edges: Edge[];
}

const STEP_NODE_STYLE: Record<
  string,
  { icon: typeof Sparkles; className: string; labelKey: string }
> = {
  llm: {
    icon: Sparkles,
    className: 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple',
    labelKey: 'workflow.canvas.step.llm',
  },
  'human-confirm': {
    icon: ShieldCheck,
    className: 'border-accent-yellow/50 bg-accent-yellow/10 text-accent-yellow',
    labelKey: 'workflow.canvas.step.humanConfirm',
  },
  http: {
    icon: Globe,
    className: 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue',
    labelKey: 'workflow.canvas.step.http',
  },
  condition: {
    icon: GitBranch,
    className: 'border-accent-orange/40 bg-accent-orange/10 text-accent-orange',
    labelKey: 'workflow.canvas.step.condition',
  },
};

export const CANVAS_TERMINAL_START = 'canvas-start';
export const CANVAS_TERMINAL_END = 'canvas-end';

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
      position: { x: 0, y: (index + 1) * 96 },
      data: { step },
      type: 'step',
      draggable: false,
    });
    edges.push({
      id: `${prevId}->${id}`,
      source: prevId,
      target: id,
      animated: step.type === 'human-confirm',
    });
    prevId = id;
  });

  nodes.push({
    id: CANVAS_TERMINAL_END,
    position: { x: 0, y: (steps.length + 1) * 96 },
    data: { label: labelOf('workflow.canvas.completed') },
    type: 'terminal',
    draggable: false,
    selectable: false,
  });
  edges.push({ id: `${prevId}->${CANVAS_TERMINAL_END}`, source: prevId, target: CANVAS_TERMINAL_END });

  return { nodes, edges };
}

function TerminalNode({ data }: NodeProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-11 text-muted-foreground">
      {data.id === CANVAS_TERMINAL_START ? (
        <PlayCircle className="size-3" />
      ) : (
        <Flag className="size-3" />
      )}
      {typeof data.label === 'string' ? data.label : t('workflow.canvas.step.unknown')}
    </div>
  );
}

function StepNode({ data }: NodeProps) {
  const { t } = useTranslation();
  const step = (data.step ?? {}) as CanvasStep;
  const meta = STEP_NODE_STYLE[step.type] ?? {
    icon: Globe,
    className: 'border-border bg-muted/40 text-muted-foreground',
    labelKey: 'workflow.canvas.step.unknown',
  };
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        'flex w-56 items-start gap-2 rounded-lg border px-3 py-2',
        meta.className,
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{step.title || step.id}</p>
        <p className="text-11 opacity-80">{t(meta.labelKey)}</p>
      </div>
    </div>
  );
}

const NODE_TYPES = { terminal: TerminalNode, step: StepNode };

export function WorkflowCanvas({ steps }: { steps: CanvasStep[] }) {
  const { t } = useTranslation();
  const flow = useMemo(() => stepsToFlow(steps, (key) => t(key)), [steps, t]);

  return (
    <div className="h-72 w-full rounded-lg border border-border bg-content-bg" data-ai="workflow.canvas">
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.4}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}

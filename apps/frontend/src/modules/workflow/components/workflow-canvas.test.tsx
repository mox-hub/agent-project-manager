import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { stepsToFlow, WorkflowCanvas, CANVAS_TERMINAL_START, CANVAS_TERMINAL_END } from './workflow-canvas';
import type { CanvasStep } from './workflow-canvas';

// base-ui/xyflow 依赖 ResizeObserver（jsdom 缺失）
beforeAll(() => {
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
    (globalThis as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
  }));
});

const STEPS: CanvasStep[] = [
  { id: 'draft', type: 'llm', title: '起草项目简报' },
  { id: 'confirm', type: 'human-confirm', title: '人工确认' },
  { id: 'gate', type: 'condition', title: '闸门判断' },
  { id: 'notify', type: 'http', title: '推送通知' },
];

describe('stepsToFlow（definition → 节点图转换器）', () => {
  const labelOf = (key: string) => key;

  it('线性链：触发 + N 步骤 + 完成，边首尾相接', () => {
    const { nodes, edges } = stepsToFlow(STEPS, labelOf);
    expect(nodes).toHaveLength(STEPS.length + 2);
    expect(edges).toHaveLength(STEPS.length + 1);
    expect(nodes[0].id).toBe(CANVAS_TERMINAL_START);
    expect(nodes[nodes.length - 1].id).toBe(CANVAS_TERMINAL_END);
    // 边按顺序首尾相接
    edges.forEach((edge, i) => {
      const expected = i === 0 ? CANVAS_TERMINAL_START : STEPS[i - 1].id;
      expect(edge.source).toBe(expected);
    });
    // human-confirm 边为 animated（人工闸门视觉强调）
    expect(edges[1].animated).toBe(true);
    expect(edges[2].animated).toBe(false);
  });

  it('空步骤：仅触发与完成两个端点节点', () => {
    const { nodes, edges } = stepsToFlow([], labelOf);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(CANVAS_TERMINAL_START);
    expect(edges[0].target).toBe(CANVAS_TERMINAL_END);
  });

  it('未知步骤类型不炸转换（文法 v2 前向兼容）', () => {
    const { nodes } = stepsToFlow([{ id: 'x', type: 'future-type' }], labelOf);
    expect(nodes).toHaveLength(3);
    const stepNode = nodes.find((n) => n.id === 'x');
    expect(stepNode).toBeTruthy();
  });

  it('action 步骤（产品动作节点）正常转换并携带数据', () => {
    const { nodes } = stepsToFlow(
      [{ id: 'create', type: 'action', title: '登记任务' }],
      labelOf,
    );
    const stepNode = nodes.find((n) => n.id === 'create');
    expect((stepNode!.data as { step: CanvasStep }).step.type).toBe('action');
  });

  it('节点携带步骤数据，step 节点不可拖拽（只读画布）', () => {
    const { nodes } = stepsToFlow(STEPS, labelOf);
    const stepNode = nodes.find((n) => n.id === 'draft');
    expect((stepNode!.data as { step: CanvasStep }).step.title).toBe('起草项目简报');
    expect(stepNode!.draggable).toBe(false);
  });
});

describe('WorkflowCanvas（只读渲染冒烟）', () => {
  it('渲染画布容器与触发端点', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <WorkflowCanvas steps={STEPS} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(document.querySelector('[data-ai="workflow.canvas"]')).toBeTruthy();
    // ReactFlow 挂载出画布容器（节点文本在 jsdom 中由 viewport 渲染，冒烟断言容器即可）
    expect(screen.getByText('workflow.canvas.trigger')).toBeTruthy();
  });
});

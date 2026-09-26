/** build-run-view 纯函数单测：journalKey 分组 / 站状态聚合 / 轮数 / 统计 */
import { describe, expect, it } from 'vitest';
import type { WorkflowNodeRun } from '../../api/workflow-api';
import { bareNodeId, buildRunView, splitDuration, type V2NodeSummary } from './build-run-view';

function row(
  nodeId: string,
  status: WorkflowNodeRun['status'],
  nodeType = 'llm',
  attempt = 1,
): WorkflowNodeRun {
  return {
    id: `nr-${nodeId}-${attempt}`,
    runId: 'run-1',
    nodeId,
    nodeType,
    attempt,
    status,
    createdAt: '2026-09-26T00:00:00.000Z',
  };
}

const GRAPH: V2NodeSummary[] = [
  { id: 'prep', type: 'llm', title: '准备演示代码' },
  {
    id: 'review',
    type: 'fan-out',
    title: '逐个文件评审',
    children: [
      { id: 'rv-a', type: 'llm', title: '评审员 A' },
      { id: 'rv-b', type: 'llm', title: '评审员 B' },
    ],
  },
  {
    id: 'fix-loop',
    type: 'loop',
    title: '修复循环',
    children: [{ id: 'fix', type: 'agent', title: '修复员' }],
  },
  { id: 'gate', type: 'condition', title: '是否通过', then: [{ id: 'pass', type: 'action', title: '通过' }] },
  { id: 'report', type: 'agent', title: '汇总报告', agent: { provider: 'zcode', targetMode: 'goal' } },
];

describe('bareNodeId', () => {
  it('剥离 journal 后缀链（@i/@r/多层）', () => {
    expect(bareNodeId('fix@r1')).toBe('fix');
    expect(bareNodeId('rv-a@i0')).toBe('rv-a');
    expect(bareNodeId('deep@i1@r2')).toBe('deep');
    expect(bareNodeId('plain')).toBe('plain');
  });
});

describe('buildRunView', () => {
  it('v1 run（无图无 journal）退化为空站列与空统计', () => {
    const view = buildRunView(null, undefined, {});
    expect(view.stations).toEqual([]);
    expect(view.stats.phases).toBe(0);
    expect(view.stats.durationMs).toBeNull();
  });

  it('journalKey 按站子树归属：fan-out 子节点行归容器站', () => {
    const view = buildRunView(
      GRAPH,
      [
        row('prep', 'succeeded'),
        row('rv-a@i0', 'succeeded'),
        row('rv-b@i1', 'succeeded'),
      ],
      {},
    );
    const review = view.stations[1];
    expect(review.status).toBe('done');
    expect(review.settled).toBe(2);
    expect(review.total).toBe(2);
    expect(review.pills.map((p) => p.label)).toEqual(['评审员 A', '评审员 B']);
    // 容器站自身不重复出药丸
    expect(review.pills.every((p) => p.nodeId !== 'review')).toBe(true);
  });

  it('同裸 id 多实例追加 #序号；叶子站收自身行', () => {
    const view = buildRunView(
      GRAPH,
      [
        row('fix@r1', 'failed', 'agent'),
        row('fix@r2', 'succeeded', 'agent', 1),
        row('report', 'succeeded', 'agent'),
      ],
      {},
    );
    const loop = view.stations[2];
    expect(loop.rounds).toBe(2);
    expect(loop.status).toBe('done');
    expect(loop.pills.map((p) => p.label)).toEqual(['修复员', '修复员 #2']);
    expect(view.stations[4].pills).toHaveLength(1);
  });

  it('站状态聚合：failed > waiting > running > skipped > done', () => {
    const mk = (statuses: WorkflowNodeRun['status'][]) =>
      buildRunView(
        [{ id: 's', type: 'fan-out', children: [{ id: 'c', type: 'llm' }] }],
        statuses.map((s, i) => row(`c@i${i}`, s)),
        {},
      ).stations[0].status;
    expect(mk(['succeeded', 'failed'])).toBe('failed');
    expect(mk(['succeeded', 'waiting'])).toBe('waiting');
    expect(mk(['succeeded', 'running'])).toBe('running');
    expect(mk(['skipped', 'skipped'])).toBe('skipped');
    expect(mk(['succeeded', 'succeeded'])).toBe('done');
  });

  it('pending 站（无 journal 行）计数为 0 且不出药丸', () => {
    const view = buildRunView(GRAPH, [row('prep', 'succeeded')], {});
    const report = view.stations[4];
    expect(report.status).toBe('pending');
    expect(report.total).toBe(0);
    expect(report.pills).toEqual([]);
  });

  it('统计：时长/阶段/节点执行/子代理（agent 裸 id 去重）', () => {
    const view = buildRunView(
      GRAPH,
      [
        row('prep', 'succeeded'),
        row('fix@r1', 'failed', 'agent'),
        row('fix@r2', 'succeeded', 'agent'),
        row('report', 'running', 'agent'),
      ],
      { startedAt: '2026-09-26T00:00:00.000Z', finishedAt: '2026-09-26T00:04:45.000Z' },
    );
    expect(view.stats.phases).toBe(5);
    expect(view.stats.nodeExecs).toBe(4);
    expect(view.stats.agents).toBe(2);
    expect(splitDuration(view.stats.durationMs)).toEqual({ m: 4, s: 45 });
  });
});

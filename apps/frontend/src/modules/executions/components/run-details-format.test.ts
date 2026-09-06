import { describe, expect, it } from 'vitest';
import type { ExecutionRunDetail } from '../api/execution-api';
import {
  aggregateArtifacts,
  buildRunEventEntries,
  computeTimelineRows,
  formatCost,
  formatDurationMs,
  formatOffset,
  formatTokens,
  pickText,
  resolveTriggerSource,
} from './run-details-format';

function makeRun(overrides: Partial<ExecutionRunDetail> = {}): ExecutionRunDetail {
  return {
    id: 'run-1',
    projectId: 'p1',
    subjectType: 'platform_ai_member',
    subjectId: 'm1',
    identitySource: 'cli',
    goal: '修复登录页',
    status: 'completed',
    createdAt: '2026-09-04T01:00:00Z',
    updatedAt: '2026-09-04T01:09:00Z',
    startedAt: '2026-09-04T01:00:00Z',
    completedAt: '2026-09-04T01:09:00Z',
    totalTokens: 17400,
    totalCost: 0.51,
    steps: [],
    artifacts: [],
    bindings: [],
    ...overrides,
  };
}

describe('formatTokens / formatCost / formatDurationMs', () => {
  it('tokens 缩写 K/M，缺失返回 null', () => {
    expect(formatTokens(17400)).toBe('17.4K');
    expect(formatTokens(1_700_000)).toBe('1.7M');
    expect(formatTokens(990)).toBe('990');
    expect(formatTokens(null)).toBeNull();
    expect(formatTokens(undefined)).toBeNull();
  });

  it('费用两位小数，缺失返回 null', () => {
    expect(formatCost(0.51)).toBe('$0.51');
    expect(formatCost(0)).toBe('$0.00');
    expect(formatCost(null)).toBeNull();
  });

  it('耗时格式化：秒/分', () => {
    expect(formatDurationMs(300)).toBe('0.3s');
    expect(formatDurationMs(5230)).toBe('5s');
    expect(formatDurationMs(63_000)).toBe('1m03s');
    expect(formatDurationMs(563_000)).toBe('9m23s');
    expect(formatDurationMs(null)).toBeNull();
  });
});

describe('formatOffset', () => {
  it('相对运行起点 +mm:ss', () => {
    expect(formatOffset('2026-09-04T01:00:36Z', '2026-09-04T01:00:00Z')).toBe('+00:36');
    expect(formatOffset('2026-09-04T01:02:05Z', '2026-09-04T01:00:00Z')).toBe('+02:05');
  });

  it('非法输入兜底 +00:00', () => {
    expect(formatOffset('not-a-date', '2026-09-04T01:00:00Z')).toBe('+00:00');
  });
});

describe('pickText', () => {
  it('从对象常用字段提取文本，缺失返回 undefined', () => {
    expect(pickText({ text: 'hello' })).toBe('hello');
    expect(pickText({ command: 'ls -la' })).toBe('ls -la');
    expect(pickText('raw')).toBe('raw');
    expect(pickText({ foo: 1 })).toBeUndefined();
    expect(pickText(null)).toBeUndefined();
  });
});

describe('resolveTriggerSource', () => {
  it('助理标记优先，其次 cli/task/api', () => {
    expect(resolveTriggerSource({ input: { source: 'assistant-chat' }, identitySource: 'cli', issueId: null })).toBe('assistant');
    expect(resolveTriggerSource({ input: { source: 'assistant' }, identitySource: 'cli', issueId: null })).toBe('assistant');
    expect(resolveTriggerSource({ input: null, identitySource: 'cli', issueId: null })).toBe('cli');
    expect(resolveTriggerSource({ input: null, identitySource: 'internal', issueId: 't1' })).toBe('task');
    expect(resolveTriggerSource({ input: null, identitySource: 'api', issueId: null })).toBe('api');
  });
});

describe('aggregateArtifacts', () => {
  it('按 artifactType 归类文件/命令/其他', () => {
    const summary = aggregateArtifacts([
      { artifactType: 'file_path' },
      { artifactType: 'code_diff' },
      { artifactType: 'command_output' },
      { artifactType: 'report' },
    ] as never[]);
    expect(summary).toEqual({ files: 2, commands: 1, others: 1, total: 4 });
  });
});

describe('buildRunEventEntries', () => {
  it('steps 优先：tool_call/thinking 映射为对应条目', () => {
    const run = makeRun({
      steps: [
        {
          id: 's1',
          executionRunId: 'run-1',
          stepType: 'tool_call',
          sequence: 1,
          name: 'Bash',
          input: { command: 'ls' },
          status: 'completed',
          startedAt: '2026-09-04T01:00:10Z',
          duration: 1200,
        },
        {
          id: 's2',
          executionRunId: 'run-1',
          stepType: 'thinking',
          sequence: 2,
          status: 'completed',
          output: { text: '分析中' },
        },
      ],
    } as Partial<ExecutionRunDetail>);
    const entries = buildRunEventEntries(run);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ kind: 'tool', title: 'Bash', text: 'ls', durationMs: 1200 });
    expect(entries[1]).toMatchObject({ kind: 'thinking', text: '分析中' });
  });

  it('无 steps 走 events：errorCode→error、status→status，末尾追加 assistant 终条', () => {
    const run = makeRun({
      output: { summary: '全部完成' },
      events: [
        {
          id: 'e1',
          level: 'info',
          eventType: 'execution.status',
          status: 'in_progress',
          summary: '启动',
          createdAt: '2026-09-04T01:00:02Z',
          timestamp: '2026-09-04T01:00:02Z',
        },
        {
          id: 'e2',
          level: 'error',
          eventType: 'execution.step.updated',
          errorCode: 'TOOL_FAILED',
          summary: '失败',
          createdAt: '2026-09-04T01:00:05Z',
          timestamp: '2026-09-04T01:00:05Z',
        },
      ],
    } as unknown as ExecutionRunDetail);
    const entries = buildRunEventEntries(run);
    expect(entries.map((e) => e.kind)).toEqual(['status', 'error', 'assistant']);
    expect(entries[2].text).toBe('全部完成');
  });
});

describe('computeTimelineRows', () => {
  it('工具与模型分双行，条位置按窗口百分比', () => {
    const steps = [
      {
        id: 's1',
        executionRunId: 'run-1',
        stepType: 'tool_call',
        sequence: 1,
        name: 'Bash',
        status: 'completed',
        startedAt: '2026-09-04T01:00:10Z',
        completedAt: '2026-09-04T01:00:20Z',
      },
      {
        id: 's2',
        executionRunId: 'run-1',
        stepType: 'thinking',
        sequence: 2,
        status: 'completed',
        startedAt: '2026-09-04T01:00:00Z',
        completedAt: '2026-09-04T01:00:05Z',
      },
    ] as never[];
    const rows = computeTimelineRows(steps, '2026-09-04T01:00:00Z', '2026-09-04T01:00:20Z');
    const tools = rows.find((r) => r.key === 'tools')!;
    const model = rows.find((r) => r.key === 'model')!;
    expect(tools.bars).toHaveLength(1);
    expect(tools.bars[0].tone).toBe('tools');
    expect(tools.bars[0].leftPct).toBe(50); // 10s/20s
    expect(model.bars).toHaveLength(1);
    expect(model.bars[0].tone).toBe('model');
    expect(model.bars[0].leftPct).toBe(0);
  });

  it('失败步骤标红（error tone）', () => {
    const steps = [
      {
        id: 's1',
        executionRunId: 'run-1',
        stepType: 'tool_call',
        sequence: 1,
        status: 'failed',
        startedAt: '2026-09-04T01:00:00Z',
        completedAt: '2026-09-04T01:00:10Z',
      },
    ] as never[];
    const rows = computeTimelineRows(steps, '2026-09-04T01:00:00Z', '2026-09-04T01:00:10Z');
    expect(rows.find((r) => r.key === 'tools')!.bars[0].tone).toBe('error');
  });
});

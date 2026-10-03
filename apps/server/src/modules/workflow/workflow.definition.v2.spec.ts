/**
 * 文法 v2 纯函数行为锁（CAP-S-03 W1）：校验矩阵 / 静态投影 / 插值与条件判定
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateV2Condition,
  interpolateV2Template,
  parseWorkflowDefinitionV2,
  summarizeV2Definition,
  WorkflowV2DefinitionError,
} from './workflow.definition.v2';

const validDoc = {
  version: 2,
  nodes: [
    {
      id: 'make',
      type: 'action',
      action: 'document.create',
      params: { title: '{input.title}' },
    },
    { id: 'review', type: 'human', message: '请确认 {input.title}' },
    {
      id: 'gate',
      type: 'condition',
      left: '{steps.review.approved}',
      op: 'eq',
      right: true,
      then: [
        {
          id: 'log',
          type: 'action',
          action: 'document.create',
          params: { title: 'pass' },
        },
      ],
    },
  ],
};

describe('parseWorkflowDefinitionV2 校验矩阵', () => {
  it('合法文档通过校验且原样返回', () => {
    const doc = parseWorkflowDefinitionV2(validDoc);
    expect(doc.version).toBe(2);
    expect(doc.nodes).toHaveLength(3);
  });

  it('非对象 / 版本不为 2 / nodes 非数组一律拒绝', () => {
    expect(() => parseWorkflowDefinitionV2(null)).toThrow(
      WorkflowV2DefinitionError,
    );
    expect(() => parseWorkflowDefinitionV2([1])).toThrow(
      WorkflowV2DefinitionError,
    );
    expect(() => parseWorkflowDefinitionV2({ version: 1, nodes: [] })).toThrow(
      /不支持的 definition 版本/,
    );
    expect(() => parseWorkflowDefinitionV2({ version: 2 })).toThrow(
      /nodes 必须是非空数组/,
    );
  });

  it('未知节点类型拒绝（8 型闭集）', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [{ id: 'x', type: 'http', url: 'https://a' }],
      }),
    ).toThrow(/不支持的节点类型「http」/);
  });

  it('id 非法（非 kebab-case）与重复 id 拒绝', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [{ id: 'Bad_Id', type: 'wait', event: 'execution.completed' }],
      }),
    ).toThrow(/id 非法/);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          { id: 'dup', type: 'wait', event: 'execution.completed' },
          { id: 'dup', type: 'wait', event: 'execution.completed' },
        ],
      }),
    ).toThrow(/id 重复/);
  });

  it('loop：maxRounds 强制（1-100）；until.op 非法拒绝；缺 children 拒绝', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'lp',
            type: 'loop',
            children: [{ id: 'a', type: 'wait', event: 'execution.completed' }],
          },
        ],
      }),
    ).toThrow(/maxRounds 须为 1-100/);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'lp',
            type: 'loop',
            maxRounds: 101,
            children: [{ id: 'a', type: 'action', action: 'document.create' }],
          },
        ],
      }),
    ).toThrow(/maxRounds 须为 1-100/);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'lp',
            type: 'loop',
            maxRounds: 3,
            until: { left: '{round}', op: 'nope', right: 1 },
            children: [{ id: 'a', type: 'action', action: 'document.create' }],
          },
        ],
      }),
    ).toThrow(/until 条件非法/);
  });

  it('fan-out：over/children 必填，concurrency 1-16', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [{ id: 'fo', type: 'fan-out', over: '{input.list}' }],
      }),
    ).toThrow(/缺 children/);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'fo',
            type: 'fan-out',
            over: '{input.list}',
            concurrency: 32,
            children: [{ id: 'a', type: 'wait', event: 'execution.completed' }],
          },
        ],
      }),
    ).toThrow(/concurrency 须为 1-16/);
  });

  it('wait：event 白名单 + timeoutMinutes 上限 7 天', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [{ id: 'w', type: 'wait', event: 'cron.tick' }],
      }),
    ).toThrow(/event 不在白名单/);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'w',
            type: 'wait',
            event: 'execution.completed',
            timeoutMinutes: 100000,
          },
        ],
      }),
    ).toThrow(/timeoutMinutes/);
  });

  it('agent：provider 闭集 + targetMode 闭集 + prompt 必填', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [{ id: 'ag', type: 'agent', provider: 'cursor', prompt: 'x' }],
      }),
    ).toThrow(/provider 非法/);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'ag',
            type: 'agent',
            provider: 'zcode',
            targetMode: 'pair',
            prompt: 'x',
          },
        ],
      }),
    ).toThrow(/targetMode 非法/);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [{ id: 'ag', type: 'agent', provider: 'zcode' }],
      }),
    ).toThrow(/缺 prompt/);
  });

  it('挂起型节点禁入 fan-out/loop 子树（v2.1 边界）；condition 分支允许', () => {
    // fan-out 子树里的 human 拒绝
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'fo',
            type: 'fan-out',
            over: '{input.list}',
            children: [{ id: 'h', type: 'human', message: 'x' }],
          },
        ],
      }),
    ).toThrow(/不允许嵌套在 fan-out\/loop 子树内/);
    // loop 子树里的 agent 拒绝
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'lp',
            type: 'loop',
            maxRounds: 3,
            children: [
              { id: 'ag', type: 'agent', provider: 'zcode', prompt: 'x' },
            ],
          },
        ],
      }),
    ).toThrow(/不允许嵌套在 fan-out\/loop 子树内/);
    // condition 分支里的 human 合法（顺序上下文）
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'gate',
            type: 'condition',
            left: '{input.ok}',
            op: 'eq',
            right: true,
            then: [{ id: 'h', type: 'human', message: '复确认' }],
          },
        ],
      }),
    ).not.toThrow();
  });

  it('triggers.on 须为数组', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: validDoc.nodes,
        triggers: { on: 'x' },
      }),
    ).toThrow(/triggers\.on 必须是字符串数组/);
  });
});

describe('静态投影 summarizeV2Definition', () => {
  it('节点树摘要：agent 携带派发声明，condition/容器携带子树', () => {
    const doc = parseWorkflowDefinitionV2({
      version: 2,
      nodes: [
        {
          id: 'ag',
          type: 'agent',
          provider: 'zcode',
          targetMode: 'goal',
          prompt: '/goal x',
          title: '派发实现',
        },
        {
          id: 'fo',
          type: 'fan-out',
          over: '{input.list}',
          children: [{ id: 'mk', type: 'action', action: 'document.create' }],
        },
      ],
    });
    const summary = summarizeV2Definition(doc);
    expect(summary[0]).toEqual({
      id: 'ag',
      type: 'agent',
      title: '派发实现',
      agent: { provider: 'zcode', targetMode: 'goal' },
    });
    expect(summary[1].children).toEqual([{ id: 'mk', type: 'action' }]);
  });
});

describe('插值与条件判定', () => {
  it('插值支持 input/steps/item/round 路径', () => {
    const ctx = {
      input: { title: '登录页' },
      steps: { review: { approved: true } },
      item: { name: 'a' },
      round: 2,
    };
    expect(
      interpolateV2Template('{input.title}-{item.name}-r{round}', ctx),
    ).toBe('登录页-a-r2');
    expect(interpolateV2Template('{steps.review.approved}', ctx)).toBe('true');
    expect(interpolateV2Template('{missing.path}', ctx)).toBe('');
  });

  it('条件判定：eq 数字还原 / contains / gt', () => {
    expect(evaluateV2Condition('eq', 'true', true)).toBe(true);
    expect(evaluateV2Condition('eq', '2', 2)).toBe(true);
    expect(evaluateV2Condition('contains', 'v2 引擎跑通', '跑通')).toBe(true);
    expect(evaluateV2Condition('gt', '10', 9)).toBe(true);
    expect(evaluateV2Condition('ne', 'a', 'a')).toBe(false);
  });
});

/** CAP-A-27 批二 P2-F：judge 节点文法校验 */
describe('judge 节点文法（CAP-A-27 P2-F）', () => {
  const BASE = {
    version: 2 as const,
    nodes: [
      {
        id: 'j1',
        type: 'judge' as const,
        state: '工单：{{input.title}}',
        questions: [
          { id: 'risky', type: 'noul' as const, instructions: '有风险吗？' },
          {
            id: 'level',
            type: 'choice' as const,
            instructions: '风险等级',
            criteria: { read: '只读', write: '写', high_risk: '高危' },
          },
        ],
      },
    ],
  };

  it('合法 judge 节点通过校验且类型收窄', () => {
    const doc = parseWorkflowDefinitionV2(BASE);
    expect(doc.nodes[0].type).toBe('judge');
  });

  it('缺 questions / 超 20 问 / 问题 id 重复 / choice criteria 非对象 / score 档位越界 均拒绝', () => {
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [{ id: 'j1', type: 'judge', state: 'x', questions: [] }],
      }),
    ).toThrow(WorkflowV2DefinitionError);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'j1',
            type: 'judge',
            state: 'x',
            questions: Array.from({ length: 21 }, (_, i) => ({
              id: `q${i}`,
              type: 'noul',
              instructions: 'x',
            })),
          },
        ],
      }),
    ).toThrow(WorkflowV2DefinitionError);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'j1',
            type: 'judge',
            state: 'x',
            questions: [
              { id: 'q', type: 'noul', instructions: 'x' },
              { id: 'q', type: 'noul', instructions: 'y' },
            ],
          },
        ],
      }),
    ).toThrow(WorkflowV2DefinitionError);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'j1',
            type: 'judge',
            state: 'x',
            questions: [
              {
                id: 'q',
                type: 'choice',
                instructions: 'x',
                criteria: ['a', 'b'],
              },
            ],
          },
        ],
      }),
    ).toThrow(WorkflowV2DefinitionError);
    expect(() =>
      parseWorkflowDefinitionV2({
        version: 2,
        nodes: [
          {
            id: 'j1',
            type: 'judge',
            state: 'x',
            questions: [
              {
                id: 'q',
                type: 'score',
                instructions: 'x',
                criteria: [
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                  '10',
                  '11',
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(WorkflowV2DefinitionError);
  });
});

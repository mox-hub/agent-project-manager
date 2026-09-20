/**
 * Workflow definition 文法测试（GAP-T-14 清偿）——
 * parseWorkflowDefinition 纯函数级校验：结构/版本/steps/步骤字段逐类拒绝，
 * 重点覆盖 CAP-A-12 文法 v2 的 action 分支（缺 action 字段）。
 * 另覆盖 summarizeDefinition（决策卡/详情摘要）与插值基元（编辑回写链路依赖）。
 */
import { describe, expect, it } from 'vitest';
import {
  interpolateDeep,
  interpolateTemplate,
  parseWorkflowDefinition,
  summarizeDefinition,
  WorkflowDefinitionError,
  type WorkflowDefinitionDoc,
} from './workflow.definition';

/** 构造一份合法 definition（五类步骤齐备，可按需覆盖字段） */
function validDoc(): WorkflowDefinitionDoc {
  return {
    version: 1,
    inputHint: { topic: '主题' },
    steps: [
      { id: 'draft', type: 'llm', prompt: '起草 {input.topic}' },
      {
        id: 'call',
        type: 'http',
        method: 'POST',
        url: 'https://example.test/api',
        body: { q: '{steps.draft.value}' },
      },
      { id: 'review', type: 'human-confirm', message: '请审核' },
      {
        id: 'gate',
        type: 'condition',
        left: '{steps.review.approved}',
        op: 'eq',
        right: true,
      },
      {
        id: 'create',
        type: 'action',
        action: 'issue.create',
        params: { title: '{steps.draft.value}' },
      },
    ],
  };
}

describe('parseWorkflowDefinition：合法文法放行', () => {
  it('五类步骤（llm/http/human-confirm/condition/action）齐备的定义原样通过', () => {
    const doc = validDoc();
    // 文法校验不改造输入：返回原引用（编辑回写依赖原样透传）
    expect(parseWorkflowDefinition(doc)).toBe(doc);
  });

  it('inputHint / title 等可选字段缺失不阻断', () => {
    const doc = {
      version: 1,
      steps: [
        { id: 'a', type: 'llm', prompt: 'x' },
        { id: 'b', type: 'action', action: 'issue.create' },
      ],
    };
    expect(() => parseWorkflowDefinition(doc)).not.toThrow();
  });
});

describe('parseWorkflowDefinition：结构拒绝', () => {
  it('非对象（null/数组/字符串）→ WorkflowDefinitionError', () => {
    for (const bad of [null, [], 'x', 42]) {
      expect(() => parseWorkflowDefinition(bad)).toThrow(
        WorkflowDefinitionError,
      );
      expect(() => parseWorkflowDefinition(bad)).toThrow(/必须是对象/);
    }
  });

  it('版本非 1 → 拒绝并指出版本号', () => {
    expect(() =>
      parseWorkflowDefinition({
        version: 2,
        steps: [{ id: 'a', type: 'llm', prompt: 'x' }],
      }),
    ).toThrow(/不支持的 definition 版本：2/);
    expect(() =>
      parseWorkflowDefinition({
        steps: [{ id: 'a', type: 'llm', prompt: 'x' }],
      }),
    ).toThrow(WorkflowDefinitionError);
  });

  it('steps 缺失或空数组 → 拒绝（非空数组）', () => {
    expect(() => parseWorkflowDefinition({ version: 1 })).toThrow(/非空数组/);
    expect(() => parseWorkflowDefinition({ version: 1, steps: [] })).toThrow(
      /非空数组/,
    );
    expect(() =>
      parseWorkflowDefinition({ version: 1, steps: 'nope' }),
    ).toThrow(/非空数组/);
  });

  it('步骤非对象（null 混入）→ 拒绝', () => {
    expect(() =>
      parseWorkflowDefinition({ version: 1, steps: [null] }),
    ).toThrow(/步骤必须是对象/);
  });
});

describe('parseWorkflowDefinition：步骤 id 校验', () => {
  it('id 非法（非 kebab-case：大写/下划线/数字开头）→ 拒绝', () => {
    for (const id of ['Bad', 'bad_id', '1bad', '-bad', '']) {
      expect(() =>
        parseWorkflowDefinition({
          version: 1,
          steps: [{ id, type: 'llm', prompt: 'x' }],
        }),
      ).toThrow(/步骤 id 非法/);
    }
  });

  it('id 重复 → 拒绝并指出重复 id', () => {
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [
          { id: 'a', type: 'llm', prompt: 'x' },
          { id: 'a', type: 'llm', prompt: 'y' },
        ],
      }),
    ).toThrow(/步骤 id 重复：a/);
  });
});

describe('parseWorkflowDefinition：步骤类型与必填字段', () => {
  it('未知类型（code/plugin 基座未放开）→ 拒绝并列出支持类型', () => {
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [{ id: 'a', type: 'code', code: '1+1' }],
      }),
    ).toThrow(/基座暂不支持步骤类型「code」/);
  });

  it('llm 缺 prompt / http 缺 url / human-confirm 缺 message / condition 缺 left → 各自拒绝', () => {
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [{ id: 'a', type: 'llm' }],
      }),
    ).toThrow(/llm 步骤 a 缺 prompt/);
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [{ id: 'b', type: 'http' }],
      }),
    ).toThrow(/http 步骤 b 缺 url/);
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [{ id: 'c', type: 'human-confirm' }],
      }),
    ).toThrow(/human-confirm 步骤 c 缺 message/);
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [{ id: 'd', type: 'condition', op: 'eq' }],
      }),
    ).toThrow(/condition 步骤 d 缺 left/);
  });

  it('action 步骤缺 action 字段 → 拒绝并指向动作目录（CAP-A-12 文法 v2）', () => {
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [{ id: 'e', type: 'action' }],
      }),
    ).toThrow(/action 步骤 e 缺 action/);
    expect(() =>
      parseWorkflowDefinition({
        version: 1,
        steps: [{ id: 'e', type: 'action' }],
      }),
    ).toThrow(/GET \/workflows\/actions/);
  });
});

describe('summarizeDefinition（详情/决策卡摘要）', () => {
  it('映射 id/type，title 存在才携带，不外泄 prompt 全文', () => {
    const summary = summarizeDefinition(validDoc());
    expect(summary).toEqual([
      { id: 'draft', type: 'llm', title: undefined },
      { id: 'call', type: 'http', title: undefined },
      { id: 'review', type: 'human-confirm', title: undefined },
      { id: 'gate', type: 'condition', title: undefined },
      { id: 'create', type: 'action', title: undefined },
    ]);
    expect(JSON.stringify(summary)).not.toContain('起草 {input.topic}');
  });

  it('带 title 的步骤摘要携带 title；未知前向类型照常透出', () => {
    const summary = summarizeDefinition({
      version: 1,
      steps: [
        {
          id: 'a',
          type: 'llm',
          title: '起草',
          prompt: 'x',
        } as WorkflowDefinitionDoc['steps'][number],
        { id: 'b', type: 'future' } as WorkflowDefinitionDoc['steps'][number],
      ],
    });
    expect(summary[0]).toEqual({ id: 'a', type: 'llm', title: '起草' });
    expect(summary[1]).toEqual({ id: 'b', type: 'future' });
  });
});

describe('插值基元（编辑回写后编译执行的取值语义）', () => {
  const ctx = {
    input: { topic: '看板' },
    steps: { draft: { value: { nested: '内容' } } },
  };

  it('{input.x} 与 {steps.y.z} 路径命中替换', () => {
    expect(
      interpolateTemplate(
        '主题：{input.topic}，草稿：{steps.draft.value}',
        ctx,
      ),
    ).toBe('主题：看板，草稿：{"nested":"内容"}');
  });

  it('未命中路径留空串（不抛错）', () => {
    expect(interpolateTemplate('a{input.missing}b{steps.no.thing}c', ctx)).toBe(
      'abc',
    );
  });

  it('interpolateDeep：只替换字符串叶子，结构与数字/布尔保持', () => {
    expect(
      interpolateDeep(
        {
          a: '{input.topic}',
          b: ['{input.topic}', 1, true],
          c: { d: '{steps.draft.value}' },
          e: 3,
        },
        ctx,
      ),
    ).toEqual({
      a: '看板',
      b: ['看板', 1, true],
      c: { d: '{"nested":"内容"}' },
      e: 3,
    });
  });
});

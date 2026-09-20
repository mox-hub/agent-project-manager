/**
 * parseGrillResult 纯函数测试：模型输出 → GrillResult 的防御性收敛
 */
import { describe, expect, it } from 'vitest';
import { parseGrillResult } from './use-grill';

describe('parseGrillResult', () => {
  it('追问轮：question + choices 收敛为 GrillQuestion', () => {
    const result = parseGrillResult({
      done: false,
      question: '它给谁用？',
      choices: [
        { key: 'a', label: '小团队', sub: '10 人以内', guess: true },
        { label: '' }, // 空标签丢弃
        '垃圾元素', // 非对象丢弃
      ],
    });
    expect(result).toEqual({
      kind: 'question',
      question: '它给谁用？',
      choices: [{ key: 'a', label: '小团队', sub: '10 人以内', guess: true }],
    });
  });

  it('done 轮：summary 字段逐项收敛，缺省补空', () => {
    const result = parseGrillResult({
      done: true,
      summary: {
        name: '会议纪要库',
        description: '记录会议决定',
        goals: ['不再丢结论', 42, ''],
        users: '小组', // 非数组丢弃
      },
    });
    expect(result).toEqual({
      kind: 'done',
      summary: {
        name: '会议纪要库',
        description: '记录会议决定',
        goals: ['不再丢结论'],
        users: [],
        scope: [],
        nonGoals: [],
        constraints: [],
        acceptanceHints: [],
      },
    });
  });

  it('无效输出返回 null：无问题、无名摘要、done 无 summary', () => {
    expect(parseGrillResult({})).toBeNull();
    expect(parseGrillResult({ done: false })).toBeNull();
    expect(parseGrillResult({ done: true, summary: { name: '  ' } })).toBeNull();
    expect(parseGrillResult({ done: true })).toBeNull();
  });
});

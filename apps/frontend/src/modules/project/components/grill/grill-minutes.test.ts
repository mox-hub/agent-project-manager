/**
 * buildGrillMinutes 纯函数测试：grill 摘要 → 需求澄清纪要 markdown
 */
import { describe, expect, it } from 'vitest';
import { buildGrillMinutes } from './grill-minutes';

describe('buildGrillMinutes', () => {
  it('完整摘要生成带章节的纪要全文', () => {
    const md = buildGrillMinutes({
      name: '会议纪要库',
      description: '记录会议决定的工具',
      goals: ['不再丢结论'],
      scope: ['决定登记', '会后提醒'],
      nonGoals: ['不做语音转写'],
      acceptanceHints: ['能检索历史决定'],
    });
    expect(md).toContain('# 需求澄清纪要 · 会议纪要库');
    expect(md).toContain('记录会议决定的工具');
    expect(md).toContain('## 这一期做什么');
    expect(md).toContain('- 决定登记');
    expect(md).toContain('## 明确不做什么');
    expect(md).toContain('- 不做语音转写');
    expect(md).toContain('## 怎么算做完（线索）');
  });

  it('空摘要只产出标题', () => {
    const md = buildGrillMinutes({ name: 'X' });
    expect(md.trim()).toBe('# 需求澄清纪要 · X');
  });
});

import { describe, expect, it } from 'vitest';
import {
  parseAnalysisDraft,
  buildAnalysisMarkdown,
} from './use-analysis-draft';

describe('parseAnalysisDraft（CAP-P-01 四期防御性收敛）', () => {
  it('正常 payload 收敛为结构化结果', () => {
    const result = parseAnalysisDraft({
      feasibility: {
        verdict: 'conditional',
        rationale: '推送依赖外部权限',
        conditions: ['IT 开通网关'],
      },
      impact: { summary: '新增为主', affectedAreas: ['消息推送', '使用手册'] },
      dependencies: [{ item: '推送网关', note: '需 IT 开通' }],
      risks: [
        { risk: '到达率', severity: 'high', mitigation: '先做验证任务' },
      ],
      acceptancePreview: [{ content: '会后 10 分钟可查', criteriaType: 'functional' }],
    });
    expect(result).not.toBeNull();
    expect(result?.feasibility.verdict).toBe('conditional');
    expect(result?.impact.affectedAreas).toHaveLength(2);
    expect(result?.risks[0].severity).toBe('high');
  });

  it('脏数据降级：非法 verdict/severity 降级、risks 截断 5、依赖过滤空 item', () => {
    const result = parseAnalysisDraft({
      feasibility: { verdict: 'maybe', rationale: 'x' },
      impact: {},
      dependencies: [{ item: '' }, { note: '孤儿' }],
      risks: Array.from({ length: 8 }, (_, i) => ({
        risk: `r${i}`,
        severity: 'ultra',
      })),
      acceptancePreview: [{ content: ' ' }, { content: '有效要点' }],
    });
    expect(result?.feasibility.verdict).toBe('conditional');
    expect(result?.dependencies).toHaveLength(0);
    expect(result?.risks).toHaveLength(5);
    expect(result?.risks.every((r) => r.severity === 'medium')).toBe(true);
    expect(result?.acceptancePreview).toHaveLength(1);
  });

  it('全空内容返回 null（触发上层可读报错）', () => {
    expect(parseAnalysisDraft({})).toBeNull();
    expect(
      parseAnalysisDraft({ feasibility: { verdict: 'go' } }),
    ).toBeNull();
  });
});

describe('buildAnalysisMarkdown', () => {
  const draft = parseAnalysisDraft({
    feasibility: { verdict: 'no-go', rationale: '核心依赖不成立', conditions: [] },
    impact: { summary: '波及登录', affectedAreas: ['登录'] },
    dependencies: [],
    risks: [{ risk: '接口无权限', severity: 'high', mitigation: '先申请' }],
    acceptancePreview: [{ content: '会后可查' }],
  })!;

  it('组装含中文 verdict 标签、风险与验收预清单的 markdown', () => {
    const md = buildAnalysisMarkdown('会议工具', draft);
    expect(md).toContain('# 需求分析报告 · 会议工具');
    expect(md).toContain('不建议开工');
    expect(md).toContain('接口无权限');
    expect(md).toContain('应对：先申请');
    expect(md).toContain('- [ ] 会后可查');
    // 无依赖段不渲染空标题
    expect(md).not.toContain('## 依赖');
  });
});

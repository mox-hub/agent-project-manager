/**
 * buildAuditReportMarkdown 拼接口径测试（交付出口切片，GAP 无新增——导出义务
 * 随 acceptance 既有测试面兜底，本文件为纯函数行为级）。
 */
import { describe, expect, it } from 'vitest';
import type { AuditReport } from '../api/acceptance-api';
import { buildAuditReportMarkdown } from './audit-report-panel';

const baseReport: AuditReport = {
  id: 'audit-1',
  acceptanceId: 'acc-1234',
  riskLevel: 'yellow',
  blockedItems: [
    {
      id: 'b1',
      type: 'dependency',
      content: '缺少依赖声明',
      severity: 'high',
      source: 'completeness-audit',
      suggestion: '补全依赖清单',
      category: '依赖',
    },
  ],
  suggestedItems: [
    {
      id: 's1',
      type: 'engineering',
      content: '建议补充监控',
      severity: 'medium',
      source: 'completeness-checklist',
      suggestion: '加监控埋点',
    },
  ],
  passedItems: [
    { id: 'p1', type: 'test', content: '测试覆盖达标', severity: 'low', source: 'audit' },
  ],
  summary: '整体可交付，两处需处理',
  auditDate: '2026-10-11T00:00:00.000Z',
};

describe('buildAuditReportMarkdown（审计报告导出拼接口径）', () => {
  it('头部含时间/风险/摘要，三组分节计数正确，建议项带修复建议', () => {
    const md = buildAuditReportMarkdown(baseReport, '中风险');
    expect(md).toContain('# 完整性审计报告');
    expect(md).toContain('- 审计时间：2026-10-11T00:00:00.000Z');
    expect(md).toContain('- 风险级别：中风险（yellow）');
    expect(md).toContain('- 结论摘要：整体可交付，两处需处理');
    expect(md).toContain('## 阻塞项（1）');
    expect(md).toContain('### [high] 缺少依赖声明');
    expect(md).toContain('- 修复建议：补全依赖清单');
    expect(md).toContain('- 分类：依赖');
    expect(md).toContain('## 建议项（1）');
    expect(md).toContain('## 通过项（1）');
    // 通过项不带修复建议段
    expect(md).not.toContain('- 修复建议：测试覆盖达标');
  });

  it('过期审计带重审警示；空 summary/checklist 行不出现', () => {
    const md = buildAuditReportMarkdown(
      { ...baseReport, stale: true, summary: null, checklist: null },
      '黄',
    );
    expect(md).toContain('⚠️ 审计已过期');
    expect(md).not.toContain('结论摘要');
    expect(md).not.toContain('验收清单');
  });
});

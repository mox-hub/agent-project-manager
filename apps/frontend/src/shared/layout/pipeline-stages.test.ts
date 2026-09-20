import { describe, expect, it } from 'vitest';
import { PIPELINE_STAGES } from './pipeline-stages';
import { PAGE_REGISTRY } from './page-registry';

describe('研发生命周期六站（CAP-A-15 / GAP-T-24）', () => {
  it('六站路由与理想管道①-⑥一一对应且顺序固定', () => {
    expect(PIPELINE_STAGES.map((s) => s.to)).toEqual([
      '/app/intake',
      '/app/issues',
      '/app/repositories',
      '/app/executions',
      '/app/acceptance',
      '/app/releases',
    ]);
  });

  it('阶段编号 01-06 连续且各站配有阶段语义 hint 键', () => {
    expect(PIPELINE_STAGES.map((s) => s.stageNumber)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
    ]);
    for (const stage of PIPELINE_STAGES) {
      expect(stage.hintKey).toMatch(/^shell\.stage/);
      expect(stage.hintKey).not.toBe(stage.labelKey);
    }
  });

  it('实验位/mock 位/页面枚举位不入生命周期', () => {
    const routes = PIPELINE_STAGES.map((s) => s.to);
    expect(routes).not.toContain('/app/ai-surface');
    expect(routes).not.toContain('/app/delivery');
    expect(routes).not.toContain('/app/bugs');
    expect(routes).not.toContain('/app/documents');
  });

  it('PAGE_REGISTRY 登记 intake / executions / workflows（收藏解析不再退化）', () => {
    expect(PAGE_REGISTRY['/app/intake']).toBeDefined();
    expect(PAGE_REGISTRY['/app/executions']).toBeDefined();
    expect(PAGE_REGISTRY['/app/workflows']).toBeDefined();
  });
});

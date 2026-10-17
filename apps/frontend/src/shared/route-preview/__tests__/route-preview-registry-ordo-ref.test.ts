import { describe, it, expect } from 'vitest';
import { resolveOrdoRefMatch } from '../route-preview-registry';

describe('resolveOrdoRefMatch（ordo:// 引用入口）', () => {
  it('doc/issue/bug/member/team/acceptance/release 映射到对应预览卡类型', () => {
    expect(resolveOrdoRefMatch('ordo://ordo/doc/D17')).toEqual({
      type: 'document',
      id: 'D17',
    });
    expect(resolveOrdoRefMatch('ordo://ordo/issue/ORDO-9')).toEqual({
      type: 'task',
      id: 'ORDO-9',
    });
    expect(resolveOrdoRefMatch('ordo://ordo/bug/B1')).toEqual({ type: 'bug', id: 'B1' });
    expect(resolveOrdoRefMatch('ordo://ordo/member/M1')).toEqual({ type: 'member', id: 'M1' });
    expect(resolveOrdoRefMatch('ordo://ordo/team/T1')).toEqual({ type: 'team', id: 'T1' });
    expect(resolveOrdoRefMatch('ordo://ordo/acceptance/A1')).toEqual({ type: 'acceptance', id: 'A1' });
    expect(resolveOrdoRefMatch('ordo://ordo/release/R1')).toEqual({ type: 'release', id: 'R1' });
  });

  it('非法引用返回 null', () => {
    expect(resolveOrdoRefMatch('https://example.com')).toBeNull();
    expect(resolveOrdoRefMatch('ordo://ordo/widget/D1')).toBeNull();
    expect(resolveOrdoRefMatch('ordo://ordo/doc')).toBeNull();
  });
});

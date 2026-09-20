import { describe, it, expect } from 'vitest';
import { resolveApmRefMatch } from '../route-preview-registry';

describe('resolveApmRefMatch（apm:// 引用入口）', () => {
  it('doc/issue/bug/member/team/acceptance/release 映射到对应预览卡类型', () => {
    expect(resolveApmRefMatch('apm://apm/doc/D17')).toEqual({
      type: 'document',
      id: 'D17',
    });
    expect(resolveApmRefMatch('apm://apm/issue/APM-9')).toEqual({
      type: 'task',
      id: 'APM-9',
    });
    expect(resolveApmRefMatch('apm://apm/bug/B1')).toEqual({ type: 'bug', id: 'B1' });
    expect(resolveApmRefMatch('apm://apm/member/M1')).toEqual({ type: 'member', id: 'M1' });
    expect(resolveApmRefMatch('apm://apm/team/T1')).toEqual({ type: 'team', id: 'T1' });
    expect(resolveApmRefMatch('apm://apm/acceptance/A1')).toEqual({ type: 'acceptance', id: 'A1' });
    expect(resolveApmRefMatch('apm://apm/release/R1')).toEqual({ type: 'release', id: 'R1' });
  });

  it('非法引用返回 null', () => {
    expect(resolveApmRefMatch('https://example.com')).toBeNull();
    expect(resolveApmRefMatch('apm://apm/widget/D1')).toBeNull();
    expect(resolveApmRefMatch('apm://apm/doc')).toBeNull();
  });
});

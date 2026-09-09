import { describe, expect, it } from 'vitest';
import {
  APM_REF_KINDS,
  formatApmRef,
  expandApmRefToPath,
  isApmRef,
  parseApmRef,
} from '../src/apm-ref';

/**
 * apm:// 方言（v2 纪要 §13）：parse/format 往返、路由展开、降级语义。
 */

describe('parseApmRef', () => {
  it('标准形态解析', () => {
    expect(parseApmRef('apm://apm/doc/D17')).toEqual({
      projectCode: 'apm',
      kind: 'doc',
      shortId: 'D17',
    });
  });

  it('scheme 大小写不敏感、单斜杠与多斜杠归一', () => {
    expect(parseApmRef('APM:/apm/issue/APM-139')?.shortId).toBe('APM-139');
    expect(parseApmRef('apm:////apm/doc/D1')?.shortId).toBe('D1');
  });

  it('kind 枚举外的返回 null', () => {
    expect(parseApmRef('apm://apm/widget/D1')).toBeNull();
  });

  it('段数不对 / 空 projectCode / 空 shortId 返回 null', () => {
    expect(parseApmRef('apm://apm/doc')).toBeNull();
    expect(parseApmRef('apm://apm/doc/D1/extra')).toBeNull();
    expect(parseApmRef('apm:///doc/D1')).toBeNull();
    expect(parseApmRef('apm://apm/doc/')).toBeNull();
  });

  it('非 apm: 输入返回 null', () => {
    expect(parseApmRef('https://example.com')).toBeNull();
    expect(parseApmRef('/app/documents/abc')).toBeNull();
    expect(parseApmRef(null)).toBeNull();
    expect(parseApmRef(undefined)).toBeNull();
  });

  it('isApmRef 快速分流', () => {
    expect(isApmRef('apm://x/y/z')).toBe(true);
    expect(isApmRef('APM://x/y/z')).toBe(true);
    expect(isApmRef('mailto:a@b.c')).toBe(false);
    expect(isApmRef('')).toBe(false);
  });

  it('全部 kind 均可往返：format(parse(x)) === x', () => {
    for (const kind of APM_REF_KINDS) {
      const href = `apm://proj/${kind}/ID1`;
      expect(formatApmRef(parseApmRef(href)!)).toBe(href);
    }
  });
});

describe('expandApmRefToPath', () => {
  it('doc / issue / bug / member / team / acceptance 映射到应用路由', () => {
    const ref = parseApmRef('apm://apm/doc/D17')!;
    expect(expandApmRefToPath(ref, () => 'doc-cuid')).toBe(
      '/app/documents/doc-cuid',
    );
    const issue = parseApmRef('apm://apm/issue/APM-9')!;
    expect(expandApmRefToPath(issue, (r) => r.shortId)).toBe(
      '/app/issues/APM-9',
    );
    expect(
      expandApmRefToPath(parseApmRef('apm://apm/bug/B1')!, () => 'x'),
    ).toBe('/app/bugs/x');
    expect(
      expandApmRefToPath(parseApmRef('apm://apm/member/M1')!, () => 'x'),
    ).toBe('/app/members/x');
    expect(
      expandApmRefToPath(parseApmRef('apm://apm/team/T1')!, () => 'x'),
    ).toBe('/app/teams/x');
    expect(
      expandApmRefToPath(parseApmRef('apm://apm/acceptance/A1')!, () => 'x'),
    ).toBe('/app/acceptance/x');
  });

  it('release 无路由前缀、解析失败返回 null（降级语义）', () => {
    const release = parseApmRef('apm://apm/release/R1')!;
    expect(expandApmRefToPath(release, () => 'x')).toBeNull();
    const doc = parseApmRef('apm://apm/doc/D1')!;
    expect(expandApmRefToPath(doc, () => null)).toBeNull();
  });
});

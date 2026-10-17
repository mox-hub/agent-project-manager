import { describe, expect, it } from 'vitest';
import {
  ORDO_REF_KINDS,
  formatOrdoRef,
  expandOrdoRefToPath,
  isOrdoRef,
  parseOrdoRef,
} from '../src/ordo-ref';

/**
 * ordo:// 方言（v2 纪要 §13）：parse/format 往返、路由展开、降级语义。
 */

describe('parseOrdoRef', () => {
  it('标准形态解析', () => {
    expect(parseOrdoRef('ordo://ordo/doc/D17')).toEqual({
      projectCode: 'ordo',
      kind: 'doc',
      shortId: 'D17',
    });
  });

  it('scheme 大小写不敏感、单斜杠与多斜杠归一', () => {
    expect(parseOrdoRef('ORDO:/ordo/issue/ORDO-139')?.shortId).toBe('ORDO-139');
    expect(parseOrdoRef('ordo:////ordo/doc/D1')?.shortId).toBe('D1');
  });

  it('kind 枚举外的返回 null', () => {
    expect(parseOrdoRef('ordo://ordo/widget/D1')).toBeNull();
  });

  it('段数不对 / 空 projectCode / 空 shortId 返回 null', () => {
    expect(parseOrdoRef('ordo://ordo/doc')).toBeNull();
    expect(parseOrdoRef('ordo://ordo/doc/D1/extra')).toBeNull();
    expect(parseOrdoRef('ordo:///doc/D1')).toBeNull();
    expect(parseOrdoRef('ordo://ordo/doc/')).toBeNull();
  });

  it('非 ordo: 输入返回 null', () => {
    expect(parseOrdoRef('https://example.com')).toBeNull();
    expect(parseOrdoRef('/app/documents/abc')).toBeNull();
    expect(parseOrdoRef(null)).toBeNull();
    expect(parseOrdoRef(undefined)).toBeNull();
  });

  it('isOrdoRef 快速分流', () => {
    expect(isOrdoRef('ordo://x/y/z')).toBe(true);
    expect(isOrdoRef('ORDO://x/y/z')).toBe(true);
    expect(isOrdoRef('mailto:a@b.c')).toBe(false);
    expect(isOrdoRef('')).toBe(false);
  });

  it('全部 kind 均可往返：format(parse(x)) === x', () => {
    for (const kind of ORDO_REF_KINDS) {
      const href = `ordo://proj/${kind}/ID1`;
      expect(formatOrdoRef(parseOrdoRef(href)!)).toBe(href);
    }
  });
});

describe('expandOrdoRefToPath', () => {
  it('doc / issue / bug / member / team / acceptance 映射到应用路由', () => {
    const ref = parseOrdoRef('ordo://ordo/doc/D17')!;
    expect(expandOrdoRefToPath(ref, () => 'doc-cuid')).toBe(
      '/app/documents/doc-cuid',
    );
    const issue = parseOrdoRef('ordo://ordo/issue/ORDO-9')!;
    expect(expandOrdoRefToPath(issue, (r) => r.shortId)).toBe(
      '/app/issues/ORDO-9',
    );
    expect(
      expandOrdoRefToPath(parseOrdoRef('ordo://ordo/bug/B1')!, () => 'x'),
    ).toBe('/app/bugs/x');
    expect(
      expandOrdoRefToPath(parseOrdoRef('ordo://ordo/member/M1')!, () => 'x'),
    ).toBe('/app/members/x');
    expect(
      expandOrdoRefToPath(parseOrdoRef('ordo://ordo/team/T1')!, () => 'x'),
    ).toBe('/app/teams/x');
    expect(
      expandOrdoRefToPath(parseOrdoRef('ordo://ordo/acceptance/A1')!, () => 'x'),
    ).toBe('/app/acceptance/x');
  });

  it('release 无路由前缀、解析失败返回 null（降级语义）', () => {
    const release = parseOrdoRef('ordo://ordo/release/R1')!;
    expect(expandOrdoRefToPath(release, () => 'x')).toBeNull();
    const doc = parseOrdoRef('ordo://ordo/doc/D1')!;
    expect(expandOrdoRefToPath(doc, () => null)).toBeNull();
  });
});

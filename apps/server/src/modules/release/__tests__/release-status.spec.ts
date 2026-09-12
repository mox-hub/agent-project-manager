import { BadRequestException } from '@nestjs/common';
import {
  assertReleaseTransition,
  RELEASE_TRANSITIONS,
} from '../release-status';

/** 状态机转换表（GAP-T-22）：合法链放行、非法转换 400、released 终态 */
describe('release-status 状态机', () => {
  it('主链 draft→gated→approved→publishing→released 逐级合法', () => {
    expect(() => assertReleaseTransition('draft', 'gated')).not.toThrow();
    expect(() => assertReleaseTransition('gated', 'approved')).not.toThrow();
    expect(() =>
      assertReleaseTransition('approved', 'publishing'),
    ).not.toThrow();
    expect(() =>
      assertReleaseTransition('publishing', 'released'),
    ).not.toThrow();
  });

  it('打回与失败重开路径合法（gated/approved→draft、failed→draft）', () => {
    expect(() => assertReleaseTransition('gated', 'draft')).not.toThrow();
    expect(() => assertReleaseTransition('approved', 'draft')).not.toThrow();
    expect(() => assertReleaseTransition('failed', 'draft')).not.toThrow();
  });

  it('非法跳跃转换抛 400（draft 直接发布、released 回退等）', () => {
    expect(() => assertReleaseTransition('draft', 'released')).toThrow(
      BadRequestException,
    );
    expect(() => assertReleaseTransition('draft', 'approved')).toThrow(
      BadRequestException,
    );
    expect(() => assertReleaseTransition('gated', 'publishing')).toThrow(
      BadRequestException,
    );
    expect(() => assertReleaseTransition('released', 'draft')).toThrow(
      BadRequestException,
    );
    expect(() => assertReleaseTransition('publishing', 'draft')).toThrow(
      BadRequestException,
    );
  });

  it('released 为终态：无出边（只前滚不回退）', () => {
    expect(RELEASE_TRANSITIONS.released).toEqual([]);
  });

  it('未知状态抛 400', () => {
    expect(() => assertReleaseTransition('unknown', 'draft')).toThrow(
      BadRequestException,
    );
    expect(() => assertReleaseTransition('draft', 'unknown')).toThrow(
      BadRequestException,
    );
  });
});

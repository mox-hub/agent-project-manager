import { BadRequestException } from '@nestjs/common';

/**
 * 驱动型发版状态机（CAP-K-03）。
 * draft → gated → approved → publishing → released 为主链；
 * gated/approved 可打回 draft；failed 只能重开 draft（只前滚不回退，禁删 tag）。
 */
export const RELEASE_STATUSES = [
  'draft',
  'gated',
  'approved',
  'publishing',
  'released',
  'failed',
] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RELEASE_TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  draft: ['gated'],
  gated: ['approved', 'draft'],
  approved: ['publishing', 'draft'],
  publishing: ['released', 'failed'],
  released: [],
  failed: ['draft'],
};

export function isReleaseStatus(value: string): value is ReleaseStatus {
  return (RELEASE_STATUSES as readonly string[]).includes(value);
}

/** 校验状态转换合法性，非法即 400（转换表是唯一真相） */
export function assertReleaseTransition(from: string, to: string): void {
  if (!isReleaseStatus(from) || !isReleaseStatus(to)) {
    throw new BadRequestException(`未知发版状态: ${from} → ${to}`);
  }
  if (!RELEASE_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `发版状态不允许从 ${from} 转换到 ${to}（允许: ${RELEASE_TRANSITIONS[from].join('、') || '无'}）`,
    );
  }
}

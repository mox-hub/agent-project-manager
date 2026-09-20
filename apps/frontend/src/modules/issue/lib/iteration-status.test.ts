import { describe, expect, it } from 'vitest';
import { deriveIterationStatus } from './iteration-status';

/** 固定「今天」避免测试随时间漂移 */
const NOW = new Date('2026-06-15T10:00:00+08:00'); // 本地 2026-06-15 10:00

describe('deriveIterationStatus（日期自动推导 + cancelled 手动覆盖）', () => {
  it('今天早于开始天 → 待启动', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-06-16', endDate: '2026-06-30' },
        NOW,
      ),
    ).toBe('pending');
  });

  it('当天开始（开始天 == 今天）→ 进行中', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-06-15', endDate: '2026-06-30' },
        NOW,
      ),
    ).toBe('active');
  });

  it('当天结束（结束天 == 今天）→ 进行中', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-06-01', endDate: '2026-06-15' },
        NOW,
      ),
    ).toBe('active');
  });

  it('跨天区间内 → 进行中', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-06-10', endDate: '2026-06-20' },
        NOW,
      ),
    ).toBe('active');
  });

  it('今天晚于结束天 → 已结束', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-06-01', endDate: '2026-06-14' },
        NOW,
      ),
    ).toBe('completed');
  });

  it('单日迭代（开始天 == 结束天 == 今天）→ 进行中', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-06-15', endDate: '2026-06-15' },
        NOW,
      ),
    ).toBe('active');
  });

  it('手动 cancelled 覆盖日期推导：日期进行中仍显示已取消', () => {
    expect(
      deriveIterationStatus(
        {
          startDate: '2026-06-10',
          endDate: '2026-06-20',
          status: 'cancelled',
        },
        NOW,
      ),
    ).toBe('cancelled');
  });

  it('手动 cancelled 覆盖：未开始的已取消迭代 → 已取消', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-07-01', endDate: '2026-07-15', status: 'cancelled' },
        NOW,
      ),
    ).toBe('cancelled');
  });

  it('手动 planned 不覆盖日期推导：日期已开始 → 进行中（修 bug 口径）', () => {
    expect(
      deriveIterationStatus(
        { startDate: '2026-06-01', endDate: '2026-06-30', status: 'planned' },
        NOW,
      ),
    ).toBe('active');
  });

  it('带 ISO 时间戳的日期同样按天比较（UTC 存储含时区偏移）', () => {
    // '2026-06-15' 经 UTC 解析为本地 08:00；NOW 为本地 10:00 → 同一天
    expect(
      deriveIterationStatus(
        {
          startDate: new Date('2026-06-15T00:00:00Z').toISOString(),
          endDate: new Date('2026-06-20T00:00:00Z').toISOString(),
        },
        NOW,
      ),
    ).toBe('active');
  });

  describe('日期缺失/脏数据回落后端手动 status', () => {
    it('缺日期 + status=active → 进行中', () => {
      expect(deriveIterationStatus({ status: 'active' }, NOW)).toBe('active');
    });

    it('缺日期 + status=completed → 已结束', () => {
      expect(deriveIterationStatus({ status: 'completed' }, NOW)).toBe(
        'completed',
      );
    });

    it('仅缺 endDate 且未开始 → 待启动', () => {
      expect(
        deriveIterationStatus({ startDate: '2026-07-01' }, NOW),
      ).toBe('pending');
    });

    it('仅缺 endDate（日期不全）→ 走兜底映射，status 缺失时为待启动', () => {
      // 口径：日期不全一律兜底到手动 status 映射，不做无界区间特判
      expect(
        deriveIterationStatus({ startDate: '2026-06-01' }, NOW),
      ).toBe('pending');
    });

    it('非法日期字符串回退 pending', () => {
      expect(
        deriveIterationStatus(
          { startDate: 'not-a-date', endDate: 'also-bad' },
          NOW,
        ),
      ).toBe('pending');
    });
  });
});

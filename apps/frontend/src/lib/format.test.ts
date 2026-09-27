import { describe, expect, it } from 'vitest';

import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelative,
  formatTime,
} from './format';

// 固定本地时刻用**本地时间构造器**（不是 ISO 串）：断言才与跑测试的机器时区无关。
// 用 ISO 串只能断言「与同瞬间的等价写法一致」（见「跨时区」一节），断言不了字面量。
const LOCAL = new Date(2026, 8, 27, 14, 32, 5); // 2026-09-27 14:32:05（本地时区）
const pad = (n: number) => String(n).padStart(2, '0');

/** 全部导出函数：无效输入必须一律返回空串（§14 边界约定） */
type AnyFormatter = (...args: unknown[]) => string;

const ALL_FORMATTERS: Array<[string, AnyFormatter]> = [
  ['formatDate', formatDate],
  ['formatDateTime', formatDateTime],
  ['formatRelative', formatRelative],
  ['formatDateShort', formatDateShort],
  ['formatTime', formatTime],
  ['formatNumber', formatNumber],
  ['formatCompact', formatCompact],
  ['formatPercent', formatPercent],
  ['formatCurrency', formatCurrency],
  ['formatDuration', formatDuration],
];

describe('无效输入约定：一律返回空串，绝不抛异常', () => {
  it('null / undefined 对全部 10 个函数都返回空串', () => {
    for (const [name, fn] of ALL_FORMATTERS) {
      expect(fn(null), name).toBe('');
      expect(fn(undefined), name).toBe('');
    }
  });

  it('非法日期（含空串、垃圾串、Invalid Date、NaN、Infinity）返回空串而不是抛错', () => {
    const badDates = [
      'not-a-date',
      '',
      '   ',
      '2026-13-45',
      '2026-09-27T25:00:00',
      new Date('x'),
      new Date(NaN),
      NaN,
      Infinity,
      -Infinity,
    ];
    for (const bad of badDates) {
      expect(formatDate(bad), String(bad)).toBe('');
      expect(formatDateTime(bad), String(bad)).toBe('');
      expect(formatTime(bad), String(bad)).toBe('');
      expect(formatDateShort(bad), String(bad)).toBe('');
      expect(formatRelative(bad), String(bad)).toBe('');
    }
  });

  it('非有限数与负耗时返回空串（负数不是「负数时长」，是脏数据）', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(formatNumber(bad)).toBe('');
      expect(formatCompact(bad)).toBe('');
      expect(formatPercent(bad)).toBe('');
      expect(formatCurrency(bad)).toBe('');
      expect(formatDuration(bad)).toBe('');
    }
    expect(formatDuration(-1)).toBe('');
    expect(formatDuration(-3_600_000)).toBe('');
  });
});

describe('日期：formatDate / formatDateTime / formatTime', () => {
  it('按本地时区渲染，形态由 §14.2 钉死', () => {
    expect(formatDate(LOCAL)).toBe('2026-09-27');
    expect(formatDateTime(LOCAL)).toBe('2026-09-27 14:32');
    expect(formatTime(LOCAL)).toBe('14:32');
  });

  it('接受 Date / ISO 字符串 / 毫秒时间戳三种入参，结果一致', () => {
    expect(formatDate(LOCAL.getTime())).toBe('2026-09-27');
    expect(formatDateTime(LOCAL.getTime())).toBe('2026-09-27 14:32');
    // 'yyyy-MM-dd' 按**本地零点**解析（parseISO 语义）——任何时区下日期都不偏移
    expect(formatDate('2026-09-27')).toBe('2026-09-27');
    expect(formatDate(' 2026-09-27 ')).toBe('2026-09-27'); // 容忍首尾空白
  });

  it('ISO 串按下标时刻所在本地日渲染，不按 UTC 日渲染', () => {
    const iso = '2026-09-27T12:00:00Z';
    const local = new Date(iso);
    expect(formatDate(iso)).toBe(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
    );
    expect(formatTime(iso)).toBe(`${pad(local.getHours())}:${pad(local.getMinutes())}`);
  });
});

describe('跨时区（§14.5：存 UTC、按用户本地时区渲染）', () => {
  it('同一瞬间的不同时区写法必须解析为同一结果', () => {
    const utc = '2026-09-27T12:00:00Z';
    expect(formatDateTime('2026-09-27T20:00:00+08:00')).toBe(formatDateTime(utc));
    expect(formatDateTime('2026-09-27T04:00:00-08:00')).toBe(formatDateTime(utc));
    expect(formatDate('2026-09-27T20:00:00+08:00')).toBe(formatDate(utc));
  });

  it('纯日期串是「日历日」不是「瞬间」：任何时区都渲染成同一天', () => {
    // 若这里改用 new Date('2026-09-27')（UTC 零点），西半球时区会渲染成 2026-09-26
    expect(formatDate('2026-09-27')).toBe('2026-09-27');
    expect(formatDate('2026-01-01')).toBe('2026-01-01');
    expect(formatDate('2026-12-31')).toBe('2026-12-31');
  });
});

describe('formatDateShort：随 locale 变化', () => {
  it('中文档 9月27日、英文档 Sep 27', () => {
    expect(formatDateShort(LOCAL)).toBe('9月27日'); // 默认 locale = DEFAULT_LOCALE = zh-CN
    expect(formatDateShort(LOCAL, { locale: 'zh-CN' })).toBe('9月27日');
    expect(formatDateShort(LOCAL, { locale: 'zh-TW' })).toBe('9月27日'); // zh* 归一化
    expect(formatDateShort(LOCAL, { locale: 'en' })).toBe('Sep 27');
    expect(formatDateShort(LOCAL, { locale: 'en-US' })).toBe('Sep 27');
  });

  it('未支持的 locale 落英文档（不会因非法串抛 RangeError）', () => {
    expect(formatDateShort(LOCAL, { locale: 'fr-FR' })).toBe('Sep 27');
    expect(formatDateShort(LOCAL, { locale: 'not a locale' })).toBe('Sep 27');
    expect(formatDateShort(LOCAL, { locale: '' })).toBe('9月27日'); // 空串回落默认档
  });
});

describe('formatRelative：7 天内相对、超过 7 天退化为绝对日期（§14.5）', () => {
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

  it('中文档相对时间', () => {
    expect(formatRelative(minutesAgo(3))).toBe('3 分钟前');
    expect(formatRelative(minutesAgo(1))).toBe('1 分钟前');
    expect(formatRelative(daysAgo(6))).toBe('6 天前');
  });

  it('英文档相对时间', () => {
    expect(formatRelative(minutesAgo(3), { locale: 'en' })).toBe('3 minutes ago');
    expect(formatRelative(daysAgo(6), { locale: 'en' })).toBe('6 days ago');
  });

  it('超过 7 天退化为绝对日期（与 formatDate 同形）', () => {
    const old = daysAgo(8);
    expect(formatRelative(old)).toBe(formatDate(old));
    expect(formatRelative(old)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('数字：formatNumber / formatCompact / formatPercent / formatCurrency', () => {
  it('formatNumber 千分位', () => {
    expect(formatNumber(1_234_567)).toBe('1,234,567');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1_234.5678, { maximumFractionDigits: 2 })).toBe('1,234.57');
  });

  it('formatCompact 大数缩写随 locale（中文用「万」、英文用 K/M）', () => {
    expect(formatCompact(12_000)).toBe('1.2万');
    expect(formatCompact(1_700_000)).toBe('170万');
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(12_000, { locale: 'en' })).toBe('12K');
    expect(formatCompact(3_400_000, { locale: 'en' })).toBe('3.4M');
  });

  it('formatPercent 入参是比值（0.425 → 42.5%）', () => {
    expect(formatPercent(0.425)).toBe('42.5%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(0.1234)).toBe('12.3%');
    expect(formatPercent(-0.5)).toBe('-50%');
    expect(formatPercent(0.425, { locale: 'en' })).toBe('42.5%');
  });

  it('formatCurrency 默认美元、可换币种', () => {
    expect(formatCurrency(0.51, { locale: 'en' })).toBe('$0.51');
    expect(formatCurrency(0.51, { locale: 'zh-CN' })).toBe('US$0.51');
    expect(formatCurrency(1_234.5, { locale: 'zh-CN', currency: 'CNY' })).toBe('¥1,234.50');
    expect(formatCurrency(0)).toBe('US$0.00');
  });
});

describe('formatDuration：1h 12m / 9m 23s / 45s / 300ms', () => {
  it('分档：≥1h 到分、≥1m 到秒、<1m 到秒、<1s 到毫秒', () => {
    expect(formatDuration(4_320_000)).toBe('1h 12m');
    expect(formatDuration(5_400_000)).toBe('1h 30m');
    expect(formatDuration(3_600_000)).toBe('1h');
    expect(formatDuration(563_000)).toBe('9m 23s');
    expect(formatDuration(63_000)).toBe('1m 3s');
    expect(formatDuration(60_000)).toBe('1m');
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(300)).toBe('300ms');
    expect(formatDuration(0)).toBe('0ms');
  });

  it('§14.3 的两个示例逐字对齐', () => {
    expect(formatDuration(4_320_000)).toBe('1h 12m');
    expect(formatDuration(5_400_000)).toBe('1h 30m');
  });
});

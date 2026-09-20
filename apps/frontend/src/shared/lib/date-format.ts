/**
 * 本地日期/时间格式化统一入口（收敛各组件手写实现）。
 * 语义约定：
 * - 相对时间：中文，<1 分钟输出「刚刚」，其余用 formatDistanceToNow + addSuffix + zhCN
 *   （例：「3 分钟前」「5 小时前」「3 天前」「2 个月前」）；空值/无法解析返回 fallback。
 * - 绝对时间/日期：本地时区，显式格式串（yyyy-MM-dd HH:mm:ss / yyyy/MM/dd），
 *   取代各处行为随环境 locale 漂移的 toLocaleString()；空值/无法解析返回 fallback。
 * - i18n 变体：文案走 t() 翻译键（跟随应用语言），仅统一分支逻辑，>24h 回落本地时间字符串。
 */
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 相对时间（中文）：<1 分钟「刚刚」，之后 date-fns 距离 + 「前」后缀 */
export function formatRelativeTime(value: DateInput, fallback = '—'): string {
  const date = toDate(value);
  if (!date) return fallback;
  if (Date.now() - date.getTime() < 60_000) return '刚刚';
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
}

/** 绝对日期时间（本地时区）：yyyy-MM-dd HH:mm:ss */
export function formatDateTime(value: DateInput, fallback = '—'): string {
  const date = toDate(value);
  return date ? format(date, 'yyyy-MM-dd HH:mm:ss') : fallback;
}

/** 仅日期（本地时区）：yyyy/MM/dd */
export function formatDate(value: DateInput, fallback = '—'): string {
  const date = toDate(value);
  return date ? format(date, 'yyyy/MM/dd') : fallback;
}

/** 时钟时间（本地时区）：HH:mm */
export function formatClock(value: DateInput, fallback = '—'): string {
  const date = toDate(value);
  return date ? format(date, 'HH:mm') : fallback;
}

export interface I18nRelativeTimeKeys {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
}

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/**
 * i18n 相对时间：<1 分钟 / <1 小时 / <24 小时用翻译键（{{n}} 占位），
 * 更早或空值/无法解析回落本地时间字符串 / fallback。文案随应用语言。
 */
export function formatI18nRelativeTime(
  value: string | null | undefined,
  t: Translate,
  keys: I18nRelativeTimeKeys,
  fallback = '—',
): string {
  if (!value) return fallback;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return fallback;
  const diffMin = Math.floor((Date.now() - time) / 60_000);
  if (diffMin < 1) return t(keys.justNow);
  if (diffMin < 60) return t(keys.minutesAgo, { n: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t(keys.hoursAgo, { n: diffHour });
  return new Date(time).toLocaleString();
}

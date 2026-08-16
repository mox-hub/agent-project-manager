/**
 * i18n configuration constants
 */

export type Locale = 'en' | 'zh-CN';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh-CN'];

export const DEFAULT_LOCALE: Locale = 'zh-CN';

export const LOCALE_LABELS: Record<Locale, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  'en': '🇺🇸',
  'zh-CN': '🇨🇳',
};

/**
 * Storage key for persisting user's language preference
 */
export const LOCALE_STORAGE_KEY = 'apm-locale';

/**
 * i18n shared types
 */

export type Locale = 'en' | 'zh-CN';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh-CN'];

export const DEFAULT_LOCALE: Locale = 'zh-CN';

export interface LocaleOption {
  code: Locale;
  label: string;
  nativeLabel: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
];

/**
 * Namespace for translation keys
 */
export type TranslationNamespace = 'common' | 'nav' | 'auth' | 'task' | 'project' | 'notification' | 'error' | 'settings' | 'commonStatus';

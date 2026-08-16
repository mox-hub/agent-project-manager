/**
 * i18next configuration
 * @see https://www.i18next.com/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './config';

export const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
} as const;

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: ['en', 'zh-CN'],
    defaultNS: 'translation',
    ns: ['translation'],

    // Language detection options
    detection: {
      // Order of preference for language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache the language detection result
      caches: ['localStorage'],
      // Lookup from localStorage key
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React options
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  } as Parameters<typeof i18n.init>[0]);

export default i18n;

/**
 * Change the current language
 * @param locale - Target locale
 */
export async function changeLanguage(locale: string): Promise<void> {
  await i18n.changeLanguage(locale);
  // Also save to localStorage explicitly
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}

/**
 * Check if current language is RTL
 * Currently returns false, reserved for RTL language support
 */
export function isRTL(): boolean {
  return false;
}

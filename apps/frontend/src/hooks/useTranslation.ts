/**
 * Custom translation hook with app-specific utilities
 * @see https://react.i18next.com/
 */

import { useTranslation as useI18nTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '@/i18n';
import type { Locale } from '@/shared/types/i18n';

/**
 * Extended translation hook for the application
 */
export function useTranslation() {
  const { t, i18n } = useI18nTranslation();

  /**
   * Translate with namespace prefix
   */
  const tn = (key: string, options?: { defaultValue?: string }) => {
    return t(key, options);
  };

  /**
   * Change language
   */
  const changeLocale = async (locale: Locale) => {
    await changeLanguage(locale);
  };

  /**
   * Get current locale
   */
  const currentLocale = (i18n.language || 'zh-CN') as Locale;

  /**
   * Check if current locale is a specific language
   */
  const isLocale = (locale: Locale) => i18n.language === locale;

  return {
    t,
    i18n,
    tn,
    changeLocale,
    currentLocale,
    isLocale,
    getCurrentLanguage,
  };
}

/**
 * Utility function to get translation without hook context
 * Use only when hook context is not available
 */
export function getTranslation(key: string, options?: Record<string, unknown>): string {
  // This will use the initialized i18n instance
  const { default: i18n } = require('@/i18n');
  return i18n.t(key, options);
}

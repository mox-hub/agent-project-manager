/**
 * Language Switcher Component
 * Allows users to switch between supported languages at runtime
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORTED_LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from '@/i18n/config';
import type { Locale } from '@/shared/types/i18n';

interface LanguageSwitcherProps {
  /** Callback when language changes */
  onChange?: (locale: Locale) => void;
  /** Current selected locale */
  value?: Locale;
  /** Show flag icons */
  showFlag?: boolean;
  /** Show full language name */
  showLabel?: boolean;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Language switcher with dropdown menu
 */
export function LanguageSwitcher({
  onChange,
  value,
  showFlag = true,
  showLabel = true,
  compact = false,
  className = '',
}: LanguageSwitcherProps) {
  const { i18n, changeLocale } = useTranslation();
  const currentLocale = (value || i18n.language || 'zh-CN') as Locale;

  const handleValueChange = async (newLocale: string) => {
    await changeLocale(newLocale as Locale);
    onChange?.(newLocale as Locale);
  };

  const getDisplayText = (locale: Locale) => {
    const parts: string[] = [];
    if (showFlag) {
      parts.push(LOCALE_FLAGS[locale]);
    }
    if (showLabel) {
      parts.push(LOCALE_LABELS[locale]);
    }
    return parts.join(' ');
  };

  if (compact) {
    return (
      <Select value={currentLocale} onValueChange={handleValueChange}>
        <SelectTrigger className={`w-auto border-0 bg-transparent ${className}`}>
          <span className="text-lg">{LOCALE_FLAGS[currentLocale]}</span>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LOCALES.map((locale) => (
            <SelectItem key={locale} value={locale}>
              <span className="flex items-center gap-2">
                <span>{LOCALE_FLAGS[locale]}</span>
                <span>{LOCALE_LABELS[locale]}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={currentLocale} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-[160px] ${className}`}>
        <SelectValue>
          <span className="flex items-center gap-2">
            {showFlag && <span>{LOCALE_FLAGS[currentLocale]}</span>}
            {showLabel && <span>{LOCALE_LABELS[currentLocale]}</span>}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale}>
            <span className="flex items-center gap-2">
              {showFlag && <span>{LOCALE_FLAGS[locale]}</span>}
              {showLabel && <span>{LOCALE_LABELS[locale]}</span>}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default LanguageSwitcher;

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { SettingsHeader } from '@/components/semantic/settings-header';
import { SectionScrubber } from '@/components/semantic/section-scrubber';
import { SettingsSectionCard } from '@/components/semantic/settings-section-card';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { ThemeModeCard } from '@/components/semantic/theme-mode-card';
import { useTheme } from '@/shared/theme/theme-context';
import { LanguageSwitcher } from '@/shared/components/language-switcher';
import {
  ALargeSmall,
  Languages,
  Palette,
  Type,
  ZoomIn,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SANS_FONT_PRESETS = ['Inter', 'Source Han Sans SC', 'Microsoft YaHei', 'PingFang SC'];
const MONO_FONT_PRESETS = ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'Courier New'];

/** Local Font Access API（渐进增强：仅部分 Chromium 支持，宪法/方案批 2.5） */
interface LocalFontMetadata {
  family: string;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontMetadata[]>;
  }
}

/** 单个字体槽位选择器：预置列表 + 系统字体（如可用）+ 手动输入实时预览 */
function FontPickerField({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  onChange: (font: string) => void;
}) {
  const { t } = useTranslation();
  const [systemFonts, setSystemFonts] = useState<string[] | null>(null);
  const [systemUnavailable, setSystemUnavailable] = useState(false);
  const supportsLocalFonts = typeof window !== 'undefined' && typeof window.queryLocalFonts === 'function';

  const pickFromSystem = async () => {
    if (!window.queryLocalFonts) return;
    try {
      const fonts = await window.queryLocalFonts();
      setSystemFonts([...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b)));
    } catch {
      setSystemUnavailable(true);
    }
  };

  const previewStyle = value.trim()
    ? { fontFamily: `"${value.trim().replace(/["']/g, '')}", Inter, sans-serif` }
    : undefined;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-xs text-muted-foreground hover:text-foreground">
            {t('settings.fontDefault')}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((font) => (
          <button
            key={font}
            type="button"
            onClick={() => onChange(font)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs transition-colors',
              value === font
                ? 'border-ring bg-accent text-accent-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {font}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('settings.fontCustomPlaceholder')}
          className="h-8 text-xs"
        />
        {supportsLocalFonts && (
          <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={pickFromSystem}>
            {t('settings.fontFromSystem')}
          </Button>
        )}
      </div>
      {systemFonts && (
        <div className="mt-2">
          <Select value="" onValueChange={(font) => onChange(font)}>
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue placeholder={t('settings.fontsCount', { count: systemFonts.length })} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {systemFonts.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {systemUnavailable && (
        <p className="mt-2 text-xs text-muted-foreground">{t('settings.fontFromSystemUnavailable')}</p>
      )}
      <div className="mt-3 rounded-md bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">{t('settings.fontPreview')}</p>
        <p className="mt-1 text-sm" style={previewStyle}>
          {t('settings.fontPreviewSample')}
        </p>
      </div>
    </div>
  );
}

/** 外观设置子页：主题模式 / 界面缩放 / 字体 / 字号 / 语言（设置页语义组件批试点） */
export function AppearanceSettingsSection() {
  const { t } = useTranslation();
  const { mode, setTheme, appearance, setAppearance } = useTheme();

  // scrubber 栏目清单：useMemo 稳定引用，避免缩放拖动等重渲染重建 observer
  const sections = useMemo(
    () => [
      { id: 'appearance-zoom', label: t('settings.interfaceZoom') },
      { id: 'appearance-fonts', label: t('settings.appearanceFonts') },
      { id: 'appearance-fontsize', label: t('settings.fontSize') },
      { id: 'appearance-language', label: t('settings.language.title') },
    ],
    [t],
  );

  return (
    <PageShell
      variant="standard"
      className="bg-background text-foreground"
      contentClassName="gap-4"
    >
      {/* 设置页头（语义组件批 2026-10-01）：大标题双态吸顶 + 栏目跳转 */}
      <SettingsHeader
        icon={Palette}
        tone="purple"
        title={t('settings.appearance')}
        description={t('settings.appearanceDesc')}
        actions={<FavoriteToggle label={nodeToText(t('settings.appearance')).trim()} />}
        scrubber={<SectionScrubber sections={sections} />}
      />

      {/* 主题模式：三档（日间 / 夜间 / 跟随系统），实现收在语义组件层 */}
      <ThemeModeCard
        value={mode}
        onChange={setTheme}
        title={t('settings.themeMode')}
        options={{
          light: { label: t('settings.lightMode'), desc: t('settings.lightModeDesc') },
          dark: { label: t('settings.darkMode'), desc: t('settings.darkModeDesc') },
          system: { label: t('settings.systemMode'), desc: t('settings.systemModeDesc') },
        }}
      />

          {/* 界面缩放 */}
          <SettingsSectionCard
            id="appearance-zoom"
            icon={ZoomIn}
            tone="green"
            title={t('settings.interfaceZoom')}
            description={t('settings.interfaceZoomDesc')}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppearance({ zoom: Math.max(50, appearance.zoom - 10) })}
                disabled={appearance.zoom <= 50}
              >
                <span className="text-lg">−</span>
              </Button>
              <input
                type="range"
                min="50"
                max="200"
                step="10"
                value={appearance.zoom}
                onChange={(e) => setAppearance({ zoom: Number(e.target.value) })}
                className="flex-1 accent-accent-blue"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppearance({ zoom: Math.min(200, appearance.zoom + 10) })}
                disabled={appearance.zoom >= 200}
              >
                <span className="text-lg">+</span>
              </Button>
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {appearance.zoom}%
              </span>
            </div>
          </SettingsSectionCard>

          {/* 字体选择（批 2.5：--font-user-* 变量，字体只管 family，字号缩放走独立机制） */}
          <SettingsSectionCard
            id="appearance-fonts"
            icon={Type}
            tone="purple"
            title={t('settings.appearanceFonts')}
            description={t('settings.appearanceFontsDesc')}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FontPickerField
                label={t('settings.fontUserSans')}
                value={appearance.userSansFont}
                presets={SANS_FONT_PRESETS}
                onChange={(font) => setAppearance({ userSansFont: font })}
              />
              <FontPickerField
                label={t('settings.fontUserMono')}
                value={appearance.userMonoFont}
                presets={MONO_FONT_PRESETS}
                onChange={(font) => setAppearance({ userMonoFont: font })}
              />
            </div>
          </SettingsSectionCard>

          {/* 字号调整 */}
          <SettingsSectionCard
            id="appearance-fontsize"
            icon={ALargeSmall}
            tone="yellow"
            title={t('settings.fontSize')}
            description={t('settings.fontSizeDesc')}
          >
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <button
                type="button"
                onClick={() => setAppearance({ fontSize: 'small' })}
                className={cn(
                  'flex-1 text-center',
                  appearance.fontSize === 'small'
                    ? 'text-accent-blue font-medium'
                    : 'text-muted-foreground',
                )}
              >
                <p className="text-sm">{t('settings.fontSizeSmall')}</p>
              </button>
              <div className={`mx-4 flex-1 text-center ${appearance.fontSize === 'medium' ? 'text-accent-blue font-medium' : 'text-muted-foreground'}`}>
                <p className="text-base">{t('settings.fontSizeMedium')}</p>
              </div>
              <button
                type="button"
                onClick={() => setAppearance({ fontSize: 'large' })}
                className={cn(
                  'flex-1 text-center',
                  appearance.fontSize === 'large'
                    ? 'text-accent-blue font-medium'
                    : 'text-muted-foreground',
                )}
              >
                <p className="text-lg">{t('settings.fontSizeLarge')}</p>
              </button>
            </div>
          </SettingsSectionCard>

          {/* 语言设置 */}
          <SettingsSectionCard
            id="appearance-language"
            icon={Languages}
            tone="blue"
            title={t('settings.language.title')}
            description={t('settings.language.description')}
          >
            <LanguageSwitcher />
          </SettingsSectionCard>
    </PageShell>
  );
}

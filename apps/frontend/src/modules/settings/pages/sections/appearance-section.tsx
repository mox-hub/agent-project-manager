import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { useTheme } from '@/shared/theme/theme-context';
import { LanguageSwitcher } from '@/shared/components/language-switcher';
import { Palette, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
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
              <SelectValue placeholder={`${systemFonts.length} fonts`} />
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
          Aa 字体预览 123 — The quick brown fox jumps over the lazy dog.
        </p>
      </div>
    </div>
  );
}

/** 外观设置子页：主题模式 / 预设 / 缩放 / 字体 / 字号 / 语言 */
export function AppearanceSettingsSection() {
  const { t } = useTranslation();
  const { mode, setTheme, appearance, setAppearance } = useTheme();

  const sectionTitleClassName = 'text-sm font-medium text-foreground';

  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={Palette} title={t('settings.appearance')} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card
            className="border-border shadow-none"
            data-ai-component="settings.global-settings.appearance-card"
          >
            <CardHeader>
              <CardTitle>{t('settings.appearanceTitle')}</CardTitle>
              <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 主题模式预览卡片（预览缩略图为静态示意图，灰阶色值有意为之） */}
              <div>
                <p className={sectionTitleClassName}>{t('settings.themeMode')}</p>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    { id: 'light', label: t('settings.lightMode'), desc: t('settings.lightModeDesc'), bg: 'bg-white', text: 'text-muted-foreground', border: 'border-border', preview: 'bg-muted/40' },
                    { id: 'dark', label: t('settings.darkMode'), desc: t('settings.darkModeDesc'), bg: 'bg-zinc-950', text: 'text-muted-foreground', border: 'border-border', preview: 'bg-muted' },
                  ].map((item) => {
                    const isActive = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTheme(item.id as 'light' | 'dark')}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all hover:scale-102 ${
                          isActive ? `${item.border} ring-2 ring-accent-blue` : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        {/* 预览窗口 */}
                        <div className={`aspect-video w-full rounded-lg ${item.bg} ${item.border} border p-2 mb-3`}>
                          <div className={`h-full ${item.preview} rounded-md p-1.5`}>
                            <div className={`h-2 w-3/4 rounded ${item.id === 'light' ? 'bg-muted' : 'bg-gray-700'} mb-1`} />
                            <div className={`h-1.5 w-1/2 rounded ${item.id === 'light' ? 'bg-muted' : 'bg-muted'}`} />
                          </div>
                        </div>
                        <p className={`font-medium ${isActive ? item.text : 'text-foreground'}`}>{item.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                        {isActive && (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 主题预设：宪法 §5.6 只保留 linear 一套，预设入口已移除（接口保留，见 shared/theme/presets.ts） */}

              {/* 界面缩放 */}
              <div>
                <div className="flex items-center justify-between">
                  <p className={sectionTitleClassName}>{t('settings.interfaceZoom')}</p>
                  <span className="font-mono text-sm text-muted-foreground">{appearance.zoom}%</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
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
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t('settings.interfaceZoomDesc')}</p>
              </div>

              {/* 字体选择（批 2.5：--font-user-* 变量，字体只管 family，字号缩放走独立机制） */}
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

              {/* 字号调整 */}
              <div>
                <p className={sectionTitleClassName}>{t('settings.fontSize')}</p>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-4">
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
                    <p className="text-xs">Small</p>
                  </button>
                  <div className={`mx-4 flex-1 text-center ${appearance.fontSize === 'medium' ? 'text-accent-blue font-medium' : 'text-muted-foreground'}`}>
                    <p className="text-base">{t('settings.fontSizeMedium')}</p>
                    <p className="text-sm">Medium</p>
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
                    <p className="text-sm">Large</p>
                  </button>
                </div>
              </div>

              {/* 语言设置 */}
              <div>
                <p className={sectionTitleClassName}>{t('settings.language.title')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('settings.language.description')}
                </p>
                <div className="mt-2">
                  <LanguageSwitcher />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

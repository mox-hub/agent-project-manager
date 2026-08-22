import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { useTheme } from '@/shared/theme/theme-context';
import { LanguageSwitcher } from '@/shared/components/language-switcher';
import { Palette, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { FontFamily } from '@/shared/theme/theme-context';

/** 外观设置子页：主题模式 / 预设 / 缩放 / 字体 / 字号 / 语言 */
export function AppearanceSettingsSection() {
  const { t } = useTranslation();
  const { mode, setTheme, preset, setPreset, appearance, setAppearance } = useTheme();

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
                    { id: 'light', label: t('settings.lightMode'), desc: t('settings.lightModeDesc'), bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200', preview: 'bg-gray-50' },
                    { id: 'dark', label: t('settings.darkMode'), desc: t('settings.darkModeDesc'), bg: 'bg-zinc-950', text: 'text-gray-100', border: 'border-gray-800', preview: 'bg-gray-900' },
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
                            <div className={`h-2 w-3/4 rounded ${item.id === 'light' ? 'bg-gray-300' : 'bg-gray-700'} mb-1`} />
                            <div className={`h-1.5 w-1/2 rounded ${item.id === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} />
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

              {/* 主题预设 */}
              <div>
                <p className={sectionTitleClassName}>{t('settings.themePreset')}</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { id: 'figma', label: 'Figma', desc: t('settings.presetFigma') },
                    { id: 'linear', label: 'Linear', desc: t('settings.presetLinear') },
                    { id: 'notion', label: 'Notion', desc: t('settings.presetNotion') },
                  ].map((item) => {
                    const isActive = preset === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPreset(item.id as 'figma' | 'linear' | 'notion')}
                        className={`rounded-lg border p-3 text-center transition-all hover:scale-102 ${
                          isActive
                            ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                            : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <p className="font-medium">{item.label}</p>
                        <p className="mt-0.5 text-xs opacity-70">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

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

              {/* 字体选择 */}
              <div>
                <p className={sectionTitleClassName}>{t('settings.fontFamily')}</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { id: 'default', label: t('settings.fontDefault'), sample: 'Aa', style: 'font-sans' },
                    { id: 'sans', label: t('settings.fontSans'), sample: 'Aa', style: 'font-[system-ui]' },
                    { id: 'mono', label: t('settings.fontMono'), sample: 'Aa', style: 'font-mono' },
                  ].map((item) => {
                    const isActive = appearance.fontFamily === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAppearance({ fontFamily: item.id as FontFamily })}
                        className={`rounded-lg border p-3 text-center transition-all hover:scale-102 ${item.style} ${
                          isActive
                            ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                            : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <p className="text-2xl font-medium">{item.sample}</p>
                        <p className="mt-1 text-xs">{item.label}</p>
                      </button>
                    );
                  })}
                </div>
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

import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { useTheme, type ThemeMode } from '@/shared/theme/theme-context';
import { useDesktopCompactWindow } from '@/modules/desktop';
import { BlueprintCanvas } from './visuals/blueprint-canvas';
import { PrismCanvas } from './visuals/prism-canvas';
import { ServerConfigDialog } from './server-config-dialog';
import { cn } from '@/lib/utils';
import {
  Sun,
  Moon,
  RotateCw,
  Globe,
  Languages,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';

export type SurfaceMode = 'human' | 'ai';

const SURFACE_STORAGE_KEY = 'apm_auth_surface_mode';

function useSafeTheme(): { mode: ThemeMode; toggleTheme: () => void } {
  try {
    const theme = useTheme();
    return { mode: theme.mode, toggleTheme: theme.toggleTheme };
  } catch {
    // 单元测试或环境无 ThemeProvider 时的安全兜底
    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');
    return {
      mode: isDark ? 'dark' : 'light',
      toggleTheme: () => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark');
        }
      },
    };
  }
}

interface AuthVisualCardProps {
  children: ReactNode;
  title?: string;
  isRegister?: boolean;
}

export function AuthVisualCard({
  children,
  isRegister: _isRegister = false,
}: AuthVisualCardProps) {
  const { i18n } = useTranslation();
  const { mode, toggleTheme } = useSafeTheme();
  const isDark = mode === 'dark';
  // 桌面壳：认证面期间主窗口收缩为紧凑小窗并隐藏标题栏（web 端 no-op）
  useDesktopCompactWindow();

  // 双表面状态：一面人类控制面 (human)，一面 AI 执行面 (ai)
  const [surface, setSurface] = useState<SurfaceMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SURFACE_STORAGE_KEY);
      if (saved === 'human' || saved === 'ai') {
        return saved;
      }
    }
    return 'human';
  });

  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const toggleSurface = () => {
    const next: SurfaceMode = surface === 'human' ? 'ai' : 'human';
    setSurface(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SURFACE_STORAGE_KEY, next);
    }
  };

  const currentLang = i18n?.language?.startsWith('zh') ? 'zh' : 'en';

  const handleLanguageToggle = () => {
    const nextLang = currentLang === 'zh' ? 'en' : 'zh-CN';
    if (i18n && typeof i18n.changeLanguage === 'function') {
      void i18n.changeLanguage(nextLang);
    }
  };

  const isAi = surface === 'ai';

  // 人类面 ⟷ AI 面的双表面微文案与哲学叙事
  const surfaceMetadata = {
    human: {
      tag: '人类控制面 · 掌舵中枢',
      quote: [
        '新一代 AI 原生项目治理平台',
        '人类控制面 · 构筑可信赖的软件大厦',
        '指令由此发出，复杂工程尽在掌控之中',
      ],
      switchPrompt: '翻转卡片至「AI 执行面」',
    },
    ai: {
      tag: 'AI 执行面 · 深度运行时',
      quote: [
        '新一代 AI 原生项目治理平台',
        'AI 执行面 · 将混沌需求折射为严密契约',
        '默默守护每一行代码，严把每一个验收门禁',
      ],
      switchPrompt: '翻转卡片至「人类控制面」',
    },
  }[surface];

  // 根据当前模式自适应左侧背景氛围色 (与右侧画布背景色精确同频交融)
  // 人类控制面：清爽理智的工程蓝灰 (Light: 浅工程灰白, Dark: 深幽工程蓝黑 #091224)
  // AI 执行面：深邃纯粹的光学暗室 (Light: 纯净 card 白, Dark: 极夜石墨黑 #060810)
  const leftBgStyle = {
    backgroundColor: isDark
      ? isAi
        ? '#060810'
        : '#091224'
      : isAi
        ? 'var(--color-card, #ffffff)'
        : 'rgba(248, 250, 252, 0.95)',
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6 transition-colors duration-500">
      {/* 现代双栏一体化大卡片 */}
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border/80 shadow-xl md:grid md:min-h-130 md:grid-cols-12 transition-colors duration-500 bg-card">
        {/* 桌面紧凑窗口拖动区：盖住卡片顶部品牌行（右上控制按钮组 z-30 在其上可点；
            -webkit-app-region 在浏览器端无效，不影响 web） */}
        <div
          className="absolute inset-x-0 top-0 z-20 h-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* 右上角圆形悬浮控制按钮组 (反转卡片 + 日夜间切换) */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {/* 1. 双表面反转圆形按钮 (role="switch") */}
          <button
            type="button"
            role="switch"
            aria-checked={isAi}
            onClick={toggleSurface}
            aria-label={surfaceMetadata.switchPrompt}
            title={surfaceMetadata.switchPrompt}
            className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card/85 text-foreground backdrop-blur-md transition-all hover:scale-105 hover:bg-muted active:scale-95 shadow-xs group"
          >
            <RotateCw
              className={cn(
                'size-4 transition-transform duration-500',
                isAi
                  ? 'rotate-180 text-accent-blue'
                  : 'text-primary group-hover:rotate-180',
              )}
            />
          </button>

          {/* 2. 日夜间切换圆形按钮 (role="switch") */}
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            aria-label={isDark ? '切换至日间浅色模式' : '切换至夜间深色模式'}
            title={isDark ? '切换至日间浅色模式' : '切换至夜间深色模式'}
            className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card/85 text-foreground backdrop-blur-md transition-all hover:scale-105 hover:bg-muted active:scale-95 shadow-xs"
          >
            {isDark ? (
              <Sun className="size-4 text-accent-yellow transition-transform" />
            ) : (
              <Moon className="size-4 text-muted-foreground transition-transform" />
            )}
          </button>
        </div>

        {/* 左侧：人机交互、品牌叙事与表单操作区 (背景色随右侧模式联动自适应) */}
        <div
          style={leftBgStyle}
          className="flex flex-col justify-between p-6 sm:p-8 md:col-span-6 lg:col-span-5 transition-colors duration-500"
        >
          <div>
            {/* 品牌 Logo 与当前表面角标 */}
            <div className="flex items-center justify-between">
              <Logo
                size="md"
                variant="framed"
                ariaLabel="Agent Project Manager"
              />
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-11 font-medium text-muted-foreground">
                <span
                  className={cn(
                    'size-1.5 rounded-full transition-colors',
                    isAi ? 'bg-accent-blue' : 'bg-accent-green',
                  )}
                />
                {surfaceMetadata.tag}
              </span>
            </div>

            {/* 标题与欢迎诗意文案 (去除多余的 emoji 和图标，纯粹自然) */}
            <div className="mt-5 space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                欢迎你，我的朋友
              </h1>

              <div className="space-y-0.5 text-xs text-muted-foreground leading-relaxed">
                {surfaceMetadata.quote.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>

            {/* 表单插槽（登录或注册） */}
            <div className="mt-6">{children}</div>
          </div>

          {/* 底部功能动作组（采用系统内置标准 Button 组件：接入端点 + 语言切换 + 无法登录反馈） */}
          <div className="mt-6 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* 接入域名 / 服务配置：采用系统内置标准 Button */}
                <Button
                  type="button"
                  role="link"
                  variant="outline"
                  size="sm"
                  onClick={() => setServerDialogOpen(true)}
                  className="h-8 gap-1.5 px-3 text-xs font-normal shadow-xs hover:bg-muted/80"
                >
                  <Globe className="size-3.5 text-muted-foreground" />
                  接入端点
                </Button>

                {/* 语言切换：采用系统内置标准 Button */}
                <Button
                  type="button"
                  role="combobox"
                  aria-expanded="false"
                  aria-label="切换语言"
                  variant="outline"
                  size="sm"
                  onClick={handleLanguageToggle}
                  className="h-8 gap-1.5 px-2.5 text-xs font-normal shadow-xs hover:bg-muted/80"
                >
                  <Languages className="size-3.5 text-muted-foreground" />
                  <span>{currentLang === 'zh' ? '简体中文' : 'English'}</span>
                  <ChevronDown className="size-3 text-muted-foreground opacity-60" />
                </Button>
              </div>

              {/* 无法登录 / 帮助反馈：采用系统内置 Button */}
              <Button
                type="button"
                role="link"
                variant="ghost"
                size="sm"
                onClick={() => setHelpDialogOpen(true)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                无法登录？
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧：基于系统内置 decision-card-scene 翻转规范的 3D 双面卡片 (一面人类，一面 AI；无遮挡翻转) */}
        <div
          className="decision-card-scene relative hidden md:block md:col-span-6 lg:col-span-7 border-l border-border/60 overflow-hidden cursor-pointer"
          onClick={toggleSurface}
          title={isAi ? '点击翻转至「人类控制面」' : '点击翻转至「AI 执行面」'}
        >
          {/* 系统内置 3D 翻转主体 (decision-card-flipper) */}
          <div className={cn('decision-card-flipper', isAi && 'is-flipped')}>
            {/* 正面 A：人类控制面 (Human Control Surface —— 建筑蓝图透视) */}
            <div className="decision-card-face decision-card-face-front">
              <BlueprintCanvas isDark={isDark} />
            </div>

            {/* 背面 B：AI 执行面 (AI Execution Surface —— 纯粹光影棱镜) */}
            <div className="decision-card-face decision-card-face-back">
              <PrismCanvas isDark={isDark} />
            </div>
          </div>
        </div>
      </div>

      {/* 服务端点配置弹窗 */}
      <ServerConfigDialog
        open={serverDialogOpen}
        onOpenChange={setServerDialogOpen}
      />

      {/* 无法登录 / 常见问题排查轻量弹窗 */}
      {helpDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <HelpCircle className="size-4" />
              <span>登录与服务排查指引</span>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                • <strong>本地运行</strong>：请确保后端已执行{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-foreground font-mono">
                  pnpm dev:server
                </code>
                ，端口处于 3000。
              </p>
              <p>
                • <strong>初始账号</strong>：默认内置开发者账号为{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-foreground font-mono">
                  admin
                </code>
                ，首次安装请跑数据库迁移。
              </p>
              <p>
                • <strong>私有服务</strong>
                ：若连接远端工作区，请点击左下方“接入端点”配置完整的 API 地址。
              </p>
            </div>

            <Button
              className="w-full text-xs"
              size="sm"
              onClick={() => setHelpDialogOpen(false)}
            >
              我知道了
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

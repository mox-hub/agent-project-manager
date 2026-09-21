import { Bot, CircleDot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

/**
 * 认证面右栏默认视觉：产品元素拼贴（工单卡/决策卡/AI 同事卡浮于
 * 点阵纹理之上，品牌 logo 低透明度水印）。装饰性插画（宪法 §9.1
 * 语义下的品牌插画而非数据渲染，文案经 i18n 管理），整体 aria-hidden。
 * 色彩纪律：面板底色走背景分层（bg-secondary），语义色仅出现在
 * 卡片分类 chip 与状态点上（§5.3）；后续可整体替换为插画资产。
 */
export function AuthVisual({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div aria-hidden="true" className={cn('absolute inset-0 motion-enter', className)}>
      {/* 点阵纹理：currentColor 走 border token，深浅模式自动跟随 */}
      <svg className="absolute inset-0 h-full w-full text-border" role="presentation">
        <defs>
          <pattern id="apm-auth-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#apm-auth-dots)" className="opacity-40" />
      </svg>

      {/* 品牌水印 */}
      <div className="absolute -bottom-8 -right-4 opacity-5">
        <Logo size="xl" variant="plain" />
      </div>

      {/* 拼贴舞台：居中定宽，卡片错落微旋 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-105 w-105">
          {/* 工单卡 */}
          <div className="absolute left-0 top-10 w-62 -rotate-2 rounded-lg border border-border bg-card p-4 shadow-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-blue/10 px-2 py-0.5 text-xs font-medium text-accent-blue">
              <CircleDot className="size-3.5" />
              {t('auth.visualIssueStatus')}
            </span>
            <div className="mt-2.5 text-sm font-medium text-foreground">
              {t('auth.visualIssueTitle')}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot className="size-3.5" />
              {t('auth.visualIssueMeta')}
            </div>
          </div>

          {/* 决策卡 */}
          <div className="absolute right-0 top-0 w-58 rotate-1 rounded-lg border border-border bg-card p-4 shadow-md">
            <span className="inline-flex items-center rounded-full bg-accent-purple/10 px-2 py-0.5 text-xs font-medium text-accent-purple">
              {t('auth.visualDecisionTag')}
            </span>
            <div className="mt-2.5 text-sm font-medium text-foreground">
              {t('auth.visualDecisionTitle')}
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                {t('auth.visualApprove')}
              </span>
              <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                {t('auth.visualReject')}
              </span>
            </div>
          </div>

          {/* AI 同事卡 */}
          <div className="absolute bottom-8 left-14 w-64 rotate-1 rounded-lg border border-border bg-card p-4 shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-green/10 text-accent-green">
                <Bot className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {t('auth.visualColleagueName')}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-accent-green" />
                  {t('auth.visualColleagueStatus')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

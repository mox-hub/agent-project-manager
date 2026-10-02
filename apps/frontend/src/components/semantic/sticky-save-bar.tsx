/**
 * StickySaveBar - 设置页脏状态保存栏（2026-10-01 设置页语义组件批二）
 *
 * 表单变脏（dirty=true）时浮出于滚动容器底部的保存条：说明文本 + 放弃/保存双钮。
 * 收编谱系：设置域三种保存落点并存（页头 Save 钮 git/terminal、控件旁 ai 默认模型、
 * 卡底钮 issue-type-detail）的统一形态，对齐 GitHub/Vercel 设置页惯例。
 * sticky bottom 行为（纯 CSS，无滚动监听）：置于页面内容流末尾——内容不足一屏时
 * 停在内容尾部，超一屏滚动时吸附视口底（与 SettingsHeader 吸顶卡同为毛玻璃语言：
 * border + bg-background/85 + backdrop-blur-xs + shadow-xs，出现走 .motion-enter）。
 * dirty=false 时返回 null（不占位）。
 * props 面封闭（G8）：不接 className、不透传样式。
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export interface StickySaveBarProps {
  /** 是否有未保存更改（false 渲染 null） */
  dirty: boolean;
  onSave: () => void;
  /** 放弃/重置回调；不传隐藏放弃钮 */
  onDiscard?: () => void;
  /** 保存请求进行中（双钮禁用） */
  saving?: boolean;
  /** 说明文本（缺省「有未保存更改」） */
  hint?: ReactNode;
}

export function StickySaveBar({ dirty, onSave, onDiscard, saving = false, hint }: StickySaveBarProps) {
  const { t } = useTranslation();
  if (!dirty) return null;
  return (
    <div
      data-slot="sticky-save-bar"
      className="sticky bottom-4 z-dropdown mt-2 flex justify-center px-4"
    >
      <div className="motion-enter flex items-center gap-3 rounded-lg border border-border bg-background/85 py-2 pl-4 pr-2 shadow-xs backdrop-blur-xs">
        <span className="text-xs text-content-text-secondary">
          {hint ?? t('settings.unsavedChanges')}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {onDiscard ? (
            <Button type="button" variant="ghost" size="xs" disabled={saving} onClick={onDiscard}>
              {t('settings.discardChanges')}
            </Button>
          ) : null}
          <Button type="button" size="xs" disabled={saving} onClick={onSave}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

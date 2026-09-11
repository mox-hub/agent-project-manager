/**
 * AI 助理浮窗入口 —— 右下角圆形按钮（与左下角 FloatingActions 呼应）。
 * 点击开合浮窗；面板常挂载（关闭仅隐藏，流式回复与会话状态不丢）；
 * 放大态 ≈ 屏幕 1/4（50vw × 50vh），默认 380×560 固定右下。
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/infrastructure/store/app-store';
import { AssistantPanel } from './assistant-panel';

export function AssistantFab() {
  const { t } = useTranslation();
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const assistantExpanded = useAppStore((s) => s.assistantExpanded);

  return (
    <div
      role="dialog"
      aria-label={t('assistant.personaName')}
      className={cn(
        'fixed bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-200',
        assistantExpanded
          ? 'h-[85vh] w-[min(96vw,1000px)]'
          : 'h-[560px] w-auto max-w-[calc(100vw-2rem)]',
        !aiPanelOpen && 'pointer-events-none hidden',
      )}
      data-ai-component="assistant.fab-window"
    >
      <AssistantPanel />
    </div>
  );
}

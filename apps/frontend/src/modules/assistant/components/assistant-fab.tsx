/**
 * AI 助理浮窗入口 —— 右下角圆形按钮（与左下角 FloatingActions 呼应）。
 * 点击开合浮窗；面板常挂载（关闭仅隐藏，流式回复与会话状态不丢）；
 * 放大态 ≈ 屏幕 1/4（50vw × 50vh），默认 380×560 固定右下。
 */
import { useTranslation } from 'react-i18next';
import { Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/infrastructure/store/app-store';
import { AssistantPanel } from './assistant-panel';

export function AssistantFab() {
  const { t } = useTranslation();
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);
  const assistantExpanded = useAppStore((s) => s.assistantExpanded);

  return (
    <>
      {/* 浮窗：常挂载，关闭仅隐藏（流式不中断）；放大约占屏幕 1/4 */}
      <div
        role="dialog"
        aria-label={t('assistant.personaName')}
        className={cn(
          'fixed right-4 bottom-20 z-50',
          assistantExpanded
            ? 'h-[min(50vh,calc(100vh-6rem))] w-[min(50vw,42rem)]'
            : 'h-[560px] w-[380px] max-w-[calc(100vw-2rem)]',
          !aiPanelOpen && 'hidden',
        )}
        data-ai-component="assistant.fab-window"
      >
        <AssistantPanel />
      </div>

      {/* 圆形触发按钮 */}
      <button
        type="button"
        onClick={() => setAiPanelOpen(!aiPanelOpen)}
        aria-label={t(aiPanelOpen ? 'assistant.fab.close' : 'assistant.fab.open')}
        data-ai-action="assistant.fab.toggle"
        className={cn(
          'fixed right-4 bottom-4 z-50 flex size-12 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-lg transition-transform',
          'hover:scale-105 active:scale-95',
        )}
      >
        {aiPanelOpen ? (
          <X className="size-5" />
        ) : (
          <Bot className="size-5.5" />
        )}
      </button>
    </>
  );
}

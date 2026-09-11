/**
 * AI 助理浮窗入口 —— 右下角圆形按钮（与左下角 FloatingActions 呼应）。
 * 点击开合浮窗；面板常挂载（关闭仅隐藏，流式回复与会话状态不丢）；
 * 放大态 ≈ 屏幕 1/4（50vw × 50vh），默认 380×560 固定右下。
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/infrastructure/store/app-store';
import { hasOpenInnerLayer, isWithinAiCollabSurface } from '@/shared/lib/floating-layers';
import { AssistantPanel } from './assistant-panel';

export function AssistantFab() {
  const { t } = useTranslation();
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const assistantExpanded = useAppStore((s) => s.assistantExpanded);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);

  // 退出判定区域 = 「AI 协同交互面」之外的区域。
  // 面内（对话浮窗自身、其按钮、决策侧栏、底部 Dock、Portal 弹出的内层浮层）
  // 一律不触发关闭——修复「点面板内部或点决策侧栏收起按钮却把主窗口一起关掉」。
  useEffect(() => {
    if (!aiPanelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!isWithinAiCollabSurface(e.target)) {
        setAiPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aiPanelOpen, setAiPanelOpen]);

  // ESC 关闭：内层浮层（模型选择器 / 历史菜单 / 嵌套弹窗 / 就地问答卡）已打开时，
  // 让它们先消费 ESC，不连带关闭本面板。
  useEffect(() => {
    if (!aiPanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (hasOpenInnerLayer()) return;
      setAiPanelOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [aiPanelOpen, setAiPanelOpen]);

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

import { LayoutGrid } from 'lucide-react';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { cn } from '@/lib/utils';

/**
 * QuickCardsToggle - 幽灵按钮：显示/隐藏页面「快捷看板卡片」栏目。
 * 放置在页面 header 最右侧按钮组的最左侧；激活（卡片显示）时呈明显高亮态。
 */
export function QuickCardsToggle({
  visible,
  onToggle,
  label = 'Show cards',
  activeLabel = 'Hide cards',
  aiId,
  className,
}: {
  /** 卡片栏目当前是否显示 */
  visible: boolean;
  onToggle: () => void;
  label?: string;
  activeLabel?: string;
  aiId?: string;
  className?: string;
}) {
  return (
    <HeaderActionButton
      icon={LayoutGrid}
      label={visible ? activeLabel : label}
      variant="ghost"
      onClick={onToggle}
      aria-pressed={visible}
      data-pressed={visible ? 'true' : undefined}
      className={cn(
        // 激活态明显区别：主色底 + 描边 + 主色图标
        visible && 'bg-primary/10 text-primary ring-1 ring-primary/25',
        className,
      )}
      data-ai-component={aiId}
      data-ai-action={aiId ? `${aiId}.click` : undefined}
      data-ai-role="toggle"
    />
  );
}

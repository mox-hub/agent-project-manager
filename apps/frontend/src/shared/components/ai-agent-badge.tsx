import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AiAgentBadgeProps {
  agentName?: string | null;
  size?: 'sm' | 'md';
}

export function AiAgentBadge({ agentName, size = 'sm' }: AiAgentBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-accent-purple-light/50 font-medium text-accent-purple',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm',
      )}
    >
      <Sparkles className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {agentName ? `AI: ${agentName}` : 'AI'}
    </span>
  );
}

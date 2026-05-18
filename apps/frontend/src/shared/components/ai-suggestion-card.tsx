import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AiSuggestionCardProps {
  suggestion: unknown;
  onApply?: () => void;
  onDismiss?: () => void;
}

export function AiSuggestionCard({ suggestion, onApply, onDismiss }: AiSuggestionCardProps) {
  const text = typeof suggestion === 'string'
    ? suggestion
    : suggestion != null && typeof suggestion === 'object' && 'text' in suggestion
      ? String((suggestion as { text: string }).text)
      : JSON.stringify(suggestion, null, 2);

  return (
    <div className="rounded-lg border-l-4 border-l-accent-purple bg-accent-purple-light/20 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-accent-purple">
        <Sparkles className="h-3 w-3" />
        Suggested by AI
      </div>
      <p className="mb-3 text-sm text-foreground whitespace-pre-wrap">{text}</p>
      {(onApply || onDismiss) && (
        <div className="flex gap-2">
          {onApply && (
            <Button size="xs" onClick={onApply}>Apply</Button>
          )}
          {onDismiss && (
            <Button size="xs" variant="ghost" onClick={onDismiss}>Dismiss</Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 快捷问法 chips —— 打字永远是可选项；点选即发送。
 * 静默 AI 场景 quick-prompts 可用时展示个性化问法（Sparkles 标识），
 * 失败/空回落静态兜底三条。
 */
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AssistantQuickPrompts({
  onSend,
  disabled,
  aiPrompts,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
  /** 静默 AI 生成的个性化问法（空/undefined 时回落静态） */
  aiPrompts?: string[];
}) {
  const { t } = useTranslation();
  const staticPrompts = [
    t('assistant.chat.quickPrompt1'),
    t('assistant.chat.quickPrompt2'),
    t('assistant.chat.quickPrompt3'),
  ];
  const prompts = aiPrompts && aiPrompts.length > 0 ? aiPrompts : staticPrompts;
  const fromAi = aiPrompts && aiPrompts.length > 0;

  return (
    <div className="flex flex-wrap gap-1.5" data-ai-component="assistant.quick-prompts" data-source={fromAi ? 'ai' : 'static'}>
      {fromAi ? (
        <span className="flex items-center text-11 text-accent-purple" aria-hidden="true">
          <Sparkles className="size-3" />
        </span>
      ) : null}
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onSend(prompt)}
          className="h-6 rounded-full px-2.5 text-11 font-normal text-content-text-secondary"
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}

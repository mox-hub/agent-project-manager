/**
 * 快捷问法 chips —— 打字永远是可选项；点选即发送。
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function AssistantQuickPrompts({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const prompts = [
    t('assistant.chat.quickPrompt1'),
    t('assistant.chat.quickPrompt2'),
    t('assistant.chat.quickPrompt3'),
  ];

  return (
    <div className="flex flex-wrap gap-1.5" data-ai-component="assistant.quick-prompts">
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

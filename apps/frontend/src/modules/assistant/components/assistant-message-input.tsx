/**
 * 消息输入框 —— 视觉弱化的一小条：Enter 发送，输入永远是可选项。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AssistantMessageInput({
  onSend,
  disabled,
  personaName,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
  personaName: string;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue('');
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-ai-component="assistant.message-input"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t('assistant.chat.inputPlaceholder', { name: personaName })}
        disabled={disabled}
        className="h-8 text-xs"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={disabled || !value.trim()}
        aria-label={t('assistant.chat.send')}
      >
        <ArrowUp className="size-4" />
      </Button>
    </form>
  );
}

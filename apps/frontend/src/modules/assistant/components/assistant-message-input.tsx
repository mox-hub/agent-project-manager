/**
 * 消息输入框 —— 视觉弱化的一小条：Enter 发送，输入永远是可选项。
 * 可选执行桥动作（转执行）：把当前草稿派发给 CLI 守护进程异步跑。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface AssistantDispatchAction {
  label: string;
  disabled?: boolean;
  onDispatch: (content: string) => void;
}

/** 跨组件预填草稿（统一创建面板「AI 创建」等），nonce 防重复消费 */
export interface AssistantDraftSeed {
  text: string;
  nonce: number;
}

export function AssistantMessageInput({
  onSend,
  disabled,
  personaName,
  dispatchAction,
  seedDraft,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
  personaName: string;
  /** 项目作用域下提供：转执行动作（读当前草稿） */
  dispatchAction?: AssistantDispatchAction;
  seedDraft?: AssistantDraftSeed | null;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  // 渲染期比对 nonce：外部预填请求到达时写入草稿
  const [consumedSeedNonce, setConsumedSeedNonce] = useState(0);
  if (seedDraft && seedDraft.nonce !== consumedSeedNonce) {
    setConsumedSeedNonce(seedDraft.nonce);
    setValue(seedDraft.text);
  }

  const content = value.trim();

  const submit = () => {
    if (!content || disabled) return;
    onSend(content);
    setValue('');
  };

  const dispatch = () => {
    if (!content || dispatchAction?.disabled) return;
    dispatchAction.onDispatch(content);
    setValue('');
  };

  return (
    <div className="flex items-center gap-2" data-ai-component="assistant.message-input">
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
      {dispatchAction ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || dispatchAction.disabled || !content}
          aria-label={dispatchAction.label}
          title={dispatchAction.label}
          onClick={dispatch}
          data-ai-action="assistant.message-input.dispatch.click"
        >
          <Rocket className="size-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || !content}
        aria-label={t('assistant.chat.send')}
        onClick={submit}
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
}

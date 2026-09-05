/**
 * 模型选择器 —— 面板头部下拉：在线 CLI 守护进程通道（cli / cli:<provider>）
 * + 已启用 LLM provider（llm:<provider>）。工作区全局作用域下 CLI 项禁用
 * （执行通道需要项目上下文）。选择随发送 body 回写会话记忆。
 */
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Cpu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useAssistantModels,
} from '../hooks/use-assistant-chat';
import type { AssistantModelOption } from '../api/assistant-api';

function ModelItemLabel({ option }: { option: AssistantModelOption }) {
  if (option.type === 'llm') {
    return (
      <span className="truncate">
        {option.label}
        {option.model ? (
          <span className="ml-1 text-11 text-content-text-muted">{option.model}</span>
        ) : null}
      </span>
    );
  }
  return <span className="truncate">{option.label}</span>;
}

export function AssistantModelPicker({
  projectId,
  value,
  onChange,
}: {
  projectId: string | undefined;
  /** 当前选择（null = 跟随默认：CLI 在线优先，否则 LLM 默认） */
  value: string | null;
  onChange: (modelId: string | null) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useAssistantModels(projectId);
  const models = data?.models ?? [];
  const cliOptions = models.filter((m) => m.type === 'runtime');
  const cliProviderOptions = models.filter((m) => m.type === 'runtime-provider');
  const llmOptions = models.filter((m) => m.type === 'llm');
  const hasCli = cliOptions.length > 0;
  const selected = models.find((m) => m.id === value) ?? null;

  const currentLabel = isLoading
    ? t('assistant.model.loading')
    : selected
      ? selected.label
      : hasCli
        ? cliOptions[0].label
        : llmOptions[0]?.label ?? t('assistant.model.empty');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className="inline-flex h-7 max-w-30 shrink-0 items-center gap-1 rounded-md px-2 text-11 text-content-text-muted transition-colors hover:bg-accent hover:text-content-text"
        data-ai-action="assistant.model.open"
      >
        <Cpu className="size-3 shrink-0" />
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className="size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* base-ui 的 GroupLabel 必须位于 Group 上下文内，Label+items 整体成组 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('assistant.model.label')}</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!hasCli || !projectId}
            onSelect={() => onChange('cli')}
            className="gap-2"
          >
            <ModelItemLabel
              option={
                cliOptions[0] ?? {
                  id: 'cli',
                  type: 'runtime',
                  label: t('assistant.model.cli'),
                  online: true,
                }
              }
            />
            {!projectId ? (
              <span className="ml-auto text-11 text-content-text-muted">
                {t('assistant.model.cliNeedsProject')}
              </span>
            ) : value === 'cli' ? (
              <Check className="ml-auto size-3.5" />
            ) : null}
          </DropdownMenuItem>
          {cliProviderOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              disabled={!projectId}
              onSelect={() => onChange(option.id)}
              className="gap-2"
            >
              <ModelItemLabel option={option} />
              {value === option.id ? (
                <Check className="ml-auto size-3.5" />
              ) : null}
            </DropdownMenuItem>
          ))}
          {llmOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onSelect={() => onChange(option.id)}
              className="gap-2"
            >
              <ModelItemLabel option={option} />
              {value === option.id ? (
                <Check className="ml-auto size-3.5" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

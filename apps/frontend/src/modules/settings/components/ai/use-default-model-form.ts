/**
 * 内置模型选择表单（概览快捷设置卡与模型服务「当前 AI 模型」卡共用）。
 * @description 服务端值（GET /ai/default-model）为展示基准；draft 仅承载用户未保存的
 * 修改，保存成功后清空回落服务端值，避免 effect 反向同步 setState。
 */
import { useMemo, useState } from 'react';
import {
  useDefaultModel,
  useSetDefaultModel,
} from '@/modules/ai-hub/hooks/use-ai-providers';
import type { AIProviderConfig } from '@/modules/ai-hub/api/ai-hub-api';
import { PROVIDER_MODELS } from './provider-visuals';

export interface DefaultModelSelection {
  provider: string;
  model: string;
}

export function useDefaultModelForm(providers: AIProviderConfig[]) {
  const { data: defaultModel, isLoading } = useDefaultModel();
  const setDefaultModelMutation = useSetDefaultModel();
  const [draft, setDraft] = useState<DefaultModelSelection | null>(null);

  const saved = useMemo<DefaultModelSelection | null>(() => {
    if (defaultModel?.provider && defaultModel.model) {
      return { provider: defaultModel.provider, model: defaultModel.model };
    }
    return null;
  }, [defaultModel]);

  /** 展示值：未保存修改时跟随服务端 */
  const effective = draft ?? saved;

  const providerOptions = useMemo(
    () => providers.filter((p) => p.enabled),
    [providers],
  );

  /** 模型选项：后端 availableModels 优先，空则内置清单兜底 */
  const modelOptionsFor = (providerKey: string): string[] => {
    const p = providers.find((x) => x.provider === providerKey);
    if (p?.availableModels && p.availableModels.length > 0) {
      return p.availableModels;
    }
    return PROVIDER_MODELS[providerKey] ?? [];
  };

  const isDirty =
    !!effective &&
    (!saved || saved.provider !== effective.provider || saved.model !== effective.model);

  return {
    saved,
    effective,
    setDraft,
    clearDraft: () => setDraft(null),
    providerOptions,
    modelOptionsFor,
    isDirty,
    isLoading,
    setDefaultModelMutation,
  };
}

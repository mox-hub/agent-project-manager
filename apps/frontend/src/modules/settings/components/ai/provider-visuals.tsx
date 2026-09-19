/**
 * AI 管理页共享品牌视觉 —— 模型服务厂家图标与内置模型清单的唯一实现。
 * @description 宪法 §6.1：@lobehub/icons 仅限 AI 供应商/品牌 logo；
 * CLI 工具品牌图标复用 @/shared/ai-providers/provider-meta 唯一源（getProviderMeta）。
 * 模型服务 / CLI 工具 / 概览各 Tab 共用。
 */
import { Bot } from 'lucide-react';
import { OpenAI, Claude, Gemini, DeepSeek, Zhipu } from '@lobehub/icons';
import { getProviderMeta } from '@/shared/ai-providers/provider-meta';
import type { CliProviderId } from '@/modules/mcp-server';

export type LobeIcon = React.ComponentType<{ size?: number; className?: string }>;

/** 模型服务厂家（provider key → 品牌图标，Color 品牌色变体优先） */
export const PROVIDER_ICONS: Record<string, { Icon: LobeIcon; Color?: LobeIcon }> = {
  openai: { Icon: OpenAI },
  anthropic: { Icon: Claude, Color: Claude.Color },
  gemini: { Icon: Gemini, Color: Gemini.Color },
  deepseek: { Icon: DeepSeek, Color: DeepSeek.Color },
  glm: { Icon: Zhipu, Color: Zhipu.Color },
};

/** 厂家展示名（品牌/产品名词保留原文） */
export const PROVIDER_INFO: Record<string, { name: string }> = {
  openai: { name: 'OpenAI' },
  anthropic: { name: 'Anthropic' },
  gemini: { name: 'Google Gemini' },
  deepseek: { name: 'Deepseek' },
  glm: { name: 'GLM (Zhipu)' },
};

/** 各厂家默认 Base URL（未配置时的展示与重置目标） */
export const PROVIDER_DEFAULT_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com/v1',
  glm: 'https://open.bigmodel.cn/api/paas/v4',
};

/** 内置模型清单（后端 availableModels 为空时的兜底展示） */
export const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-exp'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  glm: ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-3-turbo'],
};

/** 模型服务厂家品牌图标（Color 品牌色优先，无映射回退 Bot） */
export function ProviderBrandIcon({
  provider,
  size = 40,
  className,
}: {
  provider: string;
  size?: number;
  className?: string;
}) {
  const iconConfig = PROVIDER_ICONS[provider];
  if (iconConfig) {
    const Icon = iconConfig.Color ?? iconConfig.Icon;
    return <Icon size={size} className={className} />;
  }
  return <Bot size={size} className={className} />;
}

/** 厂家在线状态点：连接=绿 / 不在线=红 / 未配置（无 API key）=灰 */
export function ProviderStatusDot({
  status,
  hasApiKey,
  className,
}: {
  status?: string | null;
  hasApiKey?: boolean;
  className?: string;
}) {
  const connected = status === 'connected' || status === 'active';
  const offline = status === 'error' || (connected ? false : !!hasApiKey);
  return (
    <span
      aria-hidden
      className={
        'inline-block h-2 w-2 shrink-0 rounded-full ' +
        (connected
          ? 'bg-accent-green'
          : offline
            ? 'bg-accent-red'
            : 'bg-muted-foreground/40') +
        (className ? ` ${className}` : '')
      }
    />
  );
}

/** CLI 工具品牌图标（provider-meta 唯一源驱动；Color 品牌色优先，未知名回退 Bot） */
export function CliBrandIcon({
  providerId,
  size = 16,
  className,
}: {
  providerId: CliProviderId;
  size?: number;
  className?: string;
}) {
  const meta = getProviderMeta(providerId);
  const Icon = meta.Color ?? meta.Icon;
  return <Icon size={size} className={className} />;
}

/** 厂家展示名查找（无映射时回退原始 key） */
export function providerDisplayName(providerKey: string | undefined): string | undefined {
  return providerKey ? PROVIDER_INFO[providerKey]?.name ?? providerKey : undefined;
}

/**
 * CLI Provider 展示元数据唯一源：providerId → 显示名 + 品牌 logo。
 * logo 用 @lobehub/icons（宪法 §6.1：仅限 AI 品牌）；未知 id 回落 lucide Bot + 原样 id。
 */
import type { ComponentType } from 'react';
import { Bot } from 'lucide-react';
import {
  ClaudeCode,
  CodeBuddy,
  Codex,
  Cursor,
  Gemini,
  Grok,
  OpenCode,
  Qwen,
  Zhipu,
} from '@lobehub/icons';

export interface ProviderMeta {
  label: string;
  Icon: ComponentType<{ size?: number | string; className?: string }>;
  Color?: ComponentType<{ size?: number | string; className?: string }>;
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  'claude-code': { label: 'Claude Code', Icon: ClaudeCode, Color: ClaudeCode.Color },
  codex: { label: 'Codex', Icon: Codex },
  'cursor-agent': { label: 'Cursor', Icon: Cursor },
  cursor: { label: 'Cursor', Icon: Cursor },
  gemini: { label: 'Gemini', Icon: Gemini, Color: Gemini.Color },
  'gemini-cli': { label: 'Gemini CLI', Icon: Gemini, Color: Gemini.Color },
  opencode: { label: 'OpenCode', Icon: OpenCode },
  // zcode 无独立品牌标：回落智谱 GLM 家族标（宪法 §6.1 品牌家族可用厂家 logo）
  zcode: { label: 'ZCode', Icon: Zhipu, Color: Zhipu.Color },
  // 2026-10-11 扩容批一（cursor-agent/gemini-cli 已有预留条目）
  'qwen-code': { label: 'Qwen Code', Icon: Qwen, Color: Qwen.Color },
  codebuddy: { label: 'CodeBuddy', Icon: CodeBuddy, Color: CodeBuddy.Color },
  // Grok 图标无 Color 子组件（@lobehub/icons CompoundedIcon 仅 Avatar/Combine/Text）
  grok: { label: 'Grok', Icon: Grok },
};

export function getProviderMeta(providerId: string): ProviderMeta {
  return PROVIDER_META[providerId] ?? { label: providerId, Icon: Bot };
}

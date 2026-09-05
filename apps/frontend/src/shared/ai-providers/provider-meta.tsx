/**
 * CLI Provider 展示元数据唯一源：providerId → 显示名 + 品牌 logo。
 * logo 用 @lobehub/icons（宪法 §6.1：仅限 AI 品牌）；未知 id 回落 lucide Bot + 原样 id。
 */
import type { ComponentType } from 'react';
import { Bot } from 'lucide-react';
import { ClaudeCode, Codex, Cursor, Gemini, OpenCode } from '@lobehub/icons';

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
  zcode: { label: 'ZCode', Icon: Bot },
};

export function getProviderMeta(providerId: string): ProviderMeta {
  return PROVIDER_META[providerId] ?? { label: providerId, Icon: Bot };
}

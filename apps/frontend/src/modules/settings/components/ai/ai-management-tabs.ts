/**
 * AI 管理页页签定义（section 编排与概览跳转共用）
 */
import { Activity, Bot, Cpu, Server, Zap, type LucideIcon } from 'lucide-react';

export type AiManagementTab = 'overview' | 'models' | 'tools' | 'mcp' | 'skills';

/** label 存 i18n key；overview 为默认页签（页面主轴：四源健康一览 + 快捷设置，2026-09-19 用户裁决置首） */
export const AI_MANAGEMENT_TABS: { id: AiManagementTab; labelKey: string; icon: LucideIcon }[] = [
  { id: 'overview', labelKey: 'aiHub.overview', icon: Activity },
  { id: 'models', labelKey: 'aiHub.tabModels', icon: Cpu },
  { id: 'tools', labelKey: 'aiHub.cliTools', icon: Bot },
  { id: 'mcp', labelKey: 'aiHub.mcpServers', icon: Server },
  { id: 'skills', labelKey: 'aiHub.skills', icon: Zap },
];

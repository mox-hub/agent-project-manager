/**
 * Dock 协同 AI 同事清单 —— 底部 Dock 与「设置 · Dock 栏」共用同一份数据源，
 * 避免两处各写一套「真实成员优先 + 缺省优雅兜底」的生成逻辑。
 *
 * 数据来源：当前项目的 AI 团队摘要（office）优先，缺省时回落三个内置角色
 * （主协同助手 + 执行守护专员 + 验收审计员），保证零数据工作区 Dock 不空。
 */
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Terminal, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useOfficeSummary } from '@/modules/office/hooks/use-office-summary';
import { useAssistantStatus } from '@/modules/assistant/hooks/use-assistant-status';

export interface DockAiColleague {
  id: string;
  name: string;
  title?: string;
  avatarUrl?: string | null;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  status: 'needYou' | 'working' | 'suggestions' | 'idle';
  placeholder: string;
}

/** AI 同事状态呼吸点样式（Dock 头像与展开输入栏共用） */
export const STATUS_DOT_CLASS: Record<string, string> = {
  needYou: 'bg-accent-red animate-pulse ring-2 ring-popover',
  working: 'bg-accent-blue animate-pulse ring-2 ring-popover',
  suggestions: 'bg-accent-yellow ring-2 ring-popover',
  idle: 'bg-accent-green ring-2 ring-popover',
};

/** 兜底角色配色轮转（真实成员无专属色时按序取模） */
const COLOR_SCHEMES = [
  { color: 'text-accent-purple', bgColor: 'bg-accent-purple-light', icon: Bot },
  { color: 'text-accent-blue', bgColor: 'bg-accent-blue-light', icon: Terminal },
  { color: 'text-accent-green', bgColor: 'bg-accent-green-light', icon: ShieldCheck },
];

export function useDockAiColleagues() {
  const { t } = useTranslation();
  const location = useLocation();
  const storeProjectId = useAppStore((s) => s.currentProjectId);

  // 当前激活的项目 ID（优先从路由路径提取，其次取 store 中的 currentProjectId）
  const routeProjectId = (() => {
    const match = location.pathname.match(/\/app\/projects\/([^/]+)/);
    return match ? match[1] : null;
  })();
  const activeProjectId = routeProjectId || storeProjectId || undefined;

  const { data: officeSummary } = useOfficeSummary(activeProjectId);
  const assistantStatus = useAssistantStatus(activeProjectId);

  const colleagues = useMemo<DockAiColleague[]>(() => {
    const mainColleagueName = t('assistant.personaName') || '主协同助手';
    const mainAssistant: DockAiColleague = {
      id: 'assistant',
      name: mainColleagueName,
      title: t('assistant.personaRole') || '主协同助手',
      avatarUrl: null,
      icon: Bot,
      color: 'text-accent-purple',
      bgColor: 'bg-accent-purple-light',
      status: assistantStatus.state,
      placeholder: `向${mainColleagueName}提问或安排任务...`,
    };

    const realList = officeSummary?.colleagues ?? [];
    if (realList.length === 0) {
      return [
        mainAssistant,
        {
          id: 'executor',
          name: '执行守护专员',
          title: '终端与代码执行',
          avatarUrl: null,
          icon: Terminal,
          color: 'text-accent-blue',
          bgColor: 'bg-accent-blue-light',
          status: 'idle' as const,
          placeholder: '指派终端命令、Git 或代码执行任务...',
        },
        {
          id: 'auditor',
          name: '验收审计员',
          title: '门禁与契约审计',
          avatarUrl: null,
          icon: ShieldCheck,
          color: 'text-accent-green',
          bgColor: 'bg-accent-green-light',
          status: 'idle' as const,
          placeholder: '请求检查验收门禁、契约与审计状态...',
        },
      ];
    }

    const items: DockAiColleague[] = realList.map((c, index) => {
      const scheme = COLOR_SCHEMES[index % COLOR_SCHEMES.length];
      return {
        id: c.memberId,
        name: c.displayName,
        title: c.title || c.executionRole || 'AI 同事',
        avatarUrl: c.avatarUrl ?? null,
        icon: scheme.icon,
        color: scheme.color,
        bgColor: scheme.bgColor,
        status: c.status,
        placeholder: `向 [${c.displayName}] 提问或安排任务...`,
      };
    });

    const hasMain = items.some((item) => item.name === mainColleagueName);
    return hasMain ? items : [mainAssistant, ...items];
  }, [officeSummary?.colleagues, assistantStatus.state, t]);

  return { colleagues, activeProjectId };
}

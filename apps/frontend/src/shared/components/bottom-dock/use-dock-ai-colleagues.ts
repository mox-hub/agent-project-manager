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
import { useAppStore } from '@/infrastructure/store/app-store';
import { useOfficeSummary } from '@/modules/office/hooks/use-office-summary';
import { useAssistantStatus } from '@/modules/assistant/hooks/use-assistant-status';

export interface DockAiColleague {
  id: string;
  name: string;
  title?: string;
  avatarUrl?: string | null;
  /**
   * 头像与配色都**不由本类型承载**：头像统一交给 `MemberAvatar` 渲染——
   * 成员信息里有真实头像就显示真实头像，没有则回落双表面规范里该身份的确定性头像；
   * 其确定性配色也由该组件按 `displayName` 种子生成，故这里不再需要颜色字段。
   */
  status: 'needYou' | 'working' | 'suggestions' | 'idle';
  placeholder: string;
  /**
   * 默认助手（小周）：**固定排在首位且不可关闭**——它是主协同助手，
   * 「常驻 AI 助手」列表里必须始终在场，Dock 头像群也不受隐藏名单影响。
   * 判定口径统一收在这里，避免各处按名字/固定 id 散落判断。
   */
  isMain: boolean;
}

/** AI 同事状态呼吸点样式（Dock 头像与展开输入栏共用） */
export const STATUS_DOT_CLASS: Record<string, string> = {
  needYou: 'bg-accent-red animate-pulse ring-2 ring-popover',
  working: 'bg-accent-blue animate-pulse ring-2 ring-popover',
  suggestions: 'bg-accent-yellow ring-2 ring-popover',
  idle: 'bg-accent-green ring-2 ring-popover',
};

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
      status: assistantStatus.state,
      placeholder: `向${mainColleagueName}提问或安排任务...`,
      isMain: true,
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
          status: 'idle' as const,
          placeholder: '指派终端命令、Git 或代码执行任务...',
          isMain: false,
        },
        {
          id: 'auditor',
          name: '验收审计员',
          title: '门禁与契约审计',
          avatarUrl: null,
          status: 'idle' as const,
          placeholder: '请求检查验收门禁、契约与审计状态...',
          isMain: false,
        },
      ];
    }

    const items: DockAiColleague[] = realList.map((c) => {
      return {
        id: c.memberId,
        name: c.displayName,
        title: c.title || c.executionRole || 'AI 同事',
        // 真实头像：来自成员信息（Member.avatarUrl），无上传头像时回落双表面生成头像
        avatarUrl: c.avatarUrl ?? null,
        status: c.status,
        placeholder: `向 [${c.displayName}] 提问或安排任务...`,
        isMain: c.displayName === mainColleagueName,
      };
    });

    // 默认助手固定首位：Dock 头像群与设置页「常驻 AI 助手」都依赖这个稳定次序
    const mainIndex = items.findIndex((item) => item.isMain);
    if (mainIndex === -1) return [mainAssistant, ...items];
    if (mainIndex === 0) return items;
    return [items[mainIndex], ...items.filter((_, index) => index !== mainIndex)];
  }, [officeSummary?.colleagues, assistantStatus.state, t]);

  return { colleagues, activeProjectId };
}

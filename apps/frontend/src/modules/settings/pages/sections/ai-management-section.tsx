/**
 * AiManagementSection - 设置页「AI 管理」子页（合并页）
 * @description 2026-09-19 页面合并：原独立子页「Agent 管理」（/app/settings/ai/agents）
 * 并入本页，以 ToolbarRow 居中页签切换五个功能模块（模型服务 / 概览 / CLI 工具 /
 * MCP 服务器 / 技能），完整覆盖两页全部真实功能。原页的 mock 配额、信任等级演示卡、
 * 假技能开关、角色展示与只读 CLI 重复区一并废除（宪法 §9.1 禁硬编码假数据）。
 * Tab 内容组件见 modules/settings/components/ai/。
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { SettingsHeader } from '@/components/semantic/settings-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { ToolbarRow } from '@/components/semantic/toolbar-row';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useDetectCliProviders } from '@/modules/mcp-server';
import { AI_MANAGEMENT_TABS, type AiManagementTab } from '../../components/ai/ai-management-tabs';
import { ModelsTab } from '../../components/ai/models-tab';
import { OverviewTab } from '../../components/ai/overview-tab';
import { ToolsTab } from '../../components/ai/tools-tab';
import { McpTab } from '../../components/ai/mcp-tab';
import { SkillsTab } from '../../components/ai/skills-tab';
import { JudgmentTab } from '../../components/ai/judgment-tab';

export function AiManagementSection() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // ?tab= 双向同步：URL 可定位页签（旧 agents 页重定向 / 分享链接），overview 默认态清参
  const fromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<AiManagementTab>(() =>
    AI_MANAGEMENT_TABS.some((def) => def.id === fromUrl)
      ? (fromUrl as AiManagementTab)
      : AI_MANAGEMENT_TABS[0].id,
  );

  const changeTab = (tab: AiManagementTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };

  // toolbar 右侧：重新探测 CLI 并刷新全部数据
  const detectMutation = useDetectCliProviders();
  const handleRefreshAll = () => {
    detectMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
        queryClient.invalidateQueries({ queryKey: ['skills'] });
        toast.success(t('aiHub.detectComplete'));
      },
      onError: (err) =>
        toast.error(t('aiHub.detectFailed', { message: err instanceof Error ? err.message : t('common.unknown') })),
    });
  };

  return (
    <PageShell
      aiPage="ai-hub.ai-management"
      variant="standard"
      contentClassName="gap-4"
      className="bg-background text-foreground"
    >
      {/* 设置页头（语义组件批二·验收调整）：转 A 类外滚，header sticky 吸顶 */}
      <SettingsHeader
          icon={Brain}
          tone="purple"
          title={t('aiHub.title')}
          description={t('aiHub.description')}
          actions={
            <FavoriteToggle
              label={nodeToText(t('aiHub.title')).trim()}
              aiId="ai-hub.ai-management"
            />
          }
        />

      {/* 纯样式切换页：不传 views（视图管理整体隐藏），仅居中页签切换。
          A 类外滚流中转 static（内置 sticky top-10 为旧 40px 页头双层设计） */}
      <ToolbarRow
        className="static px-0 md:px-0"
        aiId="ai-hub.ai-management"
        viewStyle={{
          layout: 'centered',
          value: activeTab,
          onChange: (v) => changeTab(v as AiManagementTab),
          options: AI_MANAGEMENT_TABS.map(({ id, labelKey, icon }) => ({ value: id, label: t(labelKey), icon })),
        }}
        filterMenu={false}
        displayMenu={false}
        downloadMenu={false}
        actions={
          <HeaderActionButton
            variant="outline"
            icon={detectMutation.isPending ? Loader2 : RefreshCw}
            label={t('aiHub.redetect')}
            onClick={handleRefreshAll}
            disabled={detectMutation.isPending}
            data-ai-component="ai-hub.ai-management.redetect-button"
            data-ai-action="ai-hub.ai-management.redetect-button.click"
          />
        }
      />

      {/* 内容区：外层 ScrollArea 统一滚动（验收调整，与 A 类页同构） */}
      <Tabs value={activeTab} onValueChange={(val) => changeTab(val as AiManagementTab)} className="w-full" data-ai-component="ai-hub.ai-management.tab" data-ai-tab={activeTab}>
            <TabsContent value="models">
              <ModelsTab />
            </TabsContent>
            <TabsContent value="overview">
              <OverviewTab onNavigateTab={changeTab} />
            </TabsContent>
            <TabsContent value="tools">
              <ToolsTab />
            </TabsContent>
            <TabsContent value="mcp">
              <McpTab />
            </TabsContent>
            <TabsContent value="skills">
              <SkillsTab />
            </TabsContent>
            <TabsContent value="judgment">
              <JudgmentTab />
            </TabsContent>
      </Tabs>
    </PageShell>
  );
}

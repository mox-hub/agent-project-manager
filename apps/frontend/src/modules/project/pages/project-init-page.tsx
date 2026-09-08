import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  GitBranch,
  History,
  LayoutDashboard,
  ScrollText,
} from 'lucide-react';
import { useProjectDetail } from '../hooks/use-project-detail';
import { WorkspaceConfig } from '@/modules/git/components/workspace-config';
import { useWorkspace } from '@/modules/git/hooks/use-workspace';
import { ContractBindingsPanel } from '@/modules/contract/components/contract-bindings-panel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';

/**
 * 项目初始化页（v2 纪要三期：种生实机入口）。
 * 统一创建面板建项后的第一站：绑定工作区目录 → 种生契约三件套 → 引导下一步。
 * 一次性页面，不进项目 tabbar；之后可从设置页「契约文件」页签继续管理。
 */
export function ProjectInitPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const { data: project, isLoading } = useProjectDetail(projectId || '');
  // 工作区路径变化时重挂载契约面板（重挂载即重取 bindings），
  // 否则「全部种生」会拿着绑定前的 workspaceRoot=null 缓存恒禁用
  const { data: workspace } = useWorkspace(projectId || '');
  const contractPanelKey = workspace?.localPath || 'no-workspace';

  if (isLoading || !projectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('project.detail.loading')}
      </div>
    );
  }

  const nextSteps = [
    {
      to: `/app/projects/${projectId}/playbook`,
      icon: ScrollText,
      title: t('project.init.next.playbook.title'),
      desc: t('project.init.next.playbook.desc'),
    },
    {
      to: `/app/projects/${projectId}/profile?wizard=1`,
      icon: History,
      title: t('project.init.next.profile.title'),
      desc: t('project.init.next.profile.desc'),
    },
    {
      to: `/app/projects/${projectId}`,
      icon: LayoutDashboard,
      title: t('project.init.next.overview.title'),
      desc: t('project.init.next.overview.desc'),
    },
  ];

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectInit}
      projectId={projectId}
      projectName={project?.name}
      title={t('project.detail.init')}
      hideBreadcrumb
      description={t('project.detail.initDesc')}
    >
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">
        <Card
          data-ai-component="project.init.workspace"
          data-ai-role="content"
        >
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              {t('project.init.workspace.title')}
            </CardTitle>
            <CardDescription>{t('project.init.workspace.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <WorkspaceConfig projectId={projectId} />
          </CardContent>
        </Card>

        <Card
          data-ai-component="project.init.contract"
          data-ai-role="content"
        >
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              {t('project.init.contract.title')}
            </CardTitle>
            <CardDescription>{t('project.init.contract.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ContractBindingsPanel
              key={contractPanelKey}
              projectId={projectId}
              hintWorkspace={false}
            />
          </CardContent>
        </Card>

        <Card
          data-ai-component="project.init.next"
          data-ai-role="content"
        >
          <CardHeader className="border-b border-border">
            <CardTitle>{t('project.init.next.title')}</CardTitle>
            <CardDescription>{t('project.init.next.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-4">
            {nextSteps.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.to}
                  to={step.to}
                  className="group flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-accent"
                  data-ai-component="project.init.next.item"
                  data-ai-action={`project.init.next.item.${step.title}.click`}
                  data-ai-role="action"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">
                      {step.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {step.desc}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </ProjectDetailFrame>
  );
}

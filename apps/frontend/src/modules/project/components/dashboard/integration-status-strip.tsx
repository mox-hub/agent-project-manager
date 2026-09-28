import { ArrowUpRight, BookOpen, FileText, GitBranch, Link2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconMetric } from '@/components/ui/icon-metric';

interface IntegrationStatusStripProps {
  repositoryCount: number;
  externalLinksCount: number;
  docLinksCount: number;
  apiDocLinksCount: number;
  memberCount: number;
  onManage: () => void;
}

/**
 * 项目关联状态条：与右侧栏 Related 面板一致的 5 种关联关系
 * （仓库 / 文档 / API 文档 / 外部链接 / 团队成员），IconMetric 指标样式。
 */
export function IntegrationStatusStrip({
  repositoryCount,
  externalLinksCount,
  docLinksCount,
  apiDocLinksCount,
  memberCount,
  onManage,
}: IntegrationStatusStripProps) {
  const { t } = useTranslation();

  const items = [
    {
      key: 'repositories',
      icon: <GitBranch size={16} strokeWidth={1.75} />,
      label: t('project.sidebar.repositories'),
      value: t('project.sidebar.repoCount', { count: repositoryCount }),
    },
    {
      key: 'documents',
      icon: <FileText size={16} strokeWidth={1.75} />,
      label: t('project.sidebar.documents'),
      value: t('project.sidebar.docCount', { count: docLinksCount }),
    },
    {
      key: 'apiDocs',
      icon: <BookOpen size={16} strokeWidth={1.75} />,
      label: t('project.sidebar.apiDocs'),
      value: t('project.sidebar.apiDocCount', { count: apiDocLinksCount }),
    },
    {
      key: 'links',
      icon: <Link2 size={16} strokeWidth={1.75} />,
      label: t('project.sidebar.links'),
      value: t('project.sidebar.linkCount', { count: externalLinksCount }),
    },
    {
      key: 'team',
      icon: <Users size={16} strokeWidth={1.75} />,
      label: t('project.sidebar.team'),
      value: t('project.sidebar.memberCount', { count: memberCount }),
    },
  ];

  return (
    <Card className="border-border">
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => (
            <IconMetric key={item.key} icon={item.icon} label={item.label} value={item.value} />
          ))}
        </div>
        <Button variant="ghost" className="w-full justify-between" onClick={onManage}>
          {t('project.detail.manageIntegrations')}
          <ArrowUpRight size={14} />
        </Button>
      </CardContent>
    </Card>
  );
}

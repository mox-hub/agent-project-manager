/**
 * RoutePreviewCard - 路由预览卡片壳
 *
 * 结构：头部（图标 + 标题 + 类型徽章）+ Separator + 按类型分发的 body。
 * 由 RoutePreviewTrigger 挂在 HoverCardContent 中，仅在 hover 打开时挂载，
 * 因此 body 内的 useQuery 是「缓存优先、miss 静默补拉」。
 */

import { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle,
  CheckSquare,
  FileText,
  FolderKanban,
  GitBranch,
  Star,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PAGE_REGISTRY } from '@/shared/layout/page-registry';
import { useTranslation } from '@/hooks/useTranslation';
import { resolveRoutePreview, type RoutePreviewType } from './route-preview-registry';
import { ProjectPreviewBody } from './previews/project-preview-body';
import { TaskPreviewBody } from './previews/task-preview-body';
import { DocumentPreviewBody } from './previews/document-preview-body';
import { RepositoryPreviewBody } from './previews/repository-preview-body';
import { MemberPreviewBody } from './previews/member-preview-body';
import { TeamPreviewBody } from './previews/team-preview-body';
import { AcceptancePreviewBody } from './previews/acceptance-preview-body';
import { GenericPreviewBody } from './previews/generic-preview-body';

const TYPE_ICONS: Record<RoutePreviewType, LucideIcon> = {
  project: FolderKanban,
  task: CheckSquare,
  bug: AlertCircle,
  document: FileText,
  repository: GitBranch,
  member: User,
  team: Users,
  acceptance: CheckCircle,
  // generic 优先用 PAGE_REGISTRY / 调用方传入的图标
  generic: Star,
};

export interface RoutePreviewCardProps {
  /** 路由 path（解析预览类型与实体 id 的依据） */
  path: string;
  /** 头部标题（tab 标题 / 收藏 label，详情页会回写实体名） */
  fallbackTitle?: string;
  /** 头部图标兜底（generic 且 PAGE_REGISTRY 未命中时使用） */
  fallbackIcon?: LucideIcon;
}

function PreviewBody({ type, id, path }: { type: RoutePreviewType; id?: string; path: string }) {
  switch (type) {
    case 'project':
      return <ProjectPreviewBody id={id!} />;
    case 'task':
      return <TaskPreviewBody id={id!} kind="task" />;
    case 'bug':
      return <TaskPreviewBody id={id!} kind="bug" />;
    case 'document':
      return <DocumentPreviewBody id={id!} />;
    case 'repository':
      return <RepositoryPreviewBody id={id!} />;
    case 'member':
      return <MemberPreviewBody id={id!} />;
    case 'team':
      return <TeamPreviewBody id={id!} />;
    case 'acceptance':
      return <AcceptancePreviewBody id={id!} />;
    default:
      return <GenericPreviewBody path={path} />;
  }
}

export function RoutePreviewCard({ path, fallbackTitle, fallbackIcon }: RoutePreviewCardProps) {
  const { t } = useTranslation();
  const match = useMemo(() => resolveRoutePreview(path), [path]);
  const registered = PAGE_REGISTRY[path];

  const Icon =
    match.type === 'generic'
      ? (registered?.icon ?? fallbackIcon ?? TYPE_ICONS.generic)
      : TYPE_ICONS[match.type];

  const title =
    fallbackTitle ??
    (registered?.labelKey
      ? t(registered.labelKey)
      : registered?.label) ??
    path;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon
            className="size-3.5"
            style={
              match.type === 'generic' && registered?.color
                ? { color: registered.color }
                : undefined
            }
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
        <Badge variant="secondary">{t(`routePreview.type.${match.type}`)}</Badge>
      </div>
      <Separator />
      <PreviewBody type={match.type} id={match.id} path={path} />
    </div>
  );
}

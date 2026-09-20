/**
 * IssueTypeSwitcher - 详情页工单类型切换（Linear 式类型下拉）
 *
 * 触发器：类型胶囊（IssueTypePill）+ 展开箭头；菜单：启用中的类型列表
 * （图标 + 名称 + 当前项勾选），底部「管理任务类型」跳设置页。
 * 切换即 PATCH typeId（服务端同步遗留 type 列），fieldSchema 随之切换，
 * 详情页自定义字段分区自动跟随新类型。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { IssueTypePill } from '@/shared/components/issue-type-pill';
import { issueTypeIcon } from '@/shared/components/issue-type-icon';
import { useIssueTypes, useIssueTypeOf } from '../hooks/use-issue-types';
import { useUpdateTask } from '../hooks/use-project-tasks';
import type { Task } from '../api/issue-api';

export function IssueTypeSwitcher({
  task,
  onChanged,
}: {
  task: Task;
  /** 切换成功后的回调（如刷新动态时间线） */
  onChanged?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { types } = useIssueTypes();
  const issueTypeOf = useIssueTypeOf();
  const updateTask = useUpdateTask();
  const current = issueTypeOf(task);

  // 禁用类型不在可选列表（当前类型除外，保证可见可保持）
  const selectable = types.filter((ty) => ty.enabled || ty.id === current?.id);

  const switchType = async (typeId: string) => {
    if (!current || typeId === current.id) return;
    try {
      await updateTask.mutateAsync({ issueId: task.id, data: { typeId } });
      onChanged?.();
    } catch {
      // 失败提示由 useUpdateTask 的 onError toast 呈现
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={t('taskDetail.switchType')}
        className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <IssueTypePill meta={current} />
        <ChevronsUpDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-44">
        {selectable.map((ty) => {
          const Icon = issueTypeIcon(ty.icon);
          const selected = ty.id === current?.id;
          return (
            <DropdownMenuItem
              key={ty.id}
              className="gap-2"
              onSelect={() => void switchType(ty.id)}
            >
              <Icon className="size-3.5 shrink-0" style={{ color: ty.color }} />
              <span className="flex-1">{ty.name}</span>
              {selected ? <Check className="size-3.5 text-accent-green" /> : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-muted-foreground"
          onSelect={() => navigate('/app/settings/issue-types')}
        >
          <Settings2 className="size-3.5 shrink-0" />
          {t('taskDetail.manageTypes')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

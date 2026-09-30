/**
 * 成员参与的任务列表（个人页「任务」tab）
 * 数据源：GET /issue-assignees/member/:id（指派关系 + 任务/项目摘要）
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListTodo } from 'lucide-react';

import { SectionCard } from '@/components/semantic/section-card';
import { EmptyState } from '@/components/semantic/empty-state';
import { Badge } from '@/components/ui/badge';
import { useMemberTasks } from '../hooks';

/** 状态点着色（done 绿 / 进行蓝 / 其余黄，与概览负载卡口径一致） */
function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (['done', 'completed', 'closed', 'done_done'].includes(s)) {
    return 'bg-accent-green';
  }
  if (['in_progress', 'inprogress', 'started'].includes(s)) {
    return 'bg-accent-blue';
  }
  return 'bg-accent-yellow';
}

export function MemberTasksSection({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { data: tasks, isLoading } = useMemberTasks(memberId);

  if (isLoading) {
    return (
      <SectionCard title={t('memberDetail.tasks.title', '参与的任务')}>
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t('common.loading', '加载中…')}
        </p>
      </SectionCard>
    );
  }

  const items = tasks ?? [];
  if (items.length === 0) {
    return (
      <SectionCard title={t('memberDetail.tasks.title', '参与的任务')}>
        <EmptyState
          variant="card"
          icon={ListTodo}
          title={t('memberDetail.tasks.empty', '还没有参与任何任务')}
          description={t(
            'memberDetail.tasks.emptyDesc',
            '该成员被指派任务后，任务会出现在这里',
          )}
          className="min-h-0 border-0"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={t('memberDetail.tasks.title', '参与的任务')}
      description={t('memberDetail.tasks.desc', '{{count}} 个任务（按指派关系）', {
        count: items.length,
      })}
    >
      <ul className="space-y-1">
        {items.map((ref) => {
          if (!ref.task) return null;
          const task = ref.task;
          return (
            <li
              key={ref.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30"
            >
              <Link
                to={`/app/issues/${task.id}`}
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${statusTone(task.status)}`}
                  title={task.status}
                />
                <span className="truncate">{task.title}</span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {task.project && (
                  <Link
                    to={`/app/projects/${task.project.id}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor:
                          task.project.color || 'var(--color-brand-linear)',
                      }}
                    />
                    <span className="max-w-24 truncate">{task.project.name}</span>
                  </Link>
                )}
                <Badge variant="outline" className="text-3xs">
                  {task.priority}
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

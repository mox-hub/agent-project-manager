/**
 * TaskMilestoneBadge - 任务里程碑徽章组件
 * 显示任务所属的里程碑
 */

import { cn } from '@/lib/utils';
import type { MilestoneRef } from '../api/task-api';

interface TaskMilestoneBadgeProps {
  milestone?: MilestoneRef | null;
}

export function TaskMilestoneBadge({ milestone }: TaskMilestoneBadgeProps) {
  if (!milestone) {
    return <span className="text-[10px] text-[#717282]/40">—</span>;
  }

  const getMilestoneColor = (status?: string) => {
    switch (status) {
      case 'active':
        return { bg: '#3b82f622', color: '#3b82f6' };
      case 'completed':
        return { bg: '#10b98122', color: '#10b981' };
      default:
        return { bg: '#71728222', color: '#717282' };
    }
  };

  const colors = getMilestoneColor(milestone.status);

  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium max-w-full"
      style={{
        backgroundColor: colors.bg,
        color: colors.color,
      }}
    >
      <span className="truncate">{milestone.name}</span>
    </span>
  );
}

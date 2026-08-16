/**
 * SubTaskBadge - 子任务药丸徽章组件
 * 显示子任务完成进度 (圆形进度环 + 文字)
 * 
 * 设计规格:
 * - 容器: 紧凑内边距，圆角药丸形
 * - 进度环: 蓝色进度显示，适配日/夜间模式
 * - 文字: Inter Medium，适配日/夜间模式
 * 
 * 颜色变量:
 * - --accent-blue: 蓝色进度环
 * - --muted-foreground: 文字颜色
 * - --muted: 背景色
 */

import type { TodoItem } from '../api/task-api';

interface SubTaskBadgeProps {
  todoItems?: TodoItem[];
  subTaskCount?: number;
}

export function SubTaskBadge({ todoItems, subTaskCount }: SubTaskBadgeProps) {
  const completed = todoItems?.filter(item => item.completed).length ?? 0;
  const total = todoItems?.length ?? subTaskCount ?? 0;
  
  if (total === 0) {
    return null;
  }

  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div 
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0"
      style={{ 
        backgroundColor: 'hsl(var(--muted))',
        color: 'hsl(var(--muted-foreground))',
      }}
    >
      {/* 圆形进度环 - 16px，更明显 */}
      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
        {/* 背景环 */}
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        {/* 进度环 - 蓝色，从顶部开始 (-90度) */}
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="hsl(var(--accent-blue))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${(progress / 100) * 37.7} 37.7`}
          transform="rotate(-90 8 8)"
        />
      </svg>
      
      {/* 进度文字 - 12px，更大 */}
      <span className="font-semibold tabular-nums leading-none">
        {completed}/{total}
      </span>
    </div>
  );
}

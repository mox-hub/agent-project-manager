// Command Scope Bar - 作用域切换栏
import React, { memo } from 'react';
import type { CommandScope } from '../types/command.types';

// 动态导入 Lucide 图标
import * as Icons from 'lucide-react';

interface ScopeOption {
  value: CommandScope;
  label: string;
  icon: string;
}

const scopeOptions: ScopeOption[] = [
  { value: 'global', label: '全局', icon: 'Globe' },
  { value: 'project', label: '项目', icon: 'FolderKanban' },
  { value: 'task', label: '任务', icon: 'CheckSquare' },
  { value: 'document', label: '文档', icon: 'FileText' },
  { value: 'terminal', label: '终端', icon: 'Terminal' },
];

interface CommandScopeBarProps {
  current: CommandScope;
  onChange: (scope: CommandScope) => void;
}

export const CommandScopeBar = memo(function CommandScopeBar({
  current,
  onChange,
}: CommandScopeBarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border px-3 py-2">
      <span className="mr-2 text-xs text-muted-foreground">范围:</span>
      <div className="flex gap-1">
        {scopeOptions.map((option) => {
          const Icon = Icons[option.icon as keyof typeof Icons] as React.ComponentType<{
            className?: string;
          }>;
          const isActive = current === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
              title={`切换到 ${option.label} 作用域`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

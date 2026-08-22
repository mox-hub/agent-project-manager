// Command Group - 使用现有 cmdk 组件
import React, { memo } from 'react';
import type { CommandGroup as CommandGroupType } from '../types/command.types';

interface CommandGroupProps {
  group: CommandGroupType;
  children: React.ReactNode;
}

export const CommandGroupComponent = memo(function CommandGroupComponent({
  group,
  children,
}: CommandGroupProps) {
  if (!children) return null;
  return <div className="py-1">{children}</div>;
});

/**
 * 命令分组标题
 */
export function CommandGroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-11 font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

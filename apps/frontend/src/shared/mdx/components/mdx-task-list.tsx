'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface MdxTaskListProps extends React.HTMLAttributes<HTMLUListElement> {
  children?: React.ReactNode;
  ordered?: boolean;
}

export const MdxTaskList = memo(function MdxTaskList({
  children,
  className,
  ordered,
  ...props
}: MdxTaskListProps) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      className={cn(
        'my-4 space-y-1.5 pl-5',
        ordered ? 'list-decimal' : 'list-none',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
});

interface MdxTaskItemProps extends React.HTMLAttributes<HTMLLIElement> {
  checked?: boolean;
  children?: React.ReactNode;
}

export const MdxTaskItem = memo(function MdxTaskItem({
  checked,
  children,
  className,
  ...props
}: MdxTaskItemProps) {
  return (
    <li
      className={cn('flex items-start gap-2.5', className)}
      {...props}
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mt-1 h-4 w-4 shrink-0 rounded border-border text-accent-blue accent-accent-blue"
      />
      <span className={cn('flex-1', checked && 'text-muted-foreground line-through')}>
        {children}
      </span>
    </li>
  );
});

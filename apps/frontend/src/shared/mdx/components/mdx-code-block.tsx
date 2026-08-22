'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface MdxCodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children?: React.ReactNode;
  className?: string;
}

export const MdxCodeBlock = memo(function MdxCodeBlock({
  children,
  className,
  ...props
}: MdxCodeBlockProps) {
  return (
    <pre
      className={cn(
        'not-prose overflow-x-auto rounded-lg border border-border bg-muted p-4',
        'my-4 text-sm leading-relaxed shadow-xs',
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  );
});

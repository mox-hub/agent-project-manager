'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface MdxBlockquoteProps extends React.HTMLAttributes<HTMLQuoteElement> {
  children?: React.ReactNode;
}

export const MdxBlockquote = memo(function MdxBlockquote({
  children,
  className,
  ...props
}: MdxBlockquoteProps) {
  return (
    <blockquote
      className={cn(
        'not-prose my-4 border-l-4 border-accent-blue/40 pl-4 italic',
        'text-muted-foreground [&>p]:mb-0',
        className,
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
});

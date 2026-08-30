'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

type CalloutType = 'info' | 'warning' | 'danger' | 'success' | 'tip';

interface MdxCalloutProps {
  type?: CalloutType;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const CALLOUT_STYLES: Record<CalloutType, { wrapper: string; icon: string; iconPath: string }> = {
  info: {
    wrapper: 'border-accent-blue/30 bg-accent-blue/5',
    icon: 'text-accent-blue',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    wrapper: 'border-accent-yellow/30 bg-accent-yellow/5',
    icon: 'text-accent-yellow',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  danger: {
    wrapper: 'border-accent-red/30 bg-accent-red/5',
    icon: 'text-accent-red',
    iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  success: {
    wrapper: 'border-accent-green/30 bg-accent-green/5',
    icon: 'text-accent-green',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  tip: {
    wrapper: 'border-accent-purple/30 bg-accent-purple/5',
    icon: 'text-accent-purple',
    iconPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
};

export const MdxCallout = memo(function MdxCallout({
  type = 'info',
  title,
  children,
  className,
}: MdxCalloutProps) {
  const style = CALLOUT_STYLES[type];

  return (
    <div
      className={cn(
        'not-prose my-4 rounded-lg border p-4',
        style.wrapper,
        className,
      )}
      role="note"
    >
      <div className="flex gap-3">
        <svg
          className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon)}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={style.iconPath}
          />
        </svg>
        <div className="flex-1 space-y-1.5">
          {title && (
            <p className="text-sm font-semibold text-foreground">{title}</p>
          )}
          <div className="text-sm leading-relaxed text-muted-foreground [&>p]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

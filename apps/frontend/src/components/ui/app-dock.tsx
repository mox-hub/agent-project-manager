import * as React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export interface AppDockProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/**
 * AppDock - 磨砂水晶风格的底部悬浮 Dock 容器
 */
export function AppDock({ className, children, ...props }: AppDockProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <nav
        role="toolbar"
        aria-label="Application Dock"
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
          'flex h-12 items-center gap-1 px-2.5 py-1 rounded-full',
          'bg-popover/85 backdrop-blur-xl border border-border/70 shadow-2xl',
          'transition-all duration-200 select-none',
          className,
        )}
        {...props}
      >
        {children}
      </nav>
    </TooltipProvider>
  );
}

export interface AppDockItemProps extends HTMLMotionProps<'button'> {
  label: string;
  badge?: number | string;
  badgeTone?: 'destructive' | 'primary' | 'warning';
  active?: boolean;
}

/**
 * AppDockItem - Dock 栏项，集成 Tooltip 与 spring 动效
 */
export const AppDockItem = React.forwardRef<HTMLButtonElement, AppDockItemProps>(
  ({ className, label, badge, badgeTone = 'destructive', active, children, ...props }, ref) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            ref={ref}
            type="button"
            whileHover={{ scale: 1.12, y: -2 }}
            whileTap={{ scale: 0.92, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'relative flex size-9 shrink-0 items-center justify-center rounded-full',
              'text-muted-foreground hover:text-foreground transition-colors',
              'hover:bg-accent/70 active:bg-accent',
              active && 'bg-accent text-foreground shadow-xs',
              className,
            )}
            {...props}
          >
            {children}
            {badge !== undefined && badge !== null && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-10 font-bold tabular-nums ring-2 ring-popover',
                  badgeTone === 'destructive' && 'bg-destructive text-destructive-foreground',
                  badgeTone === 'primary' && 'bg-primary text-primary-foreground',
                  badgeTone === 'warning' && 'bg-accent-yellow text-foreground',
                )}
              >
                {badge}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  },
);
AppDockItem.displayName = 'AppDockItem';

/**
 * AppDockSeparator - 垂直分隔线
 */
export function AppDockSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-4 w-px bg-border/70 mx-1 shrink-0', className)}
      aria-hidden="true"
    />
  );
}

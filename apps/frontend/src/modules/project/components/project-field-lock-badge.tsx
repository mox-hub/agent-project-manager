import * as React from 'react';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProjectFieldLockBadgeProps {
  provider?: string | null;
  className?: string;
}

/**
 * Tiny badge that signals the field is locked because the project is
 * synced from an external task provider. Place inline next to the
 * field label.
 */
export function ProjectFieldLockBadge({
  provider,
  className,
}: ProjectFieldLockBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1 py-0.5 text-10 text-amber-300 ring-1 ring-amber-500/30',
              className,
            )}
          >
            <Lock className="size-2.5" /> synced
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">
            Synced from {provider ?? 'external source'} and cannot be edited
            locally.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

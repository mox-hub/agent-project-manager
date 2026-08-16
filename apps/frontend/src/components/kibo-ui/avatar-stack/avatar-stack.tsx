"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface AvatarStackProps {
  users: {
    id: string;
    name?: string;
    avatar?: string;
    initials?: string;
  }[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs -ml-2",
  md: "h-8 w-8 text-sm -ml-2",
  lg: "h-10 w-10 text-base -ml-3",
};

export function AvatarStack({ users, max = 4, size = "md", className }: AvatarStackProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center", className)}>
        {visibleUsers.map((user, index) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  "border-2 border-background rounded-full",
                  sizeClasses[size],
                  index > 0 && "ml-0"
                )}
                style={{ zIndex: visibleUsers.length - index }}
              >
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.initials || user.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name || user.id}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700 border-2 border-background text-zinc-600 dark:text-zinc-300 font-medium",
                  sizeClasses[size]
                )}
                style={{ zIndex: 0 }}
              >
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{remainingCount} more</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

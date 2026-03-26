import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      data-ai-component={props["data-ai-component"] ?? "ui.input"}
      data-ai-role={props["data-ai-role"] ?? "input"}
      className={cn(
        "flex h-9 w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-1 text-base shadow-xs transition-[color,background-color,border-color,box-shadow] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--motion-ease-standard)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

import * as React from "react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className={cn("relative inline-flex w-full items-center")}>
        {leftIcon && (
          <span className="absolute left-3 flex items-center justify-center text-muted-foreground z-10 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 flex items-center justify-center text-muted-foreground z-10 pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }

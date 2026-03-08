import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-interactive-primary text-primary-foreground shadow-sm hover:bg-interactive-primary-hover",
        primary:
          "border-none bg-gradient-to-r from-accent-green to-accent-purple text-gray-950 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        secondary:
          "bg-interactive-secondary text-content-text border border-content-border shadow-sm hover:bg-interactive-ghost-hover",
        outline:
          "border border-content-border bg-transparent text-content-text hover:bg-interactive-ghost-hover",
        ghost:
          "text-content-text-secondary hover:bg-interactive-ghost-hover",
        link:
          "text-accent-blue underline-offset-4 hover:underline",
        destructive:
          "bg-accent-red text-white shadow-sm hover:bg-accent-red/90",
        danger:
          "bg-accent-red text-white shadow-sm hover:bg-accent-red/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariant = "default" | "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive" | "danger";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {leftIcon && <span className="inline-flex items-center">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="inline-flex items-center">{rightIcon}</span>}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

// Backward compatibility alias
export const PillButton = Button;
export type { ButtonProps as PillButtonProps };

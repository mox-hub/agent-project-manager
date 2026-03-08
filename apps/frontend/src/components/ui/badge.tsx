import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent-blue text-white",
        secondary:
          "border-transparent bg-content-bg-secondary text-content-text-secondary",
        success:
          "border-transparent bg-accent-green-light text-accent-green",
        warning:
          "border-transparent bg-accent-yellow-light text-accent-yellow",
        destructive:
          "border-transparent bg-accent-red-light text-accent-red",
        outline: "text-content-text border-content-border",
        blue: "border-transparent bg-accent-blue-light text-accent-blue",
        green: "border-transparent bg-accent-green-light text-accent-green",
        purple: "border-transparent bg-accent-purple-light text-accent-purple",
        yellow: "border-transparent bg-accent-yellow-light text-accent-yellow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

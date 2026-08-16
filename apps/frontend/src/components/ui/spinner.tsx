import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

export type SpinnerSize = "sm" | "md" | "lg" | "xl"

export interface SpinnerProps extends React.ComponentProps<"svg"> {
  size?: SpinnerSize
  label?: string
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
}

function Spinner({ size = "md", label, className, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label={label ?? "加载中"}
      className={cn(sizeMap[size], "animate-spin text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Spinner }

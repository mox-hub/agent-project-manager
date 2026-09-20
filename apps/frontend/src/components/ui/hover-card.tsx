import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const hoverCardContentVariants = cva(
  "z-50 w-64 p-4 origin-(--transform-origin) rounded-lg bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  {
    variants: {
      /** 宽度四档，对齐 route-preview 既有覆写值（w-72）与弹层宽度梯度 */
      size: {
        sm: "w-56",
        md: "w-64",
        lg: "w-72",
        xl: "w-80",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return (
    <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  )
}

function HoverCardContent({
  className,
  size,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  ...props
}: PreviewCardPrimitive.Popup.Props &
  VariantProps<typeof hoverCardContentVariants> &
  Pick<
    PreviewCardPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(hoverCardContentVariants({ size }), className)}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}

/**
 * 可选箭头（默认不渲染）：显式放进 HoverCardContent children 中才会出现。
 * 样式沿用 repo 内 tooltip 箭头配方，仅换 popover 底色。
 */
function HoverCardArrow({ className, ...props }: PreviewCardPrimitive.Arrow.Props) {
  return (
    <PreviewCardPrimitive.Arrow
      data-slot="hover-card-arrow"
      className={cn(
        "z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs bg-popover fill-popover data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5",
        className
      )}
      {...props}
    />
  )
}

export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  HoverCardArrow,
  hoverCardContentVariants,
}

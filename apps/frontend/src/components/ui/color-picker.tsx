"use client"

import * as React from "react"
import { HexColorPicker } from "react-colorful"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/*
 * Color Picker —— 照 coss DatePicker 组合范式自建（Popover + react-colorful + 预设色板），
 * 收敛原生 <input type="color">（系统色板）与各处手绘 swatch 网格。
 * `swatches` 缺省用 DEFAULT_SWATCHES；`allowCustom=false` 退化为纯预设选择（标签色等受约束场景）。
 */

/**
 * 项目预设色板（Tailwind 500 阶，原 core-config TAG_COLORS 收编为全局缺省）。
 * 用户自选色板：存库的用户数据色值，非 UI 语义色（宪法 §5 豁免，见 PRINCIPLES 附录登记）。
 */
export const DEFAULT_SWATCHES = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#6b7280",
] as const

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export interface ColorPickerProps {
  /** 受控色值（hex，#rgb 或 #rrggbb） */
  value?: string
  onValueChange?: (color: string) => void
  /** 预设色板，缺省 DEFAULT_SWATCHES；传空数组隐藏色板区 */
  swatches?: readonly string[]
  /** 是否提供色域/明度调节与 hex 输入，默认 true；false 时为纯预设选择 */
  allowCustom?: boolean
  /** 选择预设后关闭弹层，默认 true */
  closeOnSwatch?: boolean
  placeholder?: string
  disabled?: boolean
  /** 触发按钮宽度等覆写 */
  triggerClassName?: string
  /** 弹层内容区覆写 */
  className?: string
  popoverAlign?: "start" | "center" | "end"
}

export function ColorPicker({
  value,
  onValueChange,
  swatches = DEFAULT_SWATCHES,
  allowCustom = true,
  closeOnSwatch = true,
  placeholder = "选择颜色",
  disabled,
  triggerClassName,
  className,
  popoverAlign = "start",
}: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hexDraft, setHexDraft] = React.useState(value ?? "")

  React.useEffect(() => {
    setHexDraft(value ?? "")
  }, [value])

  const handleSwatch = (color: string) => {
    onValueChange?.(color.toLowerCase())
    if (closeOnSwatch) {
      setOpen(false)
    }
  }

  const commitHex = () => {
    const hex = hexDraft.trim()
    if (HEX_RE.test(hex)) {
      onValueChange?.(hex.toLowerCase())
    } else {
      setHexDraft(value ?? "")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            data-slot="color-picker-trigger"
            className={cn("w-36 justify-start px-3 font-normal", triggerClassName)}
          />
        }
      >
        {value ? (
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-full ring-1 ring-foreground/15"
            style={{ backgroundColor: value }}
          />
        ) : null}
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align={popoverAlign} sideOffset={4} className={cn("w-auto gap-3 p-3", className)}>
        {swatches.length > 0 ? (
          <div className="grid grid-cols-8 gap-1.5">
            {swatches.map((color) => {
              const selected = value?.toLowerCase() === color.toLowerCase()
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => handleSwatch(color)}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-shadow",
                    "hover:scale-110",
                    selected
                      ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      : "ring-1 ring-foreground/10",
                    disabled && "pointer-events-none opacity-50",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selected ? (
                    <CheckIcon className="size-3.5 text-white drop-shadow-sm" />
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}
        {allowCustom ? (
          <>
            <div
              aria-hidden={disabled}
              className={cn(disabled && "pointer-events-none opacity-50")}
            >
              <HexColorPicker
                color={value ?? "#6b7280"}
                onChange={(color) => onValueChange?.(color)}
                className="h-36 w-56"
              />
            </div>
            <Input
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={commitHex}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commitHex()
                }
              }}
              placeholder="#5E6AD2"
              disabled={disabled}
              spellCheck={false}
              className="h-8 font-mono text-xs uppercase"
            />
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

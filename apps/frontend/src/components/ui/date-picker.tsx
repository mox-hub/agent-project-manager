"use client"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/*
 * Date Picker —— coss ui 组合模式（registry @coss/date-picker 的组合配方）
 * Popover + Calendar + Button 标准件，收敛各处手写的弹层日历组合。
 * `trigger` 传入自定义触发元素（如 Linear 风格胶囊），`footer` 追加弹层尾部内容（如清除）。
 */

export interface DatePickerPreset {
  label: React.ReactNode
  date: Date
}

export interface DatePickerProps {
  value?: Date
  onValueChange?: (date: Date | undefined) => void
  placeholder?: string
  /** 自定义触发元素（内容自定，样式与开启态由本组件接管）；缺省渲染 outline 按钮 */
  trigger?: React.ReactElement
  /** 弹层尾部附加内容（如"清除"操作行） */
  footer?: React.ReactNode
  /** 触发按钮宽度，默认 240px */
  buttonClassName?: string
  className?: string
  /** 弹层对齐，默认 start */
  popoverAlign?: "start" | "center" | "end"
  disabled?: boolean
  /** 选择后关闭弹层，默认 true */
  closeOnSelect?: boolean
  presets?: DatePickerPreset[]
  /** 日期显示格式化，默认 yyyy-MM-dd */
  formatDate?: (date: Date) => string
  /** 透传给 Calendar 的其余 props（disabled 匹配、locale 等） */
  calendarProps?: Partial<React.ComponentProps<typeof Calendar>>
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Pick a date",
  trigger,
  footer,
  buttonClassName,
  className,
  popoverAlign = "start",
  disabled,
  closeOnSelect = true,
  presets,
  formatDate = (date: Date) => format(date, "yyyy-MM-dd"),
  calendarProps,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (date: Date | undefined) => {
    onValueChange?.(date)
    if (closeOnSelect && date) {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger ? (
        <PopoverTrigger render={trigger} />
      ) : (
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              disabled={disabled}
              data-slot="date-picker-trigger"
              className={cn(
                "w-60 justify-start px-3 font-normal",
                !value && "text-muted-foreground",
                buttonClassName
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {value ? formatDate(value) : placeholder}
        </PopoverTrigger>
      )}
      <PopoverContent
        align={popoverAlign}
        sideOffset={4}
        className={cn("w-auto p-0", className)}
      >
        {presets?.length ? (
          <div className="flex flex-wrap gap-1 border-b p-2">
            {presets.map((preset, index) => (
              <Button
                key={index}
                variant="secondary"
                size="xs"
                onClick={() => handleSelect(preset.date)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        ) : null}
        <Calendar
          {...({
            mode: "single",
            selected: value,
            onSelect: handleSelect,
            ...calendarProps,
          } as React.ComponentProps<typeof Calendar>)}
        />
        {footer ? <div className="border-t p-2">{footer}</div> : null}
      </PopoverContent>
    </Popover>
  )
}

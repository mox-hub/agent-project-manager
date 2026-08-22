import * as React from "react"

import { cn } from "@/lib/utils"

/** 内置头像清单（public/avatars 下随应用分发，avatarUrl 直接存该路径） */
export const BUILT_IN_AVATARS: Array<{
  key: string
  url: string
  label: string
  kind: "human" | "ai"
}> = [
  { key: "human-01", url: "/avatars/human-01.svg", label: "商务", kind: "human" },
  { key: "human-02", url: "/avatars/human-02.svg", label: "开发", kind: "human" },
  { key: "human-03", url: "/avatars/human-03.svg", label: "设计", kind: "human" },
  { key: "human-04", url: "/avatars/human-04.svg", label: "科研", kind: "human" },
  { key: "human-05", url: "/avatars/human-05.svg", label: "探索", kind: "human" },
  { key: "human-06", url: "/avatars/human-06.svg", label: "教学", kind: "human" },
  { key: "bot-01", url: "/avatars/bot-01.svg", label: "机器人", kind: "ai" },
  { key: "bot-02", url: "/avatars/bot-02.svg", label: "机械臂", kind: "ai" },
  { key: "bot-03", url: "/avatars/bot-03.svg", label: "智能", kind: "ai" },
  { key: "bot-04", url: "/avatars/bot-04.svg", label: "引擎", kind: "ai" },
  { key: "bot-05", url: "/avatars/bot-05.svg", label: "蜂群", kind: "ai" },
  { key: "bot-06", url: "/avatars/bot-06.svg", label: "像素", kind: "ai" },
]

function AvatarPickerField({
  value,
  onValueChange,
  memberType = "all",
  className,
  disabled,
}: {
  value?: string | null
  onValueChange: (value: string | null) => void
  memberType?: "human" | "ai" | "all"
  className?: string
  disabled?: boolean
}) {
  const options = BUILT_IN_AVATARS.filter(
    (a) => memberType === "all" || a.kind === memberType,
  )
  const isBuiltIn = Boolean(value && BUILT_IN_AVATARS.some((a) => a.url === value))

  return (
    <div data-slot="avatar-picker-field" className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((avatar) => {
          const selected = value === avatar.url
          return (
            <button
              key={avatar.key}
              type="button"
              title={avatar.label}
              disabled={disabled}
              onClick={() => onValueChange(selected ? null : avatar.url)}
              className={cn(
                "size-10 overflow-hidden rounded-lg border border-border transition-colors",
                "hover:border-accent-blue/60 hover:bg-accent-blue/5",
                selected && "border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <img src={avatar.url} alt={avatar.label} className="size-full object-cover" />
            </button>
          )
        })}
        <button
          type="button"
          title="清空头衔图像"
          disabled={disabled}
          onClick={() => onValueChange(null)}
          className={cn(
            "size-10 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors",
            "hover:border-accent-red/60 hover:text-accent-red",
            !value && "border-accent-red/60 text-accent-red",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          无
        </button>
      </div>
      <input
        type="url"
        placeholder="或粘贴自定义头像 URL…"
        disabled={disabled}
        value={isBuiltIn || value === null || value === undefined ? "" : value}
        onChange={(e) => onValueChange(e.target.value || null)}
        className={cn(
          "h-8 w-full rounded-md border border-border bg-background px-2 text-sm",
          "placeholder:text-muted-foreground focus-visible:border-accent-blue focus-visible:outline-hidden",
          disabled && "opacity-50",
        )}
      />
    </div>
  )
}

export { AvatarPickerField }

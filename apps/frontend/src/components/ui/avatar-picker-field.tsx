import * as React from "react"
import Avvvatars from "avvvatars-react"
import NiceAvatar, { genConfig } from "react-nice-avatar"

import { cn } from "@/lib/utils"

/** 内置头像清单（人类同事: react-nice-avatar 插画肖像；AI 同事: avvvatars 算法几何） */
export const BUILT_IN_AVATARS: Array<{
  key: string
  url: string
  label: string
  kind: "human" | "ai"
}> = [
  // 人类同事（react-nice-avatar 确定性算法插画肖像）
  { key: "nice-alex", url: "nice-avatar:alex", label: "人类: 领航 / 架构 (Alex)", kind: "human" },
  { key: "nice-sarah", url: "nice-avatar:sarah", label: "人类: 工程 / 研发 (Sarah)", kind: "human" },
  { key: "nice-leo", url: "nice-avatar:leo", label: "人类: 前端 / 全栈 (Leo)", kind: "human" },
  { key: "nice-david", url: "nice-avatar:david", label: "人类: 服务 / 数据 (David)", kind: "human" },
  { key: "nice-emma", url: "nice-avatar:emma", label: "人类: 体验 / 设计 (Emma)", kind: "human" },
  { key: "nice-lucas", url: "nice-avatar:lucas", label: "人类: 敏捷 / 质保 (Lucas)", kind: "human" },

  // AI 同事（avvvatars 确定性算法几何符号）
  { key: "av-claude", url: "avvvatars:claude-code", label: "AI: 编码智能体 (@claude-code)", kind: "ai" },
  { key: "av-codex", url: "avvvatars:codex", label: "AI: 审查智能体 (@codex)", kind: "ai" },
  { key: "av-zcode", url: "avvvatars:zcode", label: "AI: 运行时守护 (@zcode)", kind: "ai" },
  { key: "av-doc", url: "avvvatars:doc-bot", label: "AI: 知识架构 (@doc-bot)", kind: "ai" },
  { key: "av-qa", url: "avvvatars:qa-bot", label: "AI: 验收门禁 (@qa-bot)", kind: "ai" },
  { key: "av-guardian", url: "avvvatars:guardian", label: "AI: 安全审计 (@guardian)", kind: "ai" },
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
                "size-10 overflow-hidden rounded-full border border-border transition-colors",
                "hover:border-accent-blue/60 hover:bg-accent-blue/5",
                selected && "border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {avatar.url.startsWith("nice-avatar:") ? (
                <div className="size-full flex items-center justify-center overflow-hidden">
                  <NiceAvatar
                    style={{ width: "100%", height: "100%" }}
                    shape="circle"
                    {...genConfig(avatar.url.replace("nice-avatar:", ""))}
                  />
                </div>
              ) : avatar.url.startsWith("avvvatars:") ? (
                <div className="size-full flex items-center justify-center overflow-hidden">
                  <Avvvatars
                    value={avatar.url.replace("avvvatars:", "") || avatar.key}
                    size={36}
                    style={avatar.url.includes("character") ? "character" : "shape"}
                    shadow={false}
                  />
                </div>
              ) : (
                <img src={avatar.url} alt={avatar.label} className="size-full object-cover" />
              )}
            </button>
          )
        })}
        <button
          type="button"
          title="清空头衔图像"
          disabled={disabled}
          onClick={() => onValueChange(null)}
          className={cn(
            "size-10 rounded-full border border-dashed border-border text-sm text-muted-foreground transition-colors",
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

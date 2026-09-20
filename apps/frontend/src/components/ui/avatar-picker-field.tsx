"use client"

import * as React from "react"
import Avvvatars from "avvvatars-react"
import { PlusIcon, RefreshCwIcon } from "lucide-react"
import NiceAvatar, { genConfig } from "react-nice-avatar"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/*
 * Avatar Picker Field —— 照 coss DatePicker 组合范式升级的弹层头像选择组合件
 * （触发器显示当前头像；弹层 = 内置网格 + 随机生成 + 自定义 URL 预览 + 清除）。
 * 内置头像按双表面分工：人类同事 react-nice-avatar 插画肖像；AI 同事 avvvatars 算法几何。
 * `nice-avatar:` / `avvvatars:` 前缀 url 对任意种子字符串确定性出图，「随机生成」
 * 依赖该性质落库随机种子（无需枚举清单）。
 */

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

/** 按协议前缀渲染单枚头像（内置清单与随机种子共用） */
function AvatarGlyph({ url, label }: { url: string; label?: string }) {
  if (url.startsWith("nice-avatar:")) {
    return (
      <div
        role="img"
        aria-label={label}
        className="size-full overflow-hidden flex items-center justify-center"
      >
        <NiceAvatar
          style={{ width: "100%", height: "100%" }}
          shape="circle"
          {...genConfig(url.replace("nice-avatar:", ""))}
        />
      </div>
    )
  }
  if (url.startsWith("avvvatars:")) {
    return (
      <div
        role="img"
        aria-label={label}
        className="size-full overflow-hidden flex items-center justify-center"
      >
        <Avvvatars
          value={url.replace("avvvatars:", "")}
          size={36}
          style={url.includes("character") ? "character" : "shape"}
          shadow={false}
        />
      </div>
    )
  }
  return <img src={url} alt={label ?? ""} className="size-full object-cover" />
}

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
  const [open, setOpen] = React.useState(false)
  const [urlDraft, setUrlDraft] = React.useState("")

  React.useEffect(() => {
    setUrlDraft("")
  }, [open, value])

  const options = BUILT_IN_AVATARS.filter(
    (a) => memberType === "all" || a.kind === memberType,
  )
  const isBuiltIn = Boolean(value && BUILT_IN_AVATARS.some((a) => a.url === value))
  const selectedLabel = BUILT_IN_AVATARS.find((a) => a.url === value)?.label

  const rollRandom = () => {
    const seed = Math.random().toString(36).slice(2, 8)
    onValueChange(
      memberType === "ai" ? `avvvatars:gen-${seed}` : `nice-avatar:gen-${seed}`,
    )
  }

  return (
    <div data-slot="avatar-picker-field" className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              title={selectedLabel ?? (value || "选择头像")}
              data-slot="avatar-picker-trigger"
              className={cn(
                "size-10 shrink-0 overflow-hidden rounded-full p-0",
                !value && "border-dashed text-muted-foreground",
              )}
            />
          }
        >
          {value ? (
            <AvatarGlyph url={value} label={selectedLabel} />
          ) : (
            <PlusIcon className="size-4" />
          )}
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-64 gap-2 p-3">
          <div className="grid grid-cols-6 gap-1.5">
            {options.map((avatar) => {
              const selected = value === avatar.url
              return (
                <button
                  key={avatar.key}
                  type="button"
                  title={avatar.label}
                  disabled={disabled}
                  onClick={() => {
                    onValueChange(selected ? null : avatar.url)
                    setOpen(false)
                  }}
                  className={cn(
                    "size-10 overflow-hidden rounded-full border border-border transition-colors",
                    "hover:border-accent-blue/60 hover:bg-accent-blue/5",
                    selected && "border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <AvatarGlyph url={avatar.url} label={avatar.label} />
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={disabled}
              onClick={rollRandom}
            >
              <RefreshCwIcon data-icon="inline-start" />
              随机生成
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={disabled}
                onClick={() => {
                  onValueChange(null)
                  setOpen(false)
                }}
                className="text-accent-red hover:text-accent-red"
              >
                清除
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="url"
              placeholder="或粘贴自定义头像 URL…"
              disabled={disabled}
              value={urlDraft}
              onChange={(e) => {
                setUrlDraft(e.target.value)
                onValueChange(e.target.value || null)
              }}
              className="h-8 flex-1 text-xs"
            />
            {urlDraft && !isBuiltIn ? (
              <span className="size-8 shrink-0 overflow-hidden rounded-full border border-border">
                <AvatarGlyph url={urlDraft} />
              </span>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      {value && !isBuiltIn ? (
        <span className="truncate font-mono text-xs text-muted-foreground" title={value}>
          {value}
        </span>
      ) : null}
    </div>
  )
}

export { AvatarPickerField, AvatarGlyph }

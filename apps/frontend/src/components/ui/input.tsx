import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Input 的尺寸/字阶/起始内距档（E 类桶1 增补，2026-09-28）。
 *
 * 全部「默认不变」：default 档不生成任何类，既有调用方渲染逐字节不变。
 * 归因（生产面裸覆盖形态聚类，逐档见下）：此前这些形态只能由调用方写
 * className 覆盖表达（§19.4 违规），补档后可迁移。
 */
type InputFontSize = "default" | "sm" | "xs";
/** 高度档名即类值（同 ui/button padding 轴先例：一维值不造语义名） */
type InputSize = "default" | "h-10" | "h-8" | "h-7" | "h-6";
/** 起始内距档：承接「带前导图标」的搜索/选择输入形态（图标绝对定位，输入区让位） */
type InputPaddingStart = "default" | "pl-7" | "pl-8" | "pl-9";
/**
 * 字族档（E 类第二轮增补，2026-09-28 第八轮裁决 #1-①，纯增补 default 不变）：
 * `mono` 输出 `font-mono`，承接表单控件上的等宽字体覆盖。归因：E 类桶3 font-mono
 * 专项 50 处中 32 处留报（表单控件无内层元素可下沉 span），裁决 1-① 据此解锁
 * 「Input/Textarea mono 档」。出处：`docs/design/修改方案-E类-2026-09-27.md` §七之九 #1。
 * 命名用 `fontVariant`（CSS font-variant 同词族、无状态语境词），不叫 `font`/`mono`：
 * 前者与 Tailwind `font-*` 三义（字族/字重/斜体）同词，后者是值不是轴名。
 */
type InputFontVariant = "default" | "mono";

function Input({
  className,
  type,
  fontSize = "default",
  size = "default",
  paddingStart = "default",
  fontVariant = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  fontSize?: InputFontSize;
  size?: InputSize;
  paddingStart?: InputPaddingStart;
  fontVariant?: InputFontVariant;
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        // 各轴置于基线之后、className 之前：档位可覆盖基线，调用方仍可最终覆盖。
        // fontSize 注意：基线 `md:text-sm` 是变体类，不会被 `text-xs`/`text-sm`
        // 覆盖移除——这与调用方裸写 className 的 twMerge 终串完全一致（等价）。
        fontSize === "sm" && "text-sm",
        fontSize === "xs" && "text-xs",
        size !== "default" && size,
        paddingStart !== "default" && paddingStart,
        fontVariant === "mono" && "font-mono",
        className
      )}
      {...props}
    />
  )
}

// 项目扩展：密码框（显隐切换），历史 API 保留
import { Eye, EyeOff } from "lucide-react"
import { RawButton } from './raw-button'

function PasswordInput({
  className,
  placeholder = "••••••••",
  paddingStart = "default",
  fontVariant = "default",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  /** 起始内距档：与 Input 同轴透传（承接带前导图标的密码输入） */
  paddingStart?: InputPaddingStart
  /** 字族档：与 Input 同轴透传（E 类第八轮裁决 #1-①，见 Input.fontVariant 注释） */
  fontVariant?: InputFontVariant
}) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        paddingStart={paddingStart}
        fontVariant={fontVariant}
        placeholder={placeholder}
        data-ai-component={props["data-ai-component"] ?? "ui.password-input"}
        data-ai-role={props["data-ai-role"] ?? "password-input"}
        {...props}
      />
      <RawButton
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2 top-1/2 z-sticky inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        tabIndex={-1}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </RawButton>
    </div>
  )
}

export { Input, PasswordInput }

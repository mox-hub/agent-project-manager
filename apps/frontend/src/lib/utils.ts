import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * twMerge 默认不认识 @theme 里的非标度 token，会把它们误判进「颜色」组，
 * 被 cn() 中后续的颜色类覆盖删除（样式静默失控）。此处把这类 token 显式登记回正确的组。
 *
 * 现状（2026-09-27 语义化迁移后）：
 * - 字号：text-3xs / text-2xs 无需登记——twMerge 的 isTshirtSize 天然认 `3xs` / `2xs`
 *   （已验证：text-3xs 与 text-sm 会正确互斥）。旧的两位数字直读档已从代码库清除，
 *   其登记项随之删除。
 * - 圆角：rounded-chip 不在 twMerge 的 borderRadius 标度内，必须登记，否则
 *   `cn('rounded-chip', 'rounded-lg')` 会同时保留两个类，由 CSS 顺序随机决出胜者。
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["chip"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

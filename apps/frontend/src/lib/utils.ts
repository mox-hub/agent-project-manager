import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * twMerge 默认不认识 @theme 的自定义字号 token（--text-10 / --text-11），
 * 会把它们误判进 text-color 组，被 cn() 中后续的颜色类覆盖删除，导致字号回落到
 * body 继承值（字号失控）。此处把宪法 §3 唯一字阶中的自定义 px 档登记进 font-size 组。
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["10", "11"] }],
      rounded: [{ rounded: ["3", "5", "8", "10", "14"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 大符号圆圈图标（CircleAlertBig / CircleXBig）
 *
 * 背景：状态图标规范要求「圆内符号可读性优先」（见 status-visuals.ts STATUS_ICONS 头注）。
 * lucide 仅有 CircleCheck 的大符号变体（CircleCheckBig），感叹号与叉无官方变体——
 * 此处按 lucide 圆系几何自绘（circle r=10 / strokeLinecap round / stroke 继承 props），
 * 符号放大（感叹号线长 8→11.3、叉臂长 8.5→12.7），与 lucide 图标视觉无缝混排。
 * props 签名对齐 LucideIcon 的消费面（className/strokeWidth/style/size），可进 STATUS_ICONS 注册表。
 */
import type { SVGProps } from 'react';

type BigSymbolProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number | string };

export function CircleAlertBig({
  size = 24,
  strokeWidth = 2,
  ...props
}: BigSymbolProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      {/* 感叹号主干 6→14.5（lucide 原版 8→12），尾部点 17.8（原版 16） */}
      <path d="M12 6v8.5" />
      <path d="M12 17.8h.01" />
    </svg>
  );
}

export function CircleXBig({
  size = 24,
  strokeWidth = 2,
  ...props
}: BigSymbolProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      {/* 叉臂 7.5→16.5 对角线（lucide 原版 9→15） */}
      <path d="m16.5 7.5-9 9" />
      <path d="m7.5 7.5 9 9" />
    </svg>
  );
}

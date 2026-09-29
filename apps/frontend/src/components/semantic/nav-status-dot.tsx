import { TONE_CLASS, type Tone } from '@/components/ui/tone';
import { cn } from '@/lib/utils';

/**
 * NavStatusDot —— 导航条目右侧的状态点（语义组件层，批 G1 第二件）。
 *
 * 侧边栏条目「能不能用 / 有没有人在线」用一个小色点表达。全库**导航态状态点**
 * 从此只有一个实现（原 `modules/settings/pages/settings-page.tsx` 内的同名局部件，
 * 2026-09-29 提取到本层，G 类「新增组件默认落点」）。
 *
 * **状态色链路遵 §19.5**：本组件只做**视觉层映射**（tone → class，走 `components/ui/tone.ts`
 * 唯一词表），不做业务映射。故 props 收的是 `tone` 而非 `available` / `online` 之类业务词——
 * status → tone 由调用方（业务层，知道业务语义）负责。本文件**不得出现颜色字面量**。
 *
 * **§8.5#4 不得只靠颜色传达状态**：`label` 必填，同时作为 `aria-label`（屏幕阅读器）
 * 与 `title`（悬停提示），是颜色之外的第二信号。缺了它组件在类型层就不成立——
 * 这是刻意的：一个说不出自己是什么状态的点，不该被渲染出来。
 *
 * **props 面封闭（裁决 G8）**：显式声明 props，不接 `className`、不透传 `variant`、
 * 不 `extends HTMLAttributes`（口径见 `semantic/README.md`）。
 *
 * **语义边界（刻意不做通用 StatusDot）**：本件以「导航 / 菜单条目右侧的小点」为界，
 * 尺寸固定 8px（`h-2 w-2`），`shrink-0` 防被相邻 `flex-1 truncate` 文案挤扁。
 * 仓内其他状态点形态与口径不同、不在本件内，等首个真实合并诉求出现再议：
 * - `modules/assistant/components/assistant-status-dot.tsx`：面板内状态点，6px、
 *   `aria-hidden`（状态由同区文案承载）、允许 `className` 透传——是另一套口径；
 * - 列表行 / 徽章内的 6px 色点（多处），尺寸与语境均不同。
 */
function NavStatusDot({
  tone,
  label,
  loading = false,
}: {
  /** 语义色档（§19.4 五档封闭词表）：就绪 = success / 不可用·需处理 = danger / 中性 = default */
  tone: Tone;
  /** 可访问名兼悬停提示（同一文案）——颜色之外的第二信号，必填 */
  label: string;
  /** 检查中：叠加 ping 动画（与静态灰点的区分信号，不是唯一信号），通常配 tone="default" */
  loading?: boolean;
}) {
  const dot = TONE_CLASS[tone].dot;

  if (loading) {
    return (
      <span role="img" aria-label={label} title={label} className="relative flex h-2 w-2 shrink-0">
        <span
          className={cn('absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75', dot)}
        />
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', dot)} />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn('h-2 w-2 shrink-0 rounded-full', dot)}
    />
  );
}

export { NavStatusDot };

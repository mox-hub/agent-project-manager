/**
 * tone.ts —— 视觉层 tone 词表（tone → class）
 *
 * E 类方案 §19.5「状态色唯一映射」的**下层**。全库有且仅有一条状态色链路：
 *
 *   业务状态（task.status / project.status / run.status …）
 *     │  ① 业务层映射（知道业务语义）
 *     ▼
 *   src/shared/status/status-visuals.ts   →  status ──► tone
 *     │
 *     │  ② 视觉层映射（只知道 tone，不知道业务）
 *     ▼
 *   src/components/ui/tone.ts             →  tone ──► { text, dot, light, bg, border }
 *     │
 *     ▼
 *   StatusPill / StatusIconFrame / 甘特条 / 看板卡 …
 *
 * 分层（§19.1）：本文件属**原子层**，只依赖已注册的 `--color-*` token，
 * 不 import 任何 `modules/*` 或 `shared/*`。消费方向只能是
 * `shared/status/` → `components/ui/tone.ts`，反向即分层倒置。
 *
 * ## 取值来源（2026-09-28 批 0b 抽取，纯重构、零视觉变更）
 *
 * - `text` / `dot` / `light` 三槽：**逐字**取自抽取前的两份重复映射
 *   （`status-pill.tsx` 的 `toneClass`、`status-visuals.ts` 的
 *   `TONE_TEXT_CLASS` / `TONE_DOT_CLASS` / `TONE_LIGHT_CLASS`）。
 *   两份实测**零差异**（同 tone 同槽逐字相同），故本次未做任何取值裁决。
 * - `bg` / `border` 两槽：**新增槽**。抽取前两份映射中并无对应项，
 *   取值沿用仓内既有 tone→描边 / tone→实心底写法
 *   （`page-header.tsx` 的 `METRIC_TONE_CLASS`、`segmented-control.tsx` 的
 *   `TONE_CLASS`），**未引入任何新色 token、未新增任何未注册色名**。
 *   两槽当前**零消费方**，属性可供后续批次接线；取值待人工确认。
 */

/** 五档语义 tone（§19.4 封闭词表：default / info / warning / success / danger） */
export type Tone = 'default' | 'info' | 'warning' | 'success' | 'danger';

/** tone 的五个视觉槽位 */
export interface ToneClass {
  /** 文字色（前景） */
  text: string;
  /** 色点 / 进度条填充（实心点） */
  dot: string;
  /** 浅底胶囊（浅底 + 配套文字色） */
  light: string;
  /** 实心 tone 底 */
  bg: string;
  /** tone 描边 */
  border: string;
}

/**
 * tone → class 唯一词表（§19.5 视觉层唯一真相源）。
 *
 * ⚠️ 修改本词表 = 全库状态视觉变更，须按 §11.2 走宪法修订，不得在页面上另写映射覆盖。
 */
export const TONE_CLASS: Record<Tone, ToneClass> = {
  default: {
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
    light: 'bg-muted/50 text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
  },
  info: {
    text: 'text-accent-blue',
    dot: 'bg-accent-blue',
    light: 'bg-accent-blue-light text-accent-blue',
    bg: 'bg-accent-blue',
    border: 'border-accent-blue/40',
  },
  warning: {
    text: 'text-accent-yellow',
    dot: 'bg-accent-yellow',
    light: 'bg-accent-yellow-light text-accent-yellow',
    bg: 'bg-accent-yellow',
    border: 'border-accent-yellow/50',
  },
  success: {
    text: 'text-accent-green',
    dot: 'bg-accent-green',
    light: 'bg-accent-green-light text-accent-green',
    bg: 'bg-accent-green',
    border: 'border-accent-green/40',
  },
  danger: {
    text: 'text-accent-red',
    dot: 'bg-accent-red',
    light: 'bg-accent-red-light text-accent-red',
    bg: 'bg-accent-red',
    border: 'border-accent-red/40',
  },
};

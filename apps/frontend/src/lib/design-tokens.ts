/**
 * Design Token Rules → 已迁移
 *
 * 本文件原为样式规则文档（2025 版）。2026-08-30 起样式规则的唯一权威是
 * 设计宪法：docs/design/PRINCIPLES.md（v1.0）。
 *
 * 概要（详见宪法，冲突时以宪法为准）：
 * - 字阶：唯一 8 档 text-10/11/xs/sm/base/lg/xl/2xl（§3）
 * - 间距：4px 网格，整数档与 .5 档合法，四分之一档冻结（§4）
 * - 圆角：radius token 分级，外层 lg 内层 control（§4/§5）
 * - 颜色：只许语义 token，禁止原始 Tailwind 色与 hex（§5）
 * - 图标：lucide-react 唯一 UI 图标库（§6）
 * - 动效：120/180/240ms 白名单，.motion-* 工具类（§7）
 * - 三态：hover/selected/focus 统一 token（§8）
 *
 * 本文件 documentation-only，不参与运行时。
 */
export {}

/**
 * 组件治理登记表 —— 单一真相源（E 类方案 §5.2「三处同源」）
 *
 * 三条同源链（单向再生，禁止反向手工编辑）：
 *   ① registry.ts ──生成──► COMPONENTS.md（`node scripts/gen-components-md.mjs`）
 *   ② registry.ts ──渲染──► design-system 页（正文 demo 手写 + Registry 对账区遍历
 *      galleryExempt 豁免账；画廊覆盖率由 `check-component-registry.mjs` §4.2 ④ 门禁
 *      机器强制恒 100%——H 类批 H3 起 error，分母 ui+semantic 双层、排除 internal 与
 *      galleryExempt，2026-09-29 兑现）
 *   ③ registry.ts ──校验──► lint:registry（扫描真实引用回填 consumers，判定 LU）
 *
 * 字段口径：
 * - status 五态（canonical / standby / internal / review / deprecated）定义见
 *   docs/design/修改方案-E类-2026-09-27.md §19.3。
 * - section 采用设计系统页的 11 组组件类型分区（2026-09-29 由「层」维度重组，组序见该页
 *   SECTION_GROUPS：Governance / Foundations / Controls / Data Display / Feedback /
 *   Navigation / Overlays / Layout & Shells / AI Execution / App Patterns / Semantic）。
 *   ui/ raw/ semantic/ 三层共 103 条按该页 SECTIONS 数组的 group 口径归类；modules/ 与
 *   shared/ 组件不在画廊分区体系内，保留 'App Components'（AI 执行面模块件沿用
 *   'AI Execution'），画廊分区由该页 SECTIONS 承载，COMPONENTS.md 由 LAYER 维度承载。
 * - consumers 由 lint 脚本回填，本文件**不写静态值**（防推测值污染 LU 指标）。
 * - review 态必带 reviewBy；逾期须降级 deprecated 或升级 canonical（§19.3 防滥用条款）。
 * - deprecated 态必带 `expiresAt`（§19.6；由 `check-component-registry.mjs` 机器强制，逾期 CI 失败）。
 *   书写位置：紧跟 status 之后、review 块之前，如
 *   `status: 'deprecated', expiresAt: '2026-12-31', review: { … }`；`gen-components-md.mjs`
 *   与 `check-component-registry.mjs` 均已解析该槽位（2026-09-28 补齐）。
 * - `status: 'standby'` 且带 `review` 数据的条目 = 方案 §七 D 项裁决的
 *   「先标记、不删除，待人工在设计系统页审阅后裁决」集合。
 * - `galleryExempt` = 画廊豁免槽位（H 类方案 §2.1，2026-09-29 裁决）：登记一句话理由后
 *   该件不计入画廊覆盖率分母（check-component-registry.mjs §4.2 ④ 机器强制），
 *   但仍在 Registry 对账区可见。书写位置紧跟 status，条目保持严格单行。
 *
 * 维护约定：新增 components/ui 组件必须先在此登记，否则 lint:registry 双向对账失败。
 * G 类批 G0 起，`components/raw/`（登记 internal 态、不出画廊，裁决 G6）与
 * `components/semantic/` 的组件同样必须先在此登记（三分目录治理链，见 G 类方案 §四）。
 */

export type ComponentStatus =
  | 'canonical' | 'standby' | 'internal' | 'review' | 'deprecated'

export interface ComponentEntry {
  name: string          // 'button'
  file: string          // 'ui/button.tsx'
  section: string       // 组件类型分区（11 组口径；modules/shared 件为 'App Components'）
  status: ComponentStatus
  variants?: string[]   // 变体轴登记（§19.4）
  consumers?: number    // 由 lint 脚本回填
  expiresAt?: string    // deprecated 必填
  galleryExempt?: string // 画廊豁免槽位（H 类方案 §2.1）：登记理由后不计入画廊覆盖率分母；demo 豁免 ≠ 清退豁免，五态裁决面不受影响
  reviewBy?: string     // review 必填（§19.3 防滥用）
  review?: {            // ★ 裁决面数据（承接 〇之二 三段式）
    pending: true
    reason: string      // '零引用' | '仅画廊引用' | '与 X 能力重叠' | '命名误导'
    proposal: 'delete' | 'merge' | 'keep' | 'rename' | 'standby'
    target?: string     // merge/rename 的目标组件名
  }
}

export const COMPONENT_REGISTRY: ComponentEntry[] = [
  // ── UI 原子层：src/components/ui/ ─────────────────────────────────────────
  { name: 'accordion', file: 'ui/accordion.tsx', section: 'Navigation', status: 'standby' },
  { name: 'activity-heatmap', file: 'semantic/activity-heatmap.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'ai-agent-badge', file: 'modules/issue/components/ai-agent-badge.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'ai-context-summary', file: 'modules/project/components/ai-context-summary.tsx', section: 'AI Execution', status: 'canonical' },
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  { name: 'ai-execution-badge', file: 'modules/issue/components/ai-execution-badge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'alert', file: 'ui/alert.tsx', section: 'Feedback', status: 'canonical' },
  { name: 'alert-dialog', file: 'ui/alert-dialog.tsx', section: 'Overlays', status: 'canonical' },
  { name: 'anchored-menu', file: 'ui/anchored-menu.tsx', section: 'Overlays', status: 'internal' },
  { name: 'aspect-ratio', file: 'ui/aspect-ratio.tsx', section: 'Layout & Shells', status: 'standby' },
  { name: 'async-state', file: 'semantic/async-state.tsx', section: 'Feedback', status: 'canonical' },
  { name: 'autocomplete', file: 'ui/autocomplete.tsx', section: 'Controls', status: 'canonical' },
  { name: 'avatar', file: 'ui/avatar.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'avatar-picker-field', file: 'ui/avatar-picker-field.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'badge', file: 'ui/badge.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'breadcrumb', file: 'ui/breadcrumb.tsx', section: 'Navigation', status: 'standby' },
  { name: 'button', file: 'ui/button.tsx', section: 'Controls', status: 'canonical' },
  { name: 'button-group', file: 'ui/button-group.tsx', section: 'Controls', status: 'standby' },
  { name: 'calendar', file: 'ui/calendar.tsx', section: 'Controls', status: 'standby' },
  { name: 'card', file: 'ui/card.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'chapter-scrubber', file: 'modules/document/components/chapter-scrubber.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'chart', file: 'ui/chart.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'checkbox', file: 'ui/checkbox.tsx', section: 'Controls', status: 'canonical' },
  { name: 'checkbox-group', file: 'ui/checkbox-group.tsx', section: 'Controls', status: 'internal' },
  { name: 'collapsible', file: 'ui/collapsible.tsx', section: 'Navigation', status: 'standby' },
  { name: 'color-picker', file: 'ui/color-picker.tsx', section: 'Controls', status: 'canonical' },
  { name: 'combobox', file: 'ui/combobox.tsx', section: 'Controls', status: 'canonical' },
  { name: 'command', file: 'ui/command.tsx', section: 'Navigation', status: 'canonical' },
  { name: 'context-menu', file: 'ui/context-menu.tsx', section: 'Overlays', status: 'canonical' },
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  { name: 'data-list', file: 'shared/components/data-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'data-table', file: 'ui/data-table.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'data-table-shell', file: 'semantic/data-table-shell.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'date-picker', file: 'ui/date-picker.tsx', section: 'Controls', status: 'canonical' },
  { name: 'dialog', file: 'ui/dialog.tsx', section: 'Overlays', status: 'canonical' },
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  { name: 'document-preview-dialog', file: 'modules/document/components/document-preview-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'drawer', file: 'ui/drawer.tsx', section: 'Overlays', status: 'standby' },
  { name: 'dropdown-menu', file: 'ui/dropdown-menu.tsx', section: 'Overlays', status: 'deprecated', expiresAt: '2026-12-31' },
  { name: 'dual-track-metric-pill', file: 'semantic/dual-track-metric-pill.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'empty-state', file: 'semantic/empty-state.tsx', section: 'Feedback', status: 'canonical' },
  { name: 'error-boundary', file: 'semantic/error-boundary.tsx', section: 'Feedback', status: 'canonical', galleryExempt: '运行时挂载件（入口/错误边界挂载），非画廊可 demo 形态' },
  { name: 'field', file: 'ui/field.tsx', section: 'Controls', status: 'canonical' },
  { name: 'filter-chips', file: 'semantic/filter-chips.tsx', section: 'App Patterns', status: 'canonical' },
  { name: 'form', file: 'ui/form.tsx', section: 'Controls', status: 'canonical' },
  { name: 'global-loading-state', file: 'semantic/global-loading-state.tsx', section: 'Feedback', status: 'canonical', galleryExempt: '运行时挂载件（入口/错误边界挂载），非画廊可 demo 形态' },
  { name: 'header-action-button', file: 'semantic/header-action-button.tsx', section: 'App Patterns', status: 'canonical' },
  { name: 'hover-card', file: 'ui/hover-card.tsx', section: 'Overlays', status: 'canonical' },
  { name: 'icon-metric', file: 'semantic/icon-metric.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'icon-stack', file: 'semantic/icon-stack.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'input', file: 'ui/input.tsx', section: 'Controls', status: 'canonical' },
  { name: 'input-group', file: 'ui/input-group.tsx', section: 'Controls', status: 'canonical' },
  { name: 'input-otp', file: 'ui/input-otp.tsx', section: 'Controls', status: 'standby' },
  { name: 'item', file: 'ui/item.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'kbd', file: 'ui/kbd.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'label', file: 'ui/label.tsx', section: 'Controls', status: 'canonical' },
  { name: 'loading-overlay', file: 'semantic/loading-overlay.tsx', section: 'Feedback', status: 'canonical' },
  { name: 'menu', file: 'ui/menu.tsx', section: 'Navigation', status: 'canonical' },
  { name: 'menu-surface', file: 'ui/menu-surface.ts', section: 'Overlays', status: 'canonical', galleryExempt: '非可视组件（菜单定位工具，.ts），无可视 demo' },
  { name: 'menubar', file: 'ui/menubar.tsx', section: 'Navigation', status: 'standby' },
  { name: 'meter', file: 'ui/meter.tsx', section: 'Data Display', status: 'standby' },
  { name: 'mock-badge', file: 'ui/mock-badge.tsx', section: 'Data Display', status: 'canonical', galleryExempt: '运行时挂载件（入口/错误边界挂载），非画廊可 demo 形态' },
  { name: 'select-field', file: 'ui/select-field.tsx', section: 'Controls', status: 'canonical' },
  { name: 'number-field', file: 'ui/number-field.tsx', section: 'Controls', status: 'standby' },
  { name: 'page-error-fallback', file: 'semantic/page-error-fallback.tsx', section: 'Feedback', status: 'canonical', galleryExempt: '运行时挂载件（入口/错误边界挂载），非画廊可 demo 形态' },
  { name: 'page-header', file: 'semantic/page-header.tsx', section: 'App Patterns', status: 'canonical' },
  { name: 'page-shell', file: 'semantic/page-shell.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'pagination', file: 'ui/pagination.tsx', section: 'Navigation', status: 'canonical' },
  { name: 'popover', file: 'ui/popover.tsx', section: 'Overlays', status: 'canonical' },
  { name: 'progress', file: 'ui/progress.tsx', section: 'Data Display', status: 'canonical' },
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  { name: 'property-panel', file: 'shared/components/property-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'quick-cards-toggle', file: 'semantic/quick-cards-toggle.tsx', section: 'App Patterns', status: 'canonical' },
  { name: 'radio-group', file: 'ui/radio-group.tsx', section: 'Controls', status: 'canonical' },
  { name: 'right-sidebar', file: 'semantic/right-sidebar.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'scroll-area', file: 'ui/scroll-area.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'section-card', file: 'semantic/section-card.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'segmented-control', file: 'ui/segmented-control.tsx', section: 'Controls', status: 'canonical' },
  { name: 'select', file: 'ui/select.tsx', section: 'Controls', status: 'canonical' },
  { name: 'separator', file: 'ui/separator.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'sheet', file: 'ui/sheet.tsx', section: 'Overlays', status: 'canonical' },
  { name: 'sidebar-panel', file: 'semantic/sidebar-panel.tsx', section: 'Layout & Shells', status: 'canonical' },
  { name: 'skeleton', file: 'ui/skeleton.tsx', section: 'Feedback', status: 'canonical' },
  { name: 'slider', file: 'ui/slider.tsx', section: 'Controls', status: 'standby' },
  { name: 'sortable', file: 'ui/sortable.tsx', section: 'Navigation', status: 'canonical' },
  { name: 'spinner', file: 'ui/spinner.tsx', section: 'Feedback', status: 'canonical' },
  { name: 'status-pill', file: 'semantic/status-pill.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'stepper', file: 'ui/stepper.tsx', section: 'Navigation', status: 'canonical' },
  { name: 'sub-page-toolbar', file: 'semantic/sub-page-toolbar.tsx', section: 'App Patterns', status: 'canonical' },
  // Task Atoms 套件件：子任务进度徽章（进度环+计数，22px 外框标准）。提取自 task-rows /
  // task-simple-list / 画廊三份重复实现，提取同批接好三个消费方，登记 canonical。
  { name: 'subtask-badge', file: 'semantic/subtask-badge.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'switch', file: 'ui/switch.tsx', section: 'Controls', status: 'canonical' },
  { name: 'tab-bar', file: 'semantic/tab-bar.tsx', section: 'Navigation', status: 'canonical' },
  { name: 'table', file: 'ui/table.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'tabs', file: 'ui/tabs.tsx', section: 'Navigation', status: 'canonical' },
  { name: 'textarea', file: 'ui/textarea.tsx', section: 'Controls', status: 'canonical' },
  { name: 'toast', file: 'ui/toast.tsx', section: 'Feedback', status: 'canonical' },
  { name: 'toggle', file: 'ui/toggle.tsx', section: 'Controls', status: 'standby' },
  { name: 'toggle-group', file: 'ui/toggle-group.tsx', section: 'Controls', status: 'standby' },
  { name: 'tone', file: 'ui/tone.ts', section: 'Foundations', status: 'canonical', galleryExempt: '非可视组件（色彩工具，.ts），无可视 demo' },
  { name: 'toolbar-row', file: 'semantic/toolbar-row.tsx', section: 'App Patterns', status: 'canonical' },
  { name: 'tooltip', file: 'ui/tooltip.tsx', section: 'Overlays', status: 'canonical' },
  { name: 'view-display-popover', file: 'semantic/view-display-popover.tsx', section: 'Overlays', status: 'internal' },

  // ── 原语层：src/components/raw/（G 类批 G0：非动作交互元素的具名直通出口）──
  // 裁决 G6：raw 原语登记 internal 态（registry 数得上、不重演无治理区）、不出画廊；
  // 与 ui/menu-surface（ts 文件）先例同型。section 按组件类型归 'Controls'
  // （2026-09-29 分区重组），不出画廊故不参与分区渲染。
  { name: 'raw-button', file: 'raw/raw-button.tsx', section: 'Controls', status: 'internal' },
  { name: 'raw-input', file: 'raw/raw-input.tsx', section: 'Controls', status: 'internal' },

  // ── 语义组件层：src/components/semantic/（G 类批 G1 起：新增组件默认落点）──
  // props 面封闭（不接 className/variant，口径见 semantic/README.md）；业务面可直接消费。
  { name: 'chip', file: 'semantic/chip.tsx', section: 'Semantic', status: 'canonical' },
  // 第二件语义组件，且与 Chip 不同：chip 登记 standby 的原因是「业务接入前零引用属预期」，
  // 本件提取时两个消费方（设置页导航的 git / runtime 状态点）同批接好，standby 的理由不成立，
  // 故按 §19.3 轴二 LU 的正常口径登记 canonical（消费方 =1 文件、2 处调用，实测非 0）。
  // G8 机械化（props 封闭转 lint）的触发条件已由本件满足，属二期机械化的输入，见方案 §五。
  { name: 'nav-status-dot', file: 'semantic/nav-status-dot.tsx', section: 'Semantic', status: 'canonical' },
  // 第三件语义组件：主题模式卡片（三档意图）。提取自 appearance-section 的内联 JSX，
  // 消费方同批接好（设置页外观分区），故同 nav-status-dot 登记 canonical。
  // 预览缩略图的字面色单列豁免：宪法附录 A.1 行 A8 + check-palette.mjs 同名谓词。
  { name: 'theme-mode-card', file: 'semantic/theme-mode-card.tsx', section: 'Semantic', status: 'canonical' },
  // 批二三件（chart-card / stat-tile / metric-row）登记 standby：首消费同批接入
  // （project-overview-charts 两块 / dashboard-page 弹窗 tile 簇 / team-stats-section 进度列），
  // 消费簇尚小，按 chip 先例留复核窗口观察泛化形态是否立得住。
  { name: 'chart-card', file: 'semantic/chart-card.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'stat-tile', file: 'semantic/stat-tile.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'metric-row', file: 'semantic/metric-row.tsx', section: 'Semantic', status: 'canonical' },
  // 统计卡归一批（2026-09-29）：原 ui/stats-card 升格语义层标准件 + 原 ui/stat-card 收编为
  // featured 变种（layout 封闭枚举，非样式透传）；卡底（surface）与数值彩色（coloredValue）
  // 为封闭可选项。analytics / dashboard-page / settings ai overview / acceptance / team-stats
  // 五处本地与内联实现同批退役，旧 ui/stats-card 十页消费全部改道本件。
  { name: 'stats-card', file: 'semantic/stats-card.tsx', section: 'Semantic', status: 'canonical' },
  // 详情页语义化批（2026-10-02）：详情页主栏统一「可收缩分区」平铺件——收编 task/bug
  // 详情六处手写同构（描述/自定义字段/子任务/执行项/验收预览/依赖）。与 sidebar-panel
  // 同构不同形（平铺无卡底 vs 磨砂圆角卡），各自独立登记（裁决①）；标题档 text-xs（裁决②）。
  { name: 'detail-section', file: 'semantic/detail-section.tsx', section: 'Semantic', status: 'canonical' },
  // 详情页语义化批四（2026-10-02）：L2 详情页双栏母版——收编 task/bug/member/team 四页
  // 逐字重复骨架（PageShell+SubPageToolbar+主栏自滚动居中宽档+RightSidebar），侧栏二态
  // 内聚受控/非受控双模，主栏宽度走 page-shell 的 L1 总表分发（§20.2）。
  { name: 'detail-page-frame', file: 'semantic/detail-page-frame.tsx', section: 'Layout & Shells', status: 'canonical' },
  // 设置页语义组件批（2026-10-01，用户四裁决：scrubber 嵌吸顶卡第二行 / 新件先行 /
  // 毛玻璃卡+text-2xl / 三件+试点页）：settings-header 双态吸顶头（替代 PageHeader 在
  // 设置域的角色）、section-scrubber 栏目跳转（与 modules/document 的 chapter-scrubber
  // 刻度轨为不同组件，撞名裁决改名见组件头）、settings-section-card 栏目卡（与旧
  // section-card 并存，旧件另批评估归并——存量 24 消费文件不一次改写）。
  { name: 'settings-header', file: 'semantic/settings-header.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'section-scrubber', file: 'semantic/section-scrubber.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'settings-section-card', file: 'semantic/settings-section-card.tsx', section: 'Semantic', status: 'canonical' },
  // 补登记（2026-10-01 还债）：管理面统一批 3e46c283 三件漏登记（registry 对账当时只扫
  // ui 目录，semantic 层无「文件→必须注册」机查）；消费方 = 设置管理面各页，实测非 0。
  // status-definition-dialog 为受控表单弹窗（候选/回调由消费方注入），画廊以
  // StatusDefinitionList demo 间接覆盖，故豁免独立 demo。
  { name: 'definition-row', file: 'semantic/definition-row.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'status-definition-list', file: 'semantic/status-definition-list.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'status-definition-dialog', file: 'semantic/status-definition-dialog.tsx', section: 'Semantic', status: 'canonical', galleryExempt: '受控表单弹窗（候选/回调由消费方注入），画廊以 status-definition-list demo 间接覆盖' },
  // 设置页语义组件批二（2026-10-01）：sticky-save-bar 脏状态保存栏（收编设置域三种
  // 保存落点并存——页头 Save 钮/控件旁/卡底钮，GitHub/Vercel 惯例 sticky bottom 毛玻璃条）；
  // settings-field-row 左说明右控件字段行（收编 settings 域 10+ 处同构散写）。
  { name: 'sticky-save-bar', file: 'semantic/sticky-save-bar.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'settings-field-row', file: 'semantic/settings-field-row.tsx', section: 'Semantic', status: 'canonical' },

  // ── 跨模块业务组件：src/shared/components/ ───────────────────────────────
  { name: 'board-view', file: 'shared/components/board-view/board-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'bottom-dock', file: 'shared/components/bottom-dock/bottom-dock.tsx', section: 'App Components', status: 'canonical' },
  { name: 'dock-metric-badge', file: 'shared/components/bottom-dock/dock-metric-badge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'dock-prompt-bar', file: 'shared/components/bottom-dock/dock-prompt-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'dock-user-popover', file: 'shared/components/bottom-dock/dock-user-popover.tsx', section: 'App Components', status: 'canonical' },
  { name: 'cell-select', file: 'shared/components/cell-select.tsx', section: 'App Components', status: 'canonical' },
  { name: 'connection-banner', file: 'shared/components/connection-banner.tsx', section: 'App Components', status: 'canonical' },
  { name: 'acceptance-criteria-field', file: 'shared/components/create-dialog/acceptance-criteria-field.tsx', section: 'App Components', status: 'canonical' },
  { name: 'agent-presence-banner', file: 'shared/components/create-dialog/agent-presence-banner.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-source-tabs', file: 'shared/components/create-dialog/entity-templates/project-source-tabs.tsx', section: 'App Components', status: 'canonical' },
  { name: 'create-dialog/index', file: 'shared/components/create-dialog/index.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mode-shuttle-button', file: 'shared/components/create-dialog/mode-shuttle-button.tsx', section: 'App Components', status: 'canonical' },
  { name: 'property-pills-bar', file: 'shared/components/create-dialog/property-pills-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'suggestions-card', file: 'shared/components/create-dialog/suggestions-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'unified-create-dialog', file: 'shared/components/create-dialog/unified-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'emoji-picker', file: 'shared/components/emoji-picker/emoji-picker.tsx', section: 'App Components', status: 'canonical' },
  { name: 'favorite-toggle', file: 'shared/components/favorite-toggle.tsx', section: 'App Components', status: 'canonical' },
  { name: 'gantt-chart', file: 'shared/components/gantt-chart.tsx', section: 'App Components', status: 'canonical' },
  { name: 'global-create-dialog', file: 'shared/components/global-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-type-icon', file: 'shared/components/issue-type-icon.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-type-pill', file: 'shared/components/issue-type-pill.tsx', section: 'App Components', status: 'canonical' },
  { name: 'language-switcher', file: 'shared/components/language-switcher.tsx', section: 'App Components', status: 'canonical' },
  { name: 'markdown-editor', file: 'shared/components/markdown-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'markdown-live-editor', file: 'shared/components/markdown-live-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'markdown-view', file: 'shared/components/markdown-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'prompt-editor', file: 'shared/components/prompt-editor.tsx', section: 'App Components', status: 'canonical' },

  // ── 错位目录：src/shared/ui/（E7 清退候选） ───────────────────────────────

  // ── 模块专用组件：src/modules/*/components/ ──────────────────────────────
  { name: 'acceptance-draft-dialog', file: 'modules/acceptance/components/acceptance-draft-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'acceptance-form-dialog', file: 'modules/acceptance/components/acceptance-form-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'audit-report-panel', file: 'modules/acceptance/components/audit-report-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'activity-comment', file: 'modules/activity/components/activity-comment.tsx', section: 'App Components', status: 'canonical' },
  { name: 'activity-feed', file: 'modules/activity/components/activity-feed.tsx', section: 'App Components', status: 'canonical' },
  { name: 'comment-input', file: 'modules/activity/components/comment-input.tsx', section: 'App Components', status: 'canonical' },
  { name: 'reaction-bar', file: 'modules/activity/components/reaction-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'generated-password-dialog', file: 'modules/admin/components/generated-password-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'invite-create-dialog', file: 'modules/admin/components/invite-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'invites-section', file: 'modules/admin/components/invites-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'members-section', file: 'modules/admin/components/members-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'user-accounts-section', file: 'modules/admin/components/user-accounts-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'user-create-dialog', file: 'modules/admin/components/user-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'user-edit-dialog', file: 'modules/admin/components/user-edit-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'central-watch-dial', file: 'modules/ai-surface/components/central-watch-dial.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'decision-queue-panel', file: 'modules/ai-surface/components/decision-queue-panel.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'omni-dock', file: 'modules/ai-surface/components/omni-dock.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'pipeline-lane-strip', file: 'modules/ai-surface/components/pipeline-lane-strip.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'sample-tag', file: 'modules/ai-surface/components/sample-tag.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'screenplay-controls', file: 'modules/ai-surface/components/screenplay-controls.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'station-card', file: 'modules/ai-surface/components/station-card.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'surface-liveness', file: 'modules/ai-surface/components/surface-liveness.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'surface-narration-bar', file: 'modules/ai-surface/components/surface-narration-bar.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'watch-deck', file: 'modules/ai-surface/components/watch-deck.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'anchor-qa-thread', file: 'modules/assistant/components/anchor-qa-thread.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-colleague-slot', file: 'modules/assistant/components/assistant-colleague-slot.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-context-chip', file: 'modules/assistant/components/assistant-context-chip.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-decision-tab', file: 'modules/assistant/components/assistant-decision-tab.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-fab', file: 'modules/assistant/components/assistant-fab.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-history-menu', file: 'modules/assistant/components/assistant-history-menu.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-message-list', file: 'modules/assistant/components/assistant-message-list.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-opening-report', file: 'modules/assistant/components/assistant-opening-report.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-panel', file: 'modules/assistant/components/assistant-panel.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-quick-prompts', file: 'modules/assistant/components/assistant-quick-prompts.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-run-line', file: 'modules/assistant/components/assistant-run-line.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-status-dot', file: 'modules/assistant/components/assistant-status-dot.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'assistant-tool-card', file: 'modules/assistant/components/assistant-tool-card.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'admin-guard', file: 'modules/auth/components/admin-guard.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-guard', file: 'modules/auth/components/auth-guard.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-shell', file: 'modules/auth/components/auth-shell.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-visual-card', file: 'modules/auth/components/auth-visual-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-visual', file: 'modules/auth/components/auth-visual.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-card', file: 'modules/auth/components/member-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'server-config-dialog', file: 'modules/auth/components/server-config-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'blueprint-canvas', file: 'modules/auth/components/visuals/blueprint-canvas.tsx', section: 'App Components', status: 'canonical' },
  { name: 'prism-canvas', file: 'modules/auth/components/visuals/prism-canvas.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-checklist', file: 'modules/boot/components/boot-checklist.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-error-drawer', file: 'modules/boot/components/boot-error-drawer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-progress-bar', file: 'modules/boot/components/boot-progress-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-toggle', file: 'modules/boot/components/boot-toggle.tsx', section: 'App Components', status: 'canonical' },
  { name: 'contract-bindings-panel', file: 'modules/contract/components/contract-bindings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'role-manager', file: 'modules/core-config/components/role-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'status-manager', file: 'modules/core-config/components/status-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'tag-manager', file: 'modules/core-config/components/tag-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'template-manager', file: 'modules/core-config/components/template-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'decision-review-modal', file: 'shared/decision-card/decision-review-modal.tsx', section: 'App Components', status: 'canonical' },
  { name: 'decomposition-review-panel', file: 'modules/decision/components/decomposition-review-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'BackendStatusBadge', file: 'modules/desktop/components/BackendStatusBadge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'desktop-gate', file: 'modules/desktop/components/desktop-gate.tsx', section: 'App Components', status: 'canonical' },
  { name: 'desktop-log-card', file: 'modules/desktop/components/desktop-log-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'desktop-preferences-card', file: 'modules/desktop/components/desktop-preferences-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'process-monitor-card', file: 'modules/desktop/components/process-monitor-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'approval-dialog', file: 'modules/document/components/approval-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'document-properties-panel', file: 'modules/document/components/document-properties-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'document-task-links', file: 'modules/document/components/document-task-links.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mdx-editor', file: 'modules/document/components/mdx-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mdx-renderer', file: 'modules/document/components/mdx-renderer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mdx-toolbar', file: 'modules/document/components/mdx-toolbar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'revision-impact-banner', file: 'modules/document/components/revision-impact-banner.tsx', section: 'App Components', status: 'canonical' },
  { name: 'section-navigation', file: 'modules/document/components/section-navigation.tsx', section: 'App Components', status: 'canonical' },
  { name: 'section-task-links-list', file: 'modules/document/components/section-task-links-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-picker-dialog', file: 'modules/document/components/task-picker-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'version-diff-view', file: 'modules/document/components/version-diff-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'version-history-panel', file: 'modules/document/components/version-history-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-details-dialog', file: 'modules/executions/components/run-details-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-diagnosis-section', file: 'modules/executions/components/run-diagnosis-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-event-list', file: 'modules/executions/components/run-event-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-info-panel', file: 'modules/executions/components/run-info-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-overview-card', file: 'modules/executions/components/run-overview-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-status', file: 'modules/executions/components/run-status.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-timeline', file: 'modules/executions/components/run-timeline.tsx', section: 'App Components', status: 'canonical' },
  { name: 'step-detail-panel', file: 'modules/executions/components/step-detail-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'bind-repository-dialog', file: 'modules/git/components/bind-repository-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'branch-list', file: 'modules/git/components/branch-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'commit-list', file: 'modules/git/components/commit-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'diff-viewer', file: 'modules/git/components/diff-viewer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'git-command-panel', file: 'modules/git/components/git-command-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'git-tool-status', file: 'modules/git/components/git-tool-status.tsx', section: 'App Components', status: 'canonical' },
  { name: 'pull-request-card', file: 'modules/git/components/pull-request-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'pull-request-list', file: 'modules/git/components/pull-request-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'repository-list', file: 'modules/git/components/repository-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workspace-config', file: 'modules/git/components/workspace-config.tsx', section: 'App Components', status: 'canonical' },
  { name: 'github-config-form', file: 'modules/github/components/github-config-form.tsx', section: 'App Components', status: 'canonical' },
  { name: 'github-panel', file: 'modules/github/components/github-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'github-setup-card', file: 'modules/github/components/github-setup-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'analysis-draft-dialog', file: 'modules/intake/components/analysis-draft-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'pipeline-overview-cards', file: 'modules/intake/components/pipeline-overview-cards.tsx', section: 'App Components', status: 'canonical' },
  { name: 'readiness-dialog', file: 'modules/intake/components/readiness-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'acceptance-criteria-preview', file: 'modules/issue/components/acceptance-criteria-preview.tsx', section: 'App Components', status: 'canonical' },
  { name: 'ai-assign-dialog', file: 'modules/issue/components/ai-assign-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'batch-update-issues-dialog', file: 'modules/issue/components/batch-update-issues-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'board-presets', file: 'modules/issue/components/board-presets.tsx', section: 'App Components', status: 'canonical' },
  { name: 'bug-simple-list', file: 'modules/issue/components/bug-simple-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'cell-editors', file: 'modules/issue/components/cell-editors.tsx', section: 'App Components', status: 'canonical' },
  { name: 'completion-review', file: 'modules/issue/components/completion-review.tsx', section: 'App Components', status: 'canonical' },
  { name: 'custom-field-input', file: 'modules/issue/components/custom-field-input.tsx', section: 'App Components', status: 'canonical' },
  { name: 'execution-items-panel', file: 'modules/issue/components/execution-items-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'global-task-export-dialog', file: 'modules/issue/components/global-task-export-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-dependencies-section', file: 'modules/issue/components/issue-dependencies-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-type-switcher', file: 'modules/issue/components/issue-type-switcher.tsx', section: 'App Components', status: 'canonical' },
  { name: 'iteration-detail-dialog', file: 'modules/issue/components/iteration-detail-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'iteration-form-dialog', file: 'modules/issue/components/iteration-form-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-gantt', file: 'modules/issue/components/task-gantt.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-import-export', file: 'modules/issue/components/task-import-export.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-prompt-panel', file: 'modules/issue/components/task-prompt-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-simple-list', file: 'modules/issue/components/task-simple-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-table-view', file: 'modules/issue/components/task-table-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-config-form', file: 'modules/linear/components/linear-config-form.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-conflict-resolver', file: 'modules/linear/components/linear-conflict-resolver.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-projects-table', file: 'modules/linear/components/linear-projects-table.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-provider-card', file: 'modules/linear/components/linear-provider-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-status-badge', file: 'modules/linear/components/linear-status-badge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-sync-log-drawer', file: 'modules/linear/components/linear-sync-log-drawer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-sync-log', file: 'modules/linear/components/linear-sync-log.tsx', section: 'App Components', status: 'canonical' },
  { name: 'sync-progress-dialog', file: 'modules/linear/components/sync-progress-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-linear-panel', file: 'modules/linear/components/task-linear-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'inbox-item-row', file: 'modules/notification/components/inbox-item-row.tsx', section: 'App Components', status: 'canonical' },
  { name: 'notification-settings-dialog', file: 'modules/notification/components/notification-settings-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'agent-handoff-card', file: 'modules/office/components/agent-handoff-card.tsx', section: 'App Components', status: 'standby' },
  { name: 'collaboration-section', file: 'modules/office/components/collaboration-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'colleague-card', file: 'modules/office/components/colleague-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'onboarding-gate', file: 'modules/onboarding/components/onboarding-gate.tsx', section: 'App Components', status: 'canonical' },
  { name: 'api-doc-links-manager', file: 'modules/project/components/api-doc-links-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'ai-insight-card', file: 'modules/project/components/dashboard/ai-insight-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'integration-status-strip', file: 'modules/project/components/dashboard/integration-status-strip.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-detail-frame', file: 'modules/project/components/dashboard/project-detail-frame.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-detail-header-card', file: 'modules/project/components/dashboard/project-detail-header-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-detail-nav', file: 'modules/project/components/dashboard/project-detail-nav.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-health-score-dialog', file: 'modules/project/components/dashboard/project-health-score-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-overview-charts', file: 'modules/project/components/dashboard/project-overview-charts.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-right-sidebar', file: 'modules/project/components/dashboard/project-right-sidebar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-sidebar-context', file: 'modules/project/components/dashboard/project-sidebar-context.tsx', section: 'App Components', status: 'canonical' },
  { name: 'doc-links-manager', file: 'modules/project/components/doc-links-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'external-links-manager', file: 'modules/project/components/external-links-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'grill-interview', file: 'modules/project/components/grill/grill-interview.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-entry-wizard', file: 'modules/project/components/import/project-entry-wizard.tsx', section: 'App Components', status: 'canonical' },
  { name: 'interview-chat', file: 'modules/project/components/playbook/interview-chat.tsx', section: 'App Components', status: 'canonical' },
  { name: 'interview-dialog', file: 'modules/project/components/playbook/interview-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-atom-card', file: 'modules/project/components/profile/profile-atom-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-completeness-ring', file: 'modules/project/components/profile/profile-completeness-ring.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-health-chips', file: 'modules/project/components/profile/profile-health-chips.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-slot-section', file: 'modules/project/components/profile/profile-slot-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-board', file: 'modules/project/components/project-board.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-cell-editors', file: 'modules/project/components/project-cell-editors.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-gantt', file: 'modules/project/components/project-gantt.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-linear-sync-status', file: 'modules/project/components/project-linear-sync-status.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-property-panel', file: 'modules/project/components/project-property-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-simple-list', file: 'modules/project/components/project-simple-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-team-bindings', file: 'modules/project/components/project-team-bindings.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-playbook-settings-panel', file: 'modules/project/components/settings/project-playbook-settings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-prompt-settings-panel', file: 'modules/project/components/settings/project-prompt-settings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-team-settings-panel', file: 'modules/project/components/settings/project-team-settings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-roles-section', file: 'modules/project-role/components/project-roles-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'template-picker-dialog', file: 'modules/prompt/components/template-picker-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'release-deliverables-card', file: 'modules/release/components/release-deliverables-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'release-trace-section', file: 'modules/release/components/release-trace-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mcp-tab', file: 'modules/settings/components/ai/mcp-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'models-tab', file: 'modules/settings/components/ai/models-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'overview-tab', file: 'modules/settings/components/ai/overview-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'provider-visuals', file: 'modules/settings/components/ai/provider-visuals.tsx', section: 'App Components', status: 'canonical' },
  { name: 'skills-tab', file: 'modules/settings/components/ai/skills-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'tools-tab', file: 'modules/settings/components/ai/tools-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'storage-settings', file: 'modules/settings/components/storage-settings.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-avatar', file: 'modules/team-member/components/member-avatar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-card-popover', file: 'modules/team-member/components/member-card-popover.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-card-team', file: 'modules/team-member/components/member-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-chip', file: 'modules/team-member/components/member-chip.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-create-dialog', file: 'modules/team-member/components/member-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-list', file: 'modules/team-member/components/member-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-picker', file: 'modules/team-member/components/member-picker.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-tool-grants', file: 'modules/team-member/components/member-tool-grants.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mention-renderer', file: 'modules/team-member/components/mention-renderer.tsx', section: 'App Components', status: 'standby' },
  { name: 'mention-textarea', file: 'modules/team-member/components/mention-textarea.tsx', section: 'App Components', status: 'standby' },
  { name: 'team-card', file: 'modules/team-member/components/team-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-create-dialog', file: 'modules/team-member/components/team-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-hierarchy-section', file: 'modules/team-member/components/team-hierarchy-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-list', file: 'modules/team-member/components/team-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-prompt-section', file: 'modules/team-member/components/team-prompt-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-stats-section', file: 'modules/team-member/components/team-stats-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'trust-level-badge', file: 'modules/team-member/components/trust-level-badge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-canvas', file: 'modules/workflow/components/workflow-canvas.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-node-palette', file: 'modules/workflow/components/workflow-node-palette.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-run-panel', file: 'modules/workflow/components/workflow-run-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-run-timeline', file: 'modules/workflow/components/workflow-run-timeline.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-step-editor', file: 'modules/workflow/components/workflow-step-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-trigger-dialog', file: 'modules/workflow/components/workflow-trigger-dialog.tsx', section: 'App Components', status: 'canonical' },
]

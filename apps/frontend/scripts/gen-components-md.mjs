#!/usr/bin/env node
/**
 * COMPONENTS.md 再生器 —— 单向：src/modules/design-system/registry.ts → COMPONENTS.md
 *
 * 用法：node scripts/gen-components-md.mjs
 *   （尚未登记为 package.json script —— 本批禁止改动 package.json；建议后续补
 *    `"gen:components": "node scripts/gen-components-md.mjs"`）
 *
 * 设计约束（E 类方案 §5.2「三处同源」第①条）：
 * - COMPONENTS.md 为**再生产物**，禁止手工编辑组件清单；要改清单请改 registry.ts 后重跑本脚本。
 * - 路径一律渲染为 `src/...` 全路径：这样既满足 check-component-registry.mjs 的
 *   「每个 src/components/ui/*.tsx 必须出现为 ui/<file>.tsx」双向对账，也与仓库其它文档口径一致。
 * - 路径一律**直写**，不做任何规避性拆段。历史上 `src/shared/ui/filter-panel.tsx` 的路径天然含有
 *   `ui/<file>.tsx` 子串，会被 check-component-registry.mjs 的全库正则误判为「引用了不存在的
 *   ui 组件」，曾用「拆成两个代码片段」绕过；2026-09-27 已改为在**校验脚本侧**加负向后顾
 *   `(?<!shared/)` 锚定，文档侧恢复自然写法。
 *
 * 同源链的另外两环（本脚本不负责）：
 *   ② registry.ts ──渲染──► design-system 页（按 section 遍历，覆盖率恒 100%）
 *   ③ registry.ts ──校验──► lint:registry（扫真实引用回填 consumers，判定 §19.3 的 LU）
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 根目录锚定「脚本自身位置」而非 process.cwd()：与 check-component-registry.mjs 同因
// （脚本有 `pnpm --filter frontend run ...` 与 lint-staged 两条调用路径）。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = join(PKG_ROOT, "src", "modules", "design-system", "registry.ts");
const DOC = join(PKG_ROOT, "COMPONENTS.md");

// ---------------------------------------------------------------------------
// ① 解析 registry.ts 的字面量条目（严格单行格式，见 registry.ts 文件头）
// ---------------------------------------------------------------------------
const ENTRY_RE =
  /^\s*\{ name: '([^']+)', file: '([^']+)', section: '([^']+)', status: '([^']+)'(?:, reviewBy: '([^']+)')?(?:, expiresAt: '([^']+)')?(?:, review: \{ pending: true, reason: '([^']+)', proposal: '([^']+)'(?:, target: '([^']+)')? \})? \},?$/;

const src = readFileSync(REGISTRY, "utf8");
const entries = [];
for (const line of src.split(/\r?\n/)) {
  const m = line.match(ENTRY_RE);
  if (!m) continue;
  entries.push({
    name: m[1],
    file: m[2],
    section: m[3],
    status: m[4],
    reviewBy: m[5],
    expiresAt: m[6],
    reason: m[7],
    proposal: m[8],
    target: m[9],
  });
}
if (entries.length === 0) {
  console.error(
    `gen-components-md: 未能从 ${REGISTRY} 解析出任何条目——请检查条目是否为单行字面量格式。`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// ② 渲染辅助
// ---------------------------------------------------------------------------
const SECTION_ORDER = ["Tokens", "Primitives", "App Components", "AI Execution"];
const LAYER_OF = (file) => {
  if (file.startsWith("ui/")) return "ui";
  if (file.startsWith("shared/ui/")) return "shared-ui";
  if (file.startsWith("shared/")) return "shared";
  return "module";
};
const LAYER_LABEL = {
  ui: "UI 原子层 `src/components/ui/`",
  "shared-ui": "错位目录 `src/shared/ui/`（E7 清退候选）",
  shared: "跨模块业务组件 `src/shared/components/`",
  module: "模块专用组件 `src/modules/*/components/`",
};
const LAYER_ORDER = ["ui", "shared-ui", "shared", "module"];

const STATUS_MARK = {
  canonical: "✅ canonical",
  standby: "📦 standby",
  internal: "🔒 internal",
  review: "🔶 review",
  deprecated: "⛔ deprecated",
};

/** registry 的 file 是 src 相对路径；ui 层以 `ui/` 简写存储 → 统一补成 `src/components/ui/` */
function fullPath(file) {
  if (file.startsWith("ui/")) return `src/components/${file}`;
  return `src/${file}`;
}
/** 路径列渲染：一律直写全路径。非 components/ui 的 `ui/` 路径由校验脚本的正则锚点排除。 */
function renderPath(file) {
  return "`" + fullPath(file) + "`";
}
function esc(s) {
  return String(s).replace(/\|/g, "\\|");
}
/** `expiresAt`（§19.6 清退期限）渲染后缀：两处表格的说明列共用，保证机器槽位**可见**。 */
function expNote(e) {
  return e.expiresAt ? `（**清退期限 ${e.expiresAt}** · §19.6，逾期 CI 失败）` : "";
}

const lines = [];
const push = (s = "") => lines.push(s);

// ---------------------------------------------------------------------------
// ③ 文档头
// ---------------------------------------------------------------------------
const counts = {};
for (const e of entries) counts[e.status] = (counts[e.status] || 0) + 1;
// 待裁决 = review 态，或 standby 态但带 review 数据（§七 D 项「先标记不删」集合）
const reviewList = entries.filter(
  (e) => e.status === "review" || ((e.status === "standby" || e.status === "deprecated") && e.reason)
);
const bySection = new Map();
for (const e of entries) {
  if (!bySection.has(e.section)) bySection.set(e.section, []);
  bySection.get(e.section).push(e);
}

push("# COMPONENTS.md — 前端组件清单（agent 与人的共用索引）");
push();
push("> **⚠️ 本文件由 `src/modules/design-system/registry.ts` 再生，请勿手工编辑。**");
push("> 再生命令：`node scripts/gen-components-md.mjs`（在 `apps/frontend/` 下执行）。");
push("> 要增删改组件条目 → 改 `registry.ts` → 重跑上面这条命令；`lint:registry` 会校验双向对账。");
push();
push("> **用途**：开发页面前的第一入口。任何页面开发/改造前先查此表，优先复用；**新增 `components/ui/` 组件必须先登记**（登记表 = registry.ts）。");
push("> **设计宪法**：样式规则最高依据是 `docs/design/PRINCIPLES.md`——分区策略、语义字阶、间距 4px 网格、语义色、阴影档、lucide 唯一 UI 图标、动效白名单、三态 token。本表管「有哪些组件」，宪法管「怎么用」。");
push("> **导入方式**：按文件路径直接导入（如 `@/components/ui/button`），不使用 barrel。");
push("> **展示预览**：`/app/design-system`（dev-only）可查看组件实际效果，并正在改造为「对账面 + 裁决面」（registry 驱动渲染）。");
push("> **消费方列**：本表不写推测值——`consumers` 由 `lint:registry` 扫描真实引用后回填 registry，再经本脚本再生。空 `—` = 待回填。");
push();
push("## 治理计数（registry 派生）");
push();
push("| 状态 | 数量 | 计入 LU 分母 | 必须在画廊展示 | 是否需消费方 |");
push("|---|---|---|---|---|");
const STATUS_RULE = {
  canonical: ["✅ 计入", "✅ 必须", "✅ 必须 ≥1"],
  standby: ["❌ 不计", "✅ 必须", "❌ 不要求"],
  internal: ["❌ 不计", "❌ 免", "—"],
  review: ["❌ 暂不计", "✅ 必须（带醒目标记）", "❌ 暂不要求"],
  deprecated: ["❌ 不计", "✅ 标记 deprecated", "—"],
};
for (const s of ["canonical", "standby", "internal", "review", "deprecated"]) {
  if (!counts[s]) continue;
  const [lu, gallery, consumer] = STATUS_RULE[s];
  push(`| ${STATUS_MARK[s]} | ${counts[s]} | ${lu} | ${gallery} | ${consumer} |`);
}
push(`| **合计** | **${entries.length}** | | | |`);
push();
const zeroStatuses = ["internal", "deprecated"].filter((s) => !counts[s]);
if (zeroStatuses.length) {
  push(
    `> 当前 0 条的状态：${zeroStatuses.map((s) => `\`${s}\``).join(" / ")}。` +
      "注：`ui/menu-surface.ts` 实测有模块层消费方（document 模块页面直接 import 其中的常量），" +
      "故按实测登记为 `canonical` 而非方案 §三 E6 建议的 `internal`（差异见批 1 报告）。"
  );
  push();
}
push("分区分布（画廊四分区口径）：");
push();
push("| 分区 | 数量 |");
push("|---|---|");
for (const s of SECTION_ORDER) {
  const n = (bySection.get(s) || []).length;
  if (n) push(`| ${s} | ${n} |`);
}
for (const [s, list] of bySection) {
  if (!SECTION_ORDER.includes(s)) push(`| ${s} | ${list.length} |`);
}
push();

// ---------------------------------------------------------------------------
// ④ 裁决清单（对账面：所有待人工裁决的条目）
// ---------------------------------------------------------------------------
push("## 待裁决清单（设计系统页「只看待裁决」视图同源）");
push();
push(
  `共 **${reviewList.length}** 项：\`status: review\`（${counts.review || 0}）或 \`status: standby\` 但带 review 数据（${reviewList.length - (counts.review || 0)}）。` +
    "按方案 §七 D 项裁决：**先标记、不删除**，人工在 `/app/design-system` 审阅后由批 9 执行清退（决策写入 `component-review-decisions.json`）。"
);
push();
push("| 组件 | 路径 | 状态 | 建议 | 理由 | 裁决期限 |");
push("|---|---|---|---|---|---|");
for (const e of reviewList) {
  push(
    `| ${esc(e.name)} | ${renderPath(e.file)} | ${STATUS_MARK[e.status]} | ${e.proposal || "—"}${
      e.target ? ` → ${e.target}` : ""
    } | ${esc(e.reason)}${expNote(e)} | ${e.reviewBy || "—"} |`
  );
}
push();

// ---------------------------------------------------------------------------
// ⑤ 完整清单（按分区 → 层）
// ---------------------------------------------------------------------------
push("## 完整清单");
push();
const sectionsToRender = [
  ...SECTION_ORDER.filter((s) => bySection.has(s)),
  ...[...bySection.keys()].filter((s) => !SECTION_ORDER.includes(s)),
];
for (const section of sectionsToRender) {
  const list = bySection.get(section);
  push(`### ${section}（${list.length}）`);
  push();
  for (const layer of LAYER_ORDER) {
    const sub = list.filter((e) => LAYER_OF(e.file) === layer);
    if (!sub.length) continue;
    push(`#### ${LAYER_LABEL[layer]}（${sub.length}）`);
    push();
    push("| 组件 | 路径 | 状态 | 消费方 | 治理说明 |");
    push("|---|---|---|---|---|");
    for (const e of sub) {
      push(
        `| ${esc(e.name)} | ${renderPath(e.file)} | ${STATUS_MARK[e.status]} | — | ${esc(
          e.reason || "—"
        )}${expNote(e)} |`
      );
    }
    push();
  }
}

// ---------------------------------------------------------------------------
// ⑥ 附录：脚本常量区（非 registry 派生，人工维护）
//    —— 保留原 COMPONENTS.md 中最具操作价值的两段参考；其余历史篇幅见 git 历史。
// ---------------------------------------------------------------------------
push("---");
push();
push("## 附录 A · 页面骨架速查（人工维护常量，非 registry 派生）");
push();
push("| 场景 | 用什么 |");
push("|------|--------|");
for (const [k, v] of [
  ["页面外壳", "`PageShell`（含 PageHeader）或手动 `PageHeader`"],
  ["页头操作", "`HeaderActionButton`（唯一合法形态，圆形图标 hover 展开胶囊）"],
  ["统计卡", "`StatsCard`（多项网格）+ `QuickCardsToggle`（页头显隐开关）"],
  ["列表页工具栏", "`ToolbarRow` + `useToolbarViews`（视图快照持久化）"],
  ["详情页工具栏", "`SubPageToolbar`（返回/面包屑/居中页签/翻页器/侧栏开关）"],
  ["详情右栏", "`RightSidebar` + `SidebarButtonGroup` + `PropsCard`/`PropertyRow`/`CapsuleSelect`"],
  ["列表内容", "`DataList`（多选/分组/右键菜单）或 `Table` 套件 + `DataTableShell`"],
  ["三态处理", "`AsyncState`（加载/空/错误）或 `PageLoader` / `EmptyState`"],
  ["弹窗", "`Dialog` 套件；创建类用 `UnifiedCreateDialog`"],
  ["反馈", "`toast()` + `ToastProvider`（唯一合法 toast）/ `useConfirm` / `Alert`"],
  ["状态统一视觉", "`status-visuals`（shared/status/）：业务状态 → tone+图标+i18n 的唯一映射源（§19.5 分层：业务层管 status→tone，视觉层管 tone→class）"],
  ["状态图标底框", "`StatusIconFrame`（shared/status/）：tone 浅底 + 圆角框 + 居中图标，与 status-visuals 配套"],
  ["工单类型胶囊", "`IssueTypePill`（shared/components/）：pill=图标+类型名+浅色底、frame=图标圆框"],
  ["实体图标注册表", "`EntityIcon`/`getEntityIcon`（shared/entity-icons/）：实体→图标+语义 tone 的唯一映射"],
  ["Markdown 渲染/编辑", "`MarkdownView` / `MarkdownEditor` / `MarkdownLiveEditor`（shared/components/）"],
  ["全局实体引用", "`SlashRefTextarea`（shared/entity-ref/）：`/` 触发补全；渲染侧 `ApmRefLink`"],
  ["提示词编辑/查看", "`PromptEditor`（shared/components/）"],
  ["决策卡/收件箱", "`DecisionCard`/`DecisionCardShell`（shared/decision-card/）"],
  ["主 AI 助手", "`AssistantPanel` 等（modules/assistant/components/）"],
  ["局部侵入问答", "`AISlotLayer`（shared/ai-slot/）+ `useCardExplain`"],
  ["工作流运行面板", "`WorkflowRunPanel`/`WorkflowRunTimeline`/`buildRunView`（modules/workflow/）"],
]) {
  push(`| ${k} | ${v} |`);
}
push();
push("## 附录 B · 契约备忘（人工维护常量）");
push();
push(
  "- **Select label 契约（2026-09-11）**：base-ui `Select.Value` 只在 Root 收到 `items` 时才能把 value 映射成 label，否则回退 `String(value)`。用 `Select` 裸件且 value ≠ 展示文本时**必须传 `items`**（`{value,label}[]` 或 Record），或改用 `SelectValue` 函数式 children；哨兵项也要写进 `items`。"
);
push(
  "- **组件准入（§19.6）**：新增 `components/ui/` 组件必须 ① 过 `lint:duplicate`（无同名/近义件）② registry.ts 已登记 ③ 画廊已收录 ④ 有真实消费方或登记为 `standby` ⑤ 外部注册表来源需注明。"
);
push(
  "- **禁止裸组件（§19.2）**：`components/ui/` 之外禁止 `<button>` `<input>` `<select>` `<textarea>` `<label>` `<table>` `<img>`（站内跳转禁用裸 `<a>`）；豁免走 `design-governance.allowlist.json`（必填 `expiresAt`，最长 90 天）。"
);
push(
  "- **变体优先（§19.4）**：同一 UI 能力出现第二处实现 → 统一组件 + 新增变体；禁止复制源码（D1）、`className` 视觉覆盖（D2）、包裹改写（D3）。`size` 全库统一 `xs/sm/md/lg` 四档。"
);
push(
  "- **门禁命令**：`pnpm --filter frontend lint:registry`（本表双向对账）/ `lint:ui-governance` / `check-palette` / `check-icons`。"
);
push();

writeFileSync(DOC, lines.join("\n"), "utf8");
console.log(
  `gen-components-md: 已再生 ${DOC}（${entries.length} 个组件条目，待裁决 ${reviewList.length} 项）。`
);

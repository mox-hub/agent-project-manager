import { readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:*`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ROOT = PKG_ROOT;

// ---- 页面型文件 = glob 派生（批 7a，2026-09-27）----
// 原实现是硬编码 4 个 `CORE_PAGES`（覆盖率 4/51 = 7.8%）：新增页面不会被自动纳入，
// 而 `data-ai-page` 是产品的核心差异化能力（AI 执行面靠它判断「我在哪」），
// 覆盖率靠人手维护清单必然腐化。现改为 glob `src/**/*-page.tsx`（排除测试文件），
// 与下方三条**全库规则**（禁 `sonner` / 裸 `confirm` / 裸 `<table>`）同一实现范式。
// 口径来源：宪法 §12.2「所有 `src/**/*-page.tsx` 的最外层容器必须声明 `data-ai-page`」。
const PAGE_FILE_RE = /-page\.tsx$/;
const TEST_FILE_RE = /\.(spec|test)\.(ts|tsx)$/;

// 每条规则各自持有 allowlist（per-rule），互不牵连——「豁免 shadow 不等于豁免 motion」。

// D6 声明缺口过渡口：声明缺失本应直接补代码，这里只在「已评估、暂缓」时登记。
// §2.0 补齐 error-page 后应为空（实测 51/51）。
const AI_PAGE_LEGACY_ALLOWLIST = new Set([]);

// D6 action 埋点缺口（批 7a 扩面后新暴露的存量）：原规则只覆盖 4 页，故一直没暴露。
// 这 29 页**一个 `data-ai-action` 都没有**——不是「豁免」，是**未埋点**。
// 本批不改页面行为（红线：不删组件、不做裁决），先登记为过渡余额，
// 逐个见 docs/design 批 7 台账；补埋点是 D6 §12.2 的后续工作。
const AI_ACTION_LEGACY_ALLOWLIST = new Set([
  "src/modules/acceptance/pages/acceptance-detail-page.tsx",
  "src/modules/admin/pages/admin-page.tsx",
  "src/modules/auth/pages/invite-page.tsx",
  "src/modules/auth/pages/login-page.tsx",
  "src/modules/auth/pages/register-page.tsx",
  "src/modules/auth/pages/welcome-page.tsx",
  "src/modules/boot/pages/boot-page.tsx",
  "src/modules/design-system/pages/design-system-page.tsx",
  "src/modules/desktop/pages/desktop-init-page.tsx",
  "src/modules/document/pages/document-edit-page.tsx",
  "src/modules/document/pages/document-new-page.tsx",
  "src/modules/document/pages/document-view-page.tsx",
  "src/modules/executions/pages/executions-page.tsx",
  "src/modules/git/pages/repository-detail-page.tsx",
  "src/modules/git/pages/repository-settings-page.tsx",
  "src/modules/help/pages/help-page.tsx",
  "src/modules/intake/pages/requirement-intake-page.tsx",
  "src/modules/issue/pages/bug-detail-page.tsx",
  "src/modules/issue/pages/bugs-page.tsx",
  "src/modules/notification/pages/notification-center-page.tsx",
  "src/modules/office/pages/office-page.tsx",
  "src/modules/project/pages/dashboard-page.tsx",
  "src/modules/project/pages/project-playbook-page.tsx",
  "src/modules/project/pages/project-tasks-page.tsx",
  "src/modules/release/pages/release-detail-page.tsx",
  "src/modules/release/pages/release-list-page.tsx",
  "src/modules/team-member/pages/member-detail-page.tsx",
  "src/modules/team-member/pages/team-detail-page.tsx",
  "src/shared/pages/error-page.tsx",
]);

// overlay（dialog/drawer/sheet）直进页面需逐个审批：页面级弹层应由页面自己拥有语义，
// 不受控地 import 会让弹层归属与卸载时机失控。批 7a 扩面后新暴露 10 页存量
// （原规则只查 4 页，故从未被发现）——它们是既有的、合法的详情页/配置页用法，
// 本批只登记不改造（红线：不做裁决）。
const OVERLAY_ALLOWLIST = new Set([
  "src/modules/project/pages/project-list-page.tsx",
  "src/modules/acceptance/pages/acceptance-detail-page.tsx",
  "src/modules/design-system/pages/design-system-page.tsx",
  "src/modules/issue/pages/bug-detail-page.tsx",
  "src/modules/issue/pages/task-detail-page.tsx",
  "src/modules/notification/pages/notification-center-page.tsx",
  "src/modules/project/pages/dashboard-page.tsx",
  "src/modules/project/pages/project-playbook-page.tsx",
  "src/modules/project/pages/project-profile-page.tsx",
  "src/modules/release/pages/release-list-page.tsx",
  "src/modules/workflow/pages/workflow-list-page.tsx",
  // F3.6 表单迁移⑨（931b4e27）把 project-settings 编辑表单迁入 Dialog 时漏登记，2026-09-29 补录
  "src/modules/project/pages/project-settings-page.tsx",
]);

// 动态色值白名单（页面内 `style={{ ... #hex }}`）：扩面后实测 0 命中
// （相关页面的字面量已由 check-palette.mjs 的 C3 全库规则接手），保留机制以备回归。
const DYNAMIC_COLOR_ALLOWLIST = new Set([
  "src/modules/issue/pages/tasks-page.tsx",
  "src/modules/issue/pages/bugs-page.tsx",
]);

const errors = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const relFromRoot = (abs) => relative(ROOT, abs).split(sep).join("/");

const sourceFiles = walk(join(ROOT, "src"));

// 页面型文件（glob 派生）。**空集视为脚本失效**而非「全部通过」——宁可直接报错，
// 也不要因为路径/命名变动导致门禁静默放行（教训：扫空目录会返回 0 退出）。
const pageFiles = sourceFiles
  .filter((abs) => PAGE_FILE_RE.test(abs) && !TEST_FILE_RE.test(relFromRoot(abs)))
  .map(relFromRoot)
  .sort();

if (pageFiles.length === 0) {
  console.error("UI governance check failed:\n- 页面型文件 glob 命中 0 个，疑似扫描失效，请检查 src/**/*-page.tsx");
  process.exit(1);
}

for (const file of pageFiles) {
  const abs = join(ROOT, file);
  const text = readFileSync(abs, "utf8");

  if (
    !text.includes("data-ai-page=") &&
    !text.includes("aiPage=") &&
    !text.includes("aiPage={") &&
    !AI_PAGE_LEGACY_ALLOWLIST.has(file)
  ) {
    errors.push(`${file}: missing data-ai-page/aiPage declaration`);
  }

  if (!text.includes("data-ai-action=") && !AI_ACTION_LEGACY_ALLOWLIST.has(file)) {
    errors.push(`${file}: missing data-ai-action markers on interactive elements`);
  }

  const hasOverlayImport = /from ['"]@\/components\/ui\/dialog['"]/.test(text)
    || /from ['"]@\/components\/ui\/drawer['"]/.test(text)
    || /from ['"]@\/components\/ui\/sheet['"]/.test(text);

  if (hasOverlayImport && !OVERLAY_ALLOWLIST.has(file)) {
    errors.push(`${file}: overlay import requires allowlist approval`);
  }

  if (/style=\{\{[^}]*#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/s.test(text)) {
    if (!DYNAMIC_COLOR_ALLOWLIST.has(file)) {
      errors.push(`${file}: contains inline style hex color; use semantic tokens`);
    }
  }
}

for (const abs of sourceFiles) {
  const relative = relFromRoot(abs);
  if (relative === "src/components/ui/toast.tsx") {
    continue;
  }
  const text = readFileSync(abs, "utf8");

  if (/from ['"]sonner['"]/.test(text)) {
    errors.push(`${relative}: sonner 已删除（2026-08 coss toast 迁移），统一使用 @/components/ui/toast`);
  }

  if (/\bwindow\.confirm\(/.test(text) || /\bconfirm\(/.test(text)) {
    if (!relative.includes("shared/confirm")) {
      errors.push(`${relative}: 禁止直接使用 confirm/window.confirm，请改用 useConfirm`);
    }
  }

  if (
    /<table[\s>]/.test(text) &&
    !relative.includes("components/ui/table.tsx") &&
    !relative.includes("shared/mdx/components/") &&
    // 测试文件中的 HTML 标签是断言文本/fixture（如 markdown 保真测试），
    // 不是 UI 实现
    !TEST_FILE_RE.test(relative)
  ) {
    errors.push(`${relative}: 禁止直接使用原生 <table>，请使用 @/components/ui/table primitives`);
  }
}

if (errors.length > 0) {
  console.error(
    "UI governance check failed:\n" + errors.map((item) => `- ${item}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `UI governance check passed.（页面型文件 glob 覆盖 ${pageFiles.length} 个）`,
);

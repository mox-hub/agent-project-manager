import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readdirSync, statSync } from "node:fs";

const ROOT = process.cwd();

const CORE_PAGES = [
  "src/modules/project/pages/project-list-page.tsx",
  "src/modules/project/pages/project-dashboard-page.tsx",
  "src/modules/task/pages/task-page.tsx",
  "src/modules/task/pages/tasks-page.tsx",
  "src/modules/ai-hub/pages/ai-management-page.tsx",
  "src/modules/settings/pages/settings-page.tsx",
];

const OVERLAY_ALLOWLIST = new Set([
  "src/modules/project/pages/project-list-page.tsx",
]);

const DYNAMIC_COLOR_ALLOWLIST = new Set([
  "src/modules/task/pages/tasks-page.tsx",
  "src/modules/task/pages/bugs-page.tsx",
]);

const errors = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "components" || entry === "dist" || entry === "node_modules") {
        // continue search inside src/components but skip build deps
      }
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

for (const file of CORE_PAGES) {
  const abs = join(ROOT, file);
  const text = readFileSync(abs, "utf8");

  if (!text.includes("data-ai-page=") && !text.includes("aiPage=") && !text.includes("aiPage={")) {
    errors.push(`${file}: missing data-ai-page/aiPage declaration`);
  }

  if (!text.includes("data-ai-action=")) {
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

const sourceFiles = walk(join(ROOT, "src"));
for (const abs of sourceFiles) {
  const relative = abs.slice(ROOT.length + 1).replace(/\\/g, "/");
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
    !relative.includes("shared/mdx/components/")
  ) {
    errors.push(`${relative}: 禁止直接使用原生 <table>，请使用 @/components/ui/table primitives`);
  }
}

if (errors.length > 0) {
  console.error("UI governance check failed:\n" + errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("UI governance check passed.");

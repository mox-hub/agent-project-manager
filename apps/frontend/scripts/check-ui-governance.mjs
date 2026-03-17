import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const CORE_PAGES = [
  "src/modules/project/pages/project-list-page.tsx",
  "src/modules/project/pages/project-dashboard-page.tsx",
  "src/modules/task/pages/task-page.tsx",
  "src/modules/ai-hub/pages/ai-space-page.tsx",
  "src/modules/settings/pages/settings-page.tsx",
  "src/modules/core-config/pages/metadata-settings-page.tsx",
];

const OVERLAY_ALLOWLIST = new Set([
  "src/modules/project/pages/project-list-page.tsx",
]);

const errors = [];

for (const file of CORE_PAGES) {
  const abs = join(ROOT, file);
  const text = readFileSync(abs, "utf8");

  if (!text.includes("data-ai-page=") && !text.includes("aiPage={")) {
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
    errors.push(`${file}: contains inline style hex color; use semantic tokens`);
  }
}

if (errors.length > 0) {
  console.error("UI governance check failed:\n" + errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("UI governance check passed.");

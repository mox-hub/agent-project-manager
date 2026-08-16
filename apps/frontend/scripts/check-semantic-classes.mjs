import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = join(process.cwd(), "src");
const TARGET_EXT = new Set([".ts", ".tsx"]);

const ALLOWED = new Set([
  "bg-content-bg",
  "bg-content-bg-secondary",
  "text-content-text",
  "text-content-text-secondary",
  "text-content-text-muted",
  "text-content-text-tertiary",
  "border-content-border",
  "border-content-border-light",
  "bg-content-border",
  "bg-content-border-light",
  "bg-accent-blue",
  "bg-accent-blue-light",
  "text-accent-blue",
  "border-accent-blue",
  "bg-accent-green",
  "bg-accent-green-light",
  "text-accent-green",
  "border-accent-green",
  "bg-accent-yellow",
  "bg-accent-yellow-light",
  "text-accent-yellow",
  "border-accent-yellow",
  "bg-accent-red",
  "bg-accent-red-light",
  "text-accent-red",
  "border-accent-red",
  "bg-accent-purple",
  "bg-accent-purple-light",
  "text-accent-purple",
  "border-accent-purple",
  "text-accent-foreground",
  "bg-sidebar",
  "text-sidebar-foreground",
  "border-sidebar-border",
  "bg-sidebar-border",
  "bg-sidebar-accent",
  "text-sidebar-accent-foreground",
  "bg-sidebar-primary",
  "text-sidebar-primary-foreground",
]);

const SEMANTIC_PREFIX = /^(bg|text|border)-(content|accent|sidebar)-/;
const CLASS_REGEX = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      files.push(...walk(abs));
      continue;
    }
    if (TARGET_EXT.has(extname(abs))) {
      files.push(abs);
    }
  }
  return files;
}

function normalizeToken(token) {
  const base = token.split(":").at(-1) ?? token;
  return base.replace(/\/\d+$/, "");
}

const offenders = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(CLASS_REGEX)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? "";
    for (const token of raw.split(/\s+/)) {
      if (!token || token.includes("${")) continue;
      const normalized = normalizeToken(token);
      if (!SEMANTIC_PREFIX.test(normalized)) continue;
      if (!ALLOWED.has(normalized)) {
        offenders.push({ file, token: normalized });
      }
    }
  }
}

if (offenders.length > 0) {
  const lines = offenders.map((o) => `${o.file}: ${o.token}`);
  console.error("Found unregistered semantic utility classes:\n" + lines.join("\n"));
  process.exit(1);
}

console.log("Semantic utility class check passed.");

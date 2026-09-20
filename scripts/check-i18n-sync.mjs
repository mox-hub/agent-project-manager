#!/usr/bin/env node
/**
 * i18n 双语键同步检查：对比 en.json 与 zh-CN.json 的键集合（点路径扁平化）。
 * 任一方向缺键则退出码 1。i18next 支持键缺失回退，但双语长期失同步会
 * 造成「某语言静默丢文案」——此脚本把失同步变成显式失败。
 *
 * 用法：pnpm check:i18n-sync
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = resolve(root, 'apps/frontend/src/i18n/locales');

function flatten(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out.add(path);
    }
  }
  return out;
}

function loadKeys(file) {
  try {
    return flatten(JSON.parse(readFileSync(resolve(localesDir, file), 'utf8')));
  } catch (err) {
    console.error(`✗ 无法解析 ${file}: ${err.message}`);
    process.exit(1);
  }
}

const en = loadKeys('en.json');
const zh = loadKeys('zh-CN.json');

const missingInZh = [...en].filter((k) => !zh.has(k)).sort();
const missingInEn = [...zh].filter((k) => !en.has(k)).sort();

if (missingInZh.length === 0 && missingInEn.length === 0) {
  console.log(
    `✓ i18n 双语键完全同步（en: ${en.size} 键，zh-CN: ${zh.size} 键）`,
  );
  process.exit(0);
}

if (missingInZh.length > 0) {
  console.error(`✗ zh-CN.json 缺少 ${missingInZh.length} 个键：`);
  for (const k of missingInZh) console.error(`  - ${k}`);
}
if (missingInEn.length > 0) {
  console.error(`✗ en.json 缺少 ${missingInEn.length} 个键：`);
  for (const k of missingInEn) console.error(`  - ${k}`);
}
process.exit(1);

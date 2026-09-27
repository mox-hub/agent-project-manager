#!/usr/bin/env node
// 把 .zcode/skills/ 下的 skill 同步到各 AI 工具的技能目录（BCD 方案 §B3）。
//
// 为什么需要这个脚本：宪法 §11.2 写「由 frontend-page skill 强制」、根 AGENTS.md 写
// 「requirement-intake skill 闸门：未进清单不得开工」——但在 B3 之前，这两个 skill
// 只存在于 .zcode/skills/，对本仓的主要会话工具（Claude Code / Codex / Cursor / opencode）
// **完全不生效**：门禁对着空气喊话。
//
// 复制的代价是「1 源 + N 副本」天然会漂移（历史上 A 类全部矛盾正是「多处并存」造成的），
// 所以本脚本同时是**唯一的写入口**：
//   node scripts/sync-skills.mjs           # 从源同步到全部工具目录（覆盖副本）
//   node scripts/sync-skills.mjs --check   # 只校验，有漂移/缺失即退出码 1（改前用）
//
// 【为什么不进 CI / quality:gate】：四个工具目录（.claude / .codex / .opencode / .cursor）
// 按 .gitignore:120「Agent Tools (should not be version controlled)」**不入库**，CI 克隆出的
// 工作区里根本没有这些副本——挂进 CI 只会得到「永远红」。这是一道**本机门禁**，请配合
// `pnpm check:skills-sync` 在改完 skill 源后本地跑一次。
//
// 【为什么不加文件头副本标识以外的机制】：标识写在 frontmatter **之后**——Claude Code 等
// 工具要求 YAML frontmatter 位于文件首行，在它前面插一行会直接让 skill 失去 name/description。

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 锚定脚本自身位置而非 process.cwd()：本脚本可能从仓库根、apps/frontend 或 lint-staged
// 的 pre-commit worker（cwd 不受控）里被调用。
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(REPO_ROOT, '.zcode', 'skills');
const TOOL_DIRS = ['.claude', '.codex', '.opencode', '.cursor'];

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

/** 副本文件头标识（插在 frontmatter 之后、正文之前）。 */
function marker(skillName) {
  return (
    `\n> ⚠️ 本文件是 \`.zcode/skills/${skillName}/SKILL.md\` 的副本。` +
    `修改请先改源，再运行 \`node scripts/sync-skills.mjs\` 同步全量。\n`
  );
}

/** 由源文件内容生成目标文件内容：frontmatter 后插入副本标识。 */
function render(skillName, source) {
  const match = FRONTMATTER.exec(source);
  if (!match) {
    throw new Error(
      `${skillName}/SKILL.md 缺少 YAML frontmatter（必须以 --- 开头）。` +
        '本脚本不敢在未知结构上插标识——请先修源文件。',
    );
  }
  return source.slice(0, match[0].length) + marker(skillName) + source.slice(match[0].length);
}

/** 枚举源目录下的 skill（凡含 SKILL.md 的子目录）。 */
function listSkills() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`[skills] 源目录不存在：${relative(REPO_ROOT, SOURCE_DIR)}`);
    process.exit(1);
  }
  const skills = readdirSync(SOURCE_DIR).filter((name) => {
    const p = join(SOURCE_DIR, name, 'SKILL.md');
    return existsSync(p) && statSync(p).isFile();
  });
  if (skills.length === 0) {
    console.error('[skills] 源目录下未找到任何含 SKILL.md 的 skill —— 拒绝静默通过。');
    process.exit(1);
  }
  return skills.sort();
}

/** 源目录下除 SKILL.md 外的随附文件（原样复制，不加标识）。 */
function attachments(skillName) {
  const dir = join(SOURCE_DIR, skillName);
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name !== 'SKILL.md')
    .map((e) => e.name);
}

function readSource(skillName, file) {
  return readFileSync(join(SOURCE_DIR, skillName, file), 'utf8');
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const skills = listSkills();
  const problems = [];
  let written = 0;

  for (const tool of TOOL_DIRS) {
    for (const skill of skills) {
      const targetDir = join(REPO_ROOT, tool, 'skills', skill);
      const expected = render(skill, readSource(skill, 'SKILL.md'));
      const targetFile = join(targetDir, 'SKILL.md');

      let actual = null;
      try {
        actual = readFileSync(targetFile, 'utf8');
      } catch {
        actual = null;
      }

      if (actual === expected) {
        // 同步；随附文件照旧比对
      } else if (checkOnly) {
        problems.push(
          actual === null
            ? `  - ${tool}/skills/${skill}/SKILL.md：**不存在**（本机未安装该副本）`
            : `  - ${tool}/skills/${skill}/SKILL.md：与源不一致（漂移）`,
        );
      } else {
        mkdirSync(targetDir, { recursive: true });
        writeFileSync(targetFile, expected);
        written += 1;
      }

      for (const file of attachments(skill)) {
        const expectedAttachment = readSource(skill, file);
        const targetAttachment = join(targetDir, file);
        let actualAttachment = null;
        try {
          actualAttachment = readFileSync(targetAttachment, 'utf8');
        } catch {
          actualAttachment = null;
        }
        if (actualAttachment === expectedAttachment) continue;
        if (checkOnly) {
          problems.push(
            actualAttachment === null
              ? `  - ${tool}/skills/${skill}/${file}：**不存在**`
              : `  - ${tool}/skills/${skill}/${file}：与源不一致`,
          );
        } else {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(targetAttachment, expectedAttachment);
          written += 1;
        }
      }
    }
  }

  const total = skills.length * TOOL_DIRS.length;

  if (checkOnly) {
    if (problems.length > 0) {
      console.error(`[skills] 副本与源不一致（${problems.length} 处 / 共 ${total} 份）：`);
      console.error(problems.join('\n'));
      console.error('\n修复：node scripts/sync-skills.mjs');
      process.exit(1);
    }
    console.log(
      `[skills] 同步检查通过：${skills.length} 个 skill × ${TOOL_DIRS.length} 个工具目录 = ${total} 份副本，全部与源一致。`,
    );
    return;
  }

  console.log(
    `[skills] 已同步 ${skills.length} 个 skill → ${TOOL_DIRS.join(' / ')}（本次写入 ${written} 个文件，共 ${total} 份副本）。`,
  );
  console.log('[skills] 注意：这四个工具目录按 .gitignore 不入库，副本仅在本机生效。');
}

main();

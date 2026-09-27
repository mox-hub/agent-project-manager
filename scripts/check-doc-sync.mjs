import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getChangedFiles() {
  try {
    const baseRef = process.env.GITHUB_BASE_REF;
    if (baseRef) {
      try {
        run(`git fetch origin ${baseRef} --depth=1`);
      } catch {
        // ignore fetch failure and fallback
      }
      const out = run(`git diff --name-only --diff-filter=ACMRT origin/${baseRef}...HEAD`);
      if (out) return out.split(/\r?\n/).filter(Boolean);
    }

    const workingTree = run('git diff --name-only --diff-filter=ACMRT');
    if (workingTree) return workingTree.split(/\r?\n/).filter(Boolean);

    const headRange = run('git diff --name-only --diff-filter=ACMRT HEAD~1...HEAD');
    return headRange ? headRange.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Check 1: Code changes require corresponding doc updates
 */
function checkCodeNeedsDocs(codeChanged, docChanged, governanceChanged) {
  if (codeChanged && !docChanged && !governanceChanged) {
    console.error('[docs-sync] code changed but no docs/governance files were updated.');
    console.error('[docs-sync] please update docs/* or AGENTS.md/CHANGELOG.md in the same PR.');
    process.exit(1);
  }
}

// ── Check 2：受管文档的 frontmatter 契约 ────────────────────────────────────────
// 受管文档 = 进入版本控制、因而可评审/可回滚的 markdown。
const REQUIRED_FRONTMATTER_FIELDS = ['title', 'description', 'status'];
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
// UTF-8 BOM：编辑器可能写在文件开头，会让 `---` 不在首位。用 charCode 判定而不把
// U+FEFF 直接写进正则字面量——源码里的不可见字符迟早被谁"顺手删掉"。
const BOM_CODE = 0xfeff;

function isGovernedDoc(file) {
  if (!file.endsWith('.md') && !file.endsWith('.mdx')) return false;
  return (
    file.startsWith('docs/') ||
    file === 'README.md' ||
    file === 'AGENTS.md' ||
    file === 'CHANGELOG.md'
  );
}

function listTrackedDocs() {
  // `-z`：让 git 原样输出路径，跳过非 ASCII 文件名的引号转义——
  // 否则中文文件名会变成 `"docs/design/\344\277\256..."`，readFileSync 必然打不开。
  return run('git ls-files -z -- "*.md" "*.mdx"')
    .split('\0')
    .filter((f) => f && isGovernedDoc(f));
}

/**
 * Check 2: 所有受管文档必须有完整 frontmatter（title / description / status）
 *
 * B4 改造（2026-09-27）：输入源从 `git diff --name-only` 改为「全部被跟踪的受管文档」。
 * 旧实现有三个洞，缺一个就等于没这道检查：
 *   1) 输入是 git diff 的产物，而 `docs/` 在 .gitignore 里（`docs/design/` 是唯一例外）
 *      → 过滤器里的 `f.startsWith('docs/')` 命中率≈0，本检查对 docs 整体形同不存在；
 *   2) 只看「本次改动」的文件 → 一份早已缺 frontmatter 的文档只要不被编辑就永远不被检查，
 *      等到某次顺手改它时才炸在 CI 上（PRINCIPLES.md 实测踩过一次）；
 *   3) 上游 `changed.length === 0` 会提前 exit 0，把「无变更上下文」变成「跳过所有检查」。
 * 现口径：不经过 diff，直接枚举受管文档——无论本次改了什么、甚至什么都没改，
 * frontmatter 契约都被完整校验一次，本地与 CI 结果一致。
 *
 * 范围只收**已入库**的文档，不收工作区里的未跟踪文件：`docs/` 下绝大多数文件不入库
 * （AGENTS.md：不进 git 的文档无评审、无历史、无法回滚），对它们强制元数据要求，
 * 只会得到「本地永远红、CI 永远绿」的分歧——那比没有检查更坏。
 */
function checkAllDocsHaveFrontmatter() {
  let docs;
  try {
    docs = listTrackedDocs();
  } catch (err) {
    console.error('[docs-sync] cannot enumerate tracked docs via `git ls-files`:', err.message);
    console.error('[docs-sync] this check requires a git work tree; run it inside the repository.');
    process.exit(1);
  }

  if (docs.length === 0) {
    console.error('[docs-sync] no governed docs found — refusing to pass silently.');
    console.error('[docs-sync] expected tracked docs under docs/**, README.md, AGENTS.md, CHANGELOG.md.');
    process.exit(1);
  }

  const issues = [];
  for (const file of docs) {
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch (err) {
      issues.push(`  - ${file}: tracked but unreadable (${err.code ?? err.message})`);
      continue;
    }

    const text = content.charCodeAt(0) === BOM_CODE ? content.slice(1) : content;
    const match = FRONTMATTER.exec(text);
    if (!match) {
      issues.push(`  - ${file}: missing frontmatter (file must open with a --- ... --- block)`);
      continue;
    }

    const missing = REQUIRED_FRONTMATTER_FIELDS.filter(
      (key) => !new RegExp(`^${key}:`, 'm').test(match[1]),
    );
    if (missing.length > 0) {
      issues.push(`  - ${file}: frontmatter missing ${missing.join(' / ')}`);
    }
  }

  if (issues.length > 0) {
    console.error(
      `[docs-sync] ${issues.length}/${docs.length} governed doc(s) violate the frontmatter contract:`,
    );
    issues.forEach((msg) => console.error(msg));
    console.error(`[docs-sync] required frontmatter fields: ${REQUIRED_FRONTMATTER_FIELDS.join(', ')}`);
    console.error('[docs-sync] governed = tracked docs/**/*.md(x) + root README.md / AGENTS.md / CHANGELOG.md');
    process.exit(1);
  }

  console.log(`[docs-sync] frontmatter check passed (${docs.length} governed doc(s)).`);
}

/**
 * Check 3: Tauri docs should not be added to main path (should be archive)
 * （ADR-014 定版 Electron，Tauri 为已剔除的历史壳）
 */
function checkNoTauriMainPath(changed) {
  const tauriMainFiles = changed.filter((f) =>
    /desktop-tauri|tauri.*\.md$/i.test(f) &&
    !f.includes('archive/'),
  );

  if (tauriMainFiles.length > 0) {
    console.error('[docs-sync] Tauri docs must not be added to main path (legacy shell, removed by ADR-014):');
    tauriMainFiles.forEach((f) => console.error(`  - ${f}`));
    console.error('[docs-sync] Tauri docs should be placed in docs/archive/');
    console.error('[docs-sync] new Desktop docs should use Electron as the main approach');
    process.exit(1);
  }
}

// Check 4「软删除候选状态一致性」已删除（裁决 B-2，2026-09-27）：
// 它读的是 `docs/reports/doc-cleanup-soft-delete-candidates-2026-04-04.md`，该文件不存在，
// `catch {}` 把错误吞掉后由 `if (archivedPaths.length === 0) return;` 静默跳过——
// 一道永远不执行的检查比没有检查更坏（它会让门禁看起来是绿的）。
// 且「文档生命周期追踪」应由 APM 自身的文档模块承担（自举原则），
// 不该由 CI 脚本硬编码一份 2026-04 的过期清单路径。

// Check 2 是全量扫描，与「本次改了什么」无关，必须在早退之前执行——
// 否则在无变更上下文（CI 首次克隆、单独执行 check:docs-sync）下会被一并跳过，
// 重蹈「检查存在但永不生效」的覆辙。
checkAllDocsHaveFrontmatter();

const changed = getChangedFiles();
if (changed.length === 0) {
  console.log('[docs-sync] no changed files found, skip diff-based checks.');
  process.exit(0);
}

// 测试资产变更（spec/e2e/测试夹具）不影响运行时行为，不强制同 PR 更新文档：
// *.spec.ts / *.e2e-spec.ts、test/ 与 __tests__/ 目录下的文件
function isTestFile(f) {
  return (
    /\.(e2e-)?spec\.tsx?$/.test(f) ||
    /\.test\.tsx?$/.test(f) ||
    /(^|\/)(test|__tests__)\/./.test(f)
  );
}

const codeChanged = changed.some(
  (f) =>
    (f.startsWith('apps/server/') || f.startsWith('apps/frontend/')) &&
    !isTestFile(f),
);
const docChanged = changed.some((f) => f.startsWith('docs/'));
const governanceChanged = changed.some((f) =>
  ['AGENTS.md', 'CHANGELOG.md', '.github/PULL_REQUEST_TEMPLATE.md'].includes(f),
);

// Run remaining checks
checkCodeNeedsDocs(codeChanged, docChanged, governanceChanged);
checkNoTauriMainPath(changed);

console.log('[docs-sync] passed.');

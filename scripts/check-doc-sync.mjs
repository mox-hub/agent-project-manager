import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

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

/**
 * Check 2: New docs must have frontmatter metadata
 */
function checkNewDocsHaveFrontmatter(changed) {
  const newOrModified = changed.filter(
    (f) => (f.endsWith('.md') || f.endsWith('.mdx')) &&
      (f.startsWith('docs/') || f === 'README.md' || f === 'AGENTS.md' || f === 'CHANGELOG.md'),
  );

  const issues = [];
  for (const file of newOrModified) {
    try {
      const content = readFileSync(file, 'utf8');
      if (!content.startsWith('---')) {
        issues.push(`  - ${file}: missing frontmatter (must start with ---)`);
      }
    } catch {
      // file not readable, skip
    }
  }

  if (issues.length > 0) {
    console.error('[docs-sync] new/modified docs must include frontmatter metadata:');
    issues.forEach((msg) => console.error(msg));
    console.error('[docs-sync] required frontmatter fields: title, description, status');
    process.exit(1);
  }
}

/**
 * Check 3: Electron docs should not be added to main path (should be archive)
 */
function checkNoElectronMainPath(changed) {
  const electronMainFiles = changed.filter((f) =>
    /desktop-electron|electron.*\.md$/i.test(f) &&
    !f.includes('archive/') &&
    !f.includes('desktop-tauri'),
  );

  if (electronMainFiles.length > 0) {
    console.error('[docs-sync] Electron docs must not be added to main path during migration:');
    electronMainFiles.forEach((f) => console.error(`  - ${f}`));
    console.error('[docs-sync] Electron docs should be placed in docs/archive/');
    console.error('[docs-sync] new Desktop docs should use Tauri as the main approach');
    process.exit(1);
  }
}

/**
 * Check 4: Soft-delete candidates status consistency
 * If a file is listed as "should be archived" in the cleanup doc,
 * it should not appear in the main docs/ path.
 */
function checkSoftDeleteCandidates(changed) {
  // Read the cleanup candidates doc to get expected archived paths
  const cleanupDocPath = 'docs/reports/doc-cleanup-soft-delete-candidates-2026-04-04.md';
  let archivedPaths = [];

  try {
    const content = readFileSync(cleanupDocPath, 'utf8');
    const regex = /`([^`]+)` \| 文档 \| .+ \| \*\*已归档 \((\d{4}-\d{2}-\d{2})\)\*\*/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      archivedPaths.push(match[1]);
    }
  } catch {
    // cleanup doc not found, skip
  }

  if (archivedPaths.length === 0) return;

  const violations = [];
  for (const archivedPath of archivedPaths) {
    // Check if the file still exists in its original (non-archive) location
    const originalLocation = archivedPath;
    try {
      statSync(originalLocation);
      violations.push(`  - ${originalLocation}: still exists (should be archived in docs/archive/)`);
    } catch {
      // file doesn't exist, good
    }
  }

  if (violations.length > 0) {
    console.error('[docs-sync] soft-delete candidates still present in main path:');
    violations.forEach((msg) => console.error(msg));
    console.error('[docs-sync] move these files to docs/archive/ and update the cleanup doc');
    process.exit(1);
  }
}

const changed = getChangedFiles();
if (changed.length === 0) {
  console.log('[docs-sync] no changed files found, skip.');
  process.exit(0);
}

const codeChanged = changed.some((f) => f.startsWith('apps/server/') || f.startsWith('apps/frontend/'));
const docChanged = changed.some((f) => f.startsWith('docs/'));
const governanceChanged = changed.some((f) =>
  ['AGENTS.md', 'CHANGELOG.md', '.github/PULL_REQUEST_TEMPLATE.md'].includes(f),
);

// Run all checks
checkCodeNeedsDocs(codeChanged, docChanged, governanceChanged);
checkNewDocsHaveFrontmatter(changed);
checkNoElectronMainPath(changed);
checkSoftDeleteCandidates(changed);

console.log('[docs-sync] passed.');

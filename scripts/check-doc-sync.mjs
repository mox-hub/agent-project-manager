import { execSync } from 'node:child_process';

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

if (codeChanged && !docChanged && !governanceChanged) {
  console.error('[docs-sync] code changed but no docs/governance files were updated.');
  console.error('[docs-sync] please update docs/* or AGENTS.md/CHANGELOG.md in the same PR.');
  process.exit(1);
}

console.log('[docs-sync] passed.');

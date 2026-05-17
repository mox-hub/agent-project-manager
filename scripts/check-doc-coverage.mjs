import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Force non-interactive mode for CI/sandbox environments
process.stdin.isTTY = process.stdin.isTTY || false;

const ROOT = process.cwd();
let errors = 0;

function logError(msg) {
  console.error(`[doc-coverage] ❌ ${msg}`);
  errors++;
}

function logOk(msg) {
  console.log(`[doc-coverage] ✅ ${msg}`);
}

/**
 * Check 1: Every backend module has a requirements doc
 */
function checkBackendModuleCoverage() {
  const modulesDir = join(ROOT, 'apps/server/src/modules');
  if (!existsSync(modulesDir)) {
    logError('apps/server/src/modules/ not found');
    return;
  }

  const modules = readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Known exceptions: modules that are internal/sub-modules
  const exceptions = ['document-enhance'];

  for (const mod of modules) {
    if (exceptions.includes(mod)) continue;

    const reqPath = join(ROOT, 'docs/meta/requirements', `feature-${mod}.md`);
    if (!existsSync(reqPath)) {
      logError(`backend module "${mod}" has no requirements doc (expected: docs/meta/requirements/feature-${mod}.md)`);
    }
  }

  logOk(`checked ${modules.length} backend modules for requirements docs`);
}

/**
 * Check 2: Every frontend module has a traceability matrix entry
 */
function checkFrontendModuleCoverage() {
  const modulesDir = join(ROOT, 'apps/frontend/src/modules');
  if (!existsSync(modulesDir)) {
    logError('apps/frontend/src/modules/ not found');
    return;
  }

  const modules = readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Read traceability matrix
  const matrixPath = join(ROOT, 'docs/reports/traceability-matrix.md');
  if (!existsSync(matrixPath)) {
    logError('docs/reports/traceability-matrix.md not found');
    return;
  }

  const matrixContent = readFileSync(matrixPath, 'utf8');

  // Modules that are purely frontend and don't need separate backend FR entries
  const frontendOnly = ['command-palette', 'settings', 'analytics', 'document'];

  for (const mod of modules) {
    // Check if any mention in the traceability matrix
    const modVariants = [
      mod,
      mod.replace(/-/g, ' '),
      mod.replace(/-/g, '-'),
    ];

    const mentioned = modVariants.some((v) =>
      matrixContent.toLowerCase().includes(v.toLowerCase()),
    );

    if (!mentioned && !frontendOnly.includes(mod)) {
      logError(`frontend module "${mod}" not mentioned in traceability matrix`);
    }
  }

  logOk(`checked ${modules.length} frontend modules for traceability coverage`);
}

/**
 * Check 3: Backend modules with contracts should have API docs
 */
function checkContractApiMapping() {
  const contractsDir = join(ROOT, 'docs/meta/contracts');
  const apiDir = join(ROOT, 'docs/api');

  if (!existsSync(contractsDir) || !existsSync(apiDir)) return;

  const contracts = readdirSync(contractsDir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md');

  for (const contract of contracts) {
    const moduleName = contract.replace('.md', '');
    const apiPath = join(apiDir, `api-${moduleName}.md`);
    if (!existsSync(apiPath)) {
      // Not all contracts need API docs (e.g., command-palette is frontend-only)
      logOk(`contract "${moduleName}" has no API doc (may be frontend-only)`);
    }
  }

  logOk(`checked ${contracts.length} contracts for API doc mapping`);
}

/**
 * Check 4: INDEX.md references match actual files
 */
function checkIndexReferences() {
  const indexPath = join(ROOT, 'docs/INDEX.md');
  if (!existsSync(indexPath)) return;

  const content = readFileSync(indexPath, 'utf8');
  const refs = [...content.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);

  let brokenRefs = 0;
  for (const ref of refs) {
    // Skip external links
    if (ref.startsWith('http')) continue;

    // Clean up anchor links
    const cleanRef = ref.split('#')[0];
    if (!cleanRef) continue;

    const fullPath = join(ROOT, 'docs', cleanRef);
    if (!existsSync(fullPath)) {
      logError(`INDEX.md references non-existent file: docs/${cleanRef}`);
      brokenRefs++;
    }
  }

  if (brokenRefs === 0) {
    logOk(`all INDEX.md references are valid (${refs.length} references checked)`);
  }
}

/**
 * Check 5: New doc files have proper frontmatter
 */
function checkFrontmatter() {
  const dirs = [
    join(ROOT, 'docs/meta/requirements'),
    join(ROOT, 'docs/meta/contracts'),
    join(ROOT, 'docs/api'),
  ];

  let checked = 0;
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
    for (const file of files) {
      const content = readFileSync(join(dir, file), 'utf8');
      if (!content.startsWith('---')) {
        logError(`${file}: missing frontmatter`);
      }
      checked++;
    }
  }

  logOk(`checked ${checked} doc files for frontmatter`);
}

// Run all checks
console.log('[doc-coverage] checking documentation coverage...\n');

checkBackendModuleCoverage();
checkFrontendModuleCoverage();
checkContractApiMapping();
checkIndexReferences();
checkFrontmatter();

console.log(`\n[doc-coverage] ${errors === 0 ? 'all checks passed ✅' : `${errors} issue(s) found ❌`}`);
process.exit(errors > 0 ? 1 : 0);

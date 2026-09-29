import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { posix } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * lint:layers —— 分层门禁（E 类方案 §四 4.2 / 宪法 §19.1 + G 类方案 §2.2 依赖矩阵）
 *
 * 本脚本承载两块检查：
 *
 * ## 1. 存量规则（2026-09-27 起，口径与基线机制原样保留）
 *
 * 规则：**原子层 `src/components/ui/` 禁止 `import` 任何 `modules/*`（含 `import type`）**。
 * 原子层是与业务对象无关的可复用件（不 import 任何 modules/*、不发数据请求）；一旦原子层
 * 反向依赖业务模块，就形成循环依赖且组件不可复用 —— 即「分层倒置」。
 *
 * 口径说明：
 * - **原子层 = `src/components/ui/`**（§19.1 唯一命名空间）。第二个 `ui` 命名空间
 *   `src/shared/ui/` 是 §三 E7 的清退候选、不在本门禁的原子层口径内（实测其当前也不
 *   import modules/*），故不扫。
 * - 仅查 `import` 路径（正则足够，无需 AST）——ESLint 只承接需要 AST 的 3 条规则，二者并存。
 * - `import type` **同样算违规**：§19.1 明写「含类型」。
 *
 * ## 2. G 类依赖矩阵 R1–R6（2026-09-29 起，docs/design/修改方案-G类-分层解耦-2026-09-29.md §2.2）
 *
 * 「目录=层」物理化，违例方向（✓ = 允许方向，✗ = 违例）：
 *
 * | #  | 方向                                        | 强度 |
 * |----|---------------------------------------------|------|
 * | R1 | modules/shared/app → components/raw         | ✗ error：业务面必须经 semantic 或 ui，不得直取原语 |
 * | R2 | components/raw → ui / semantic / modules    | ✗ error：原语最底层，只准依赖 react/react-dom 类型、@/lib 工具与原生（防环） |
 * | R3 | components/ui → components/semantic         | ✗ error：原子不依赖上层（防环；ui→raw 见 R4 ✓） |
 * | R4 | components/ui → components/raw              | ✓ 允许：只输出「ui 内 import raw 的文件数」渐进观察指标，不阻断 |
 * | R5 | components/semantic → raw / ui              | ✓ 允许：语义组件的唯一实现方式，无需检查 |
 * | R6 | components/semantic → modules               | ✗ error：语义组件不得反向依赖业务 |
 *
 * 裁决 G3（2026-09-29）：R1–R6 全部是**零存量违例的新目录规则**，落地即 error
 * （违例即 exit 1），不设 warn 期。存量 5 条分层倒置仍归第 1 块规则（warn 报告不阻断）。
 *
 * 共用口径：
 * - import 识别沿用正则方案（别名/相对路径双形态），无需 AST。存量规则用原 SPECIFIER_RE
 *   （口径不变）；G 类规则用 G_SPECIFIER_RE——额外覆盖副作用形态 `import '…'`。
 *   G 类相对路径用「解析到 pkg-root 相对路径再判目录包含」的精确口径：
 *   `@/components/raw/...` 与 `../../components/raw/...` 都能命中，而
 *   `@/components/raw-x/...`、`./raw-utils/...` 等形近路径不会误报。
 * - `import type` 同样算违规（与存量规则一致）。
 * - `.test/.spec` 文件一律排除。
 * - raw/ 与 semantic/ 递归扫描子目录；ui/ 一并递归（ui/ 现无子目录，与原单层
 *   readdirSync 口径行为一致，实测文件数不变）。
 *
 * ## 存量 vs 新增（仅第 1 块规则，新增即拦，存量放行）
 *
 * 基线键 = `文件路径 + imported specifier`（**不含行号**：行号会随任何无关编辑漂移，
 * 导致基线失效后突然变红）。存量条目逐条列出理由与去向，只报告不阻断；
 * 任何不在基线内的命中 = 新增 → 退出码 1。
 *
 * 之所以不能直接全量失败：这些存量倒置的修法是「把组件下沉/上浮到正确的层」，
 * 属需人工裁决的搬迁（且删除已被人类叫停），本轮不推动。
 */

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:layers`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const toPosix = (p) => p.split("\\").join("/");

/**
 * 存量基线（机制保留，2026-09-29 起为空）。存量 5 条已于 2026-09-29 随 G7 倒置收编
 * 迁出 ui/ 清零（4 文件分别下沉 modules/document、modules/issue 与上浮 shared/components）；
 * 基线机制原样保留——任何 ui → modules 的新增倒置仍按「不在基线内 = 新增」拦截。
 */
export const LAYER_BASELINE = [];

/** 三个组件层目录（相对 pkg root，posix 口径） */
export const LAYER_DIRS = {
  ui: "src/components/ui",
  raw: "src/components/raw",
  semantic: "src/components/semantic",
};

/** R1 的业务面范围（相对 pkg root，posix 口径） */
const BIZ_TREE_DIRS = ["src/modules", "src/shared", "src/app"];
/** R2/R6 共同禁止的业务模块根 */
const MODULES_DIR = "src/modules";

// 静态 `import ... from '…'` / `export … from '…'` 与动态 `import('…')`
const SPECIFIER_RE = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
// G 类规则专用：在 SPECIFIER_RE 基础上增加副作用形态 `import '…'`（无 from / 无 import(）。
// 存量规则**不**用它——保持存量口径与基线机制完全不变；G 类新目录规则无存量包袱，口径更严。
const G_SPECIFIER_RE = /(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
// 存量规则命中条件：specifier 里出现 `/modules/` 段（`@/modules/...` 与相对路径 `../../modules/...` 同拦）
const MODULE_SPECIFIER_RE = /(?:^|\/)modules\//;

/**
 * 递归收集一个目录树下的 `.ts/.tsx` 源文件（排除 `.test/.spec`）。
 * 目录不存在返回 `null`（调用方据此报「目录不存在」）；空目录返回 `[]`。
 */
export function collectSourceFiles(absDir) {
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const out = [];
  for (const entry of entries) {
    const abs = join(absDir, entry.name);
    if (entry.isDirectory()) {
      const nested = collectSourceFiles(abs);
      if (nested) out.push(...nested);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * 把一条 import specifier 解析为「相对 pkg root 的 posix 路径」（G 类规则用，
 * 与 LAYER_DIRS / MODULES_DIR 的 `src/...` 前缀同口径）。
 * - 别名形态：`@/...` → `src/...`（@ 即 src/）；
 * - 相对形态：`./...` / `../...` 相对当前文件所在目录归一化；
 * - 裸包名（react、@apm/shared/... 等）返回 null，不参与层判定。
 */
export function resolveSrcRel(fileSrcRel, spec) {
  if (spec.startsWith("@/")) return posix.normalize(posix.join("src", spec.slice(2)));
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return posix.normalize(posix.join(posix.dirname(toPosix(fileSrcRel)), spec));
  }
  return null;
}

/** 解析结果是否落在某个 src/ 子目录内（含目录 index 引用 `@/components/raw` 的边界形态） */
function underSrcDir(srcRel, dirSrcRel) {
  if (srcRel === null) return false;
  return srcRel === dirSrcRel || srcRel.startsWith(`${dirSrcRel}/`);
}

/**
 * 扫描一组文件里命中谓词的 import（逐行、沿用正则方案）。
 * predicate(spec, resolvedSrcRel) —— resolvedSrcRel 可为 null（裸包名）。
 * 命中项：{ rel, line, spec, key }，key 与存量基线同构（`rel → spec`，不含行号）。
 */
function scanFiles(pkgRoot, dirSrcRel, files, predicate, specifierRe = SPECIFIER_RE) {
  const absDir = join(pkgRoot, dirSrcRel);
  const hits = [];
  for (const abs of files) {
    const rel = `${dirSrcRel}/${toPosix(relative(absDir, abs))}`;
    const source = readFileSync(abs, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, i) => {
      specifierRe.lastIndex = 0;
      let m;
      while ((m = specifierRe.exec(line))) {
        const spec = m[1];
        if (!predicate(spec, resolveSrcRel(rel, spec))) continue;
        hits.push({ rel, line: i + 1, spec, key: `${rel} → ${spec}` });
      }
    });
  }
  return hits;
}

/**
 * 全量分层检查（纯函数：不打印、不退出，供 CLI 壳与测试复用）。
 * @param {string} pkgRoot frontend 包根（测试注入临时 fixture 根目录）
 */
export function runChecks(pkgRoot = PKG_ROOT) {
  // ── 采集三个组件层文件 ──
  const missingDirs = [];
  const layerFiles = {};
  for (const [name, dir] of Object.entries(LAYER_DIRS)) {
    const files = collectSourceFiles(join(pkgRoot, dir));
    if (files === null) missingDirs.push(dir);
    layerFiles[name] = files ?? [];
  }

  // 业务面三棵树：缺失按空树处理（无文件即无违例，不算门禁故障）
  const bizTrees = BIZ_TREE_DIRS.map((dir) => ({
    dir,
    files: collectSourceFiles(join(pkgRoot, dir)) ?? [],
  }));

  // ── 存量规则：ui → modules（口径与基线机制原样保留，勿动）──
  const legacyFound = scanFiles(pkgRoot, LAYER_DIRS.ui, layerFiles.ui, (spec) =>
    MODULE_SPECIFIER_RE.test(spec),
  );

  // ── G 类 R1–R6（含副作用 import 形态，见 G_SPECIFIER_RE）──
  const r1 = bizTrees.flatMap(({ dir, files }) =>
    scanFiles(
      pkgRoot,
      dir,
      files,
      (_spec, srcRel) => underSrcDir(srcRel, LAYER_DIRS.raw),
      G_SPECIFIER_RE,
    ),
  );
  const r2 = scanFiles(
    pkgRoot,
    LAYER_DIRS.raw,
    layerFiles.raw,
    (_spec, srcRel) =>
      underSrcDir(srcRel, LAYER_DIRS.ui) ||
      underSrcDir(srcRel, LAYER_DIRS.semantic) ||
      underSrcDir(srcRel, MODULES_DIR),
    G_SPECIFIER_RE,
  );
  const r3 = scanFiles(
    pkgRoot,
    LAYER_DIRS.ui,
    layerFiles.ui,
    (_spec, srcRel) => underSrcDir(srcRel, LAYER_DIRS.semantic),
    G_SPECIFIER_RE,
  );
  const r6 = scanFiles(
    pkgRoot,
    LAYER_DIRS.semantic,
    layerFiles.semantic,
    (_spec, srcRel) => underSrcDir(srcRel, MODULES_DIR),
    G_SPECIFIER_RE,
  );
  // R4 是允许方向：只输出「ui 内 import raw 的文件数」渐进观察指标（按文件去重）
  const r4ObservedFiles = new Set(
    scanFiles(
      pkgRoot,
      LAYER_DIRS.ui,
      layerFiles.ui,
      (_spec, srcRel) => underSrcDir(srcRel, LAYER_DIRS.raw),
      G_SPECIFIER_RE,
    ).map((h) => h.rel),
  ).size;

  const baseline = new Set(LAYER_BASELINE);
  return {
    counts: {
      ui: layerFiles.ui.length,
      raw: layerFiles.raw.length,
      semantic: layerFiles.semantic.length,
    },
    missingDirs,
    legacy: {
      found: legacyFound,
      existing: legacyFound.filter((h) => baseline.has(h.key)),
      added: legacyFound.filter((h) => !baseline.has(h.key)),
      stale: LAYER_BASELINE.filter((k) => !legacyFound.some((h) => h.key === k)),
    },
    g: { r1, r2, r3, r6, r4ObservedFiles },
  };
}

/** G 类违例的规则语义（错误输出用，文案与方案 §2.2 一致） */
const G_RULE_MESSAGES = {
  R1: "业务面必须经 semantic 或 ui，不得直取原语（G 类 R1）",
  R2: "原语最底层，只准依赖 react/react-dom 类型、@/lib 工具与原生（G 类 R2）",
  R3: "原子不依赖上层（G 类 R3）",
  R6: "语义组件不得反向依赖业务（G 类 R6）",
};

/** CLI 壳：打印与退出码（exit 0 = 通过；exit 1 = 目录缺失 / 存量新增 / 任一 G 类违例） */
function main() {
  const { counts, missingDirs, legacy, g } = runChecks();

  if (missingDirs.length > 0) {
    console.error(`Layer check failed: 分层目录不存在 ${missingDirs.join("、")}`);
    process.exit(1);
  }

  console.log("═".repeat(72));
  console.log("lint:layers —— 分层倒置（原子层 src/components/ui/ 禁止 import modules/*，§19.1）");
  console.log("═".repeat(72));
  console.log(
    `扫描原子层文件 ${counts.ui} 个；命中 ${legacy.found.length} 条（存量 ${legacy.existing.length}，新增 ${legacy.added.length}）\n`,
  );

  if (legacy.existing.length > 0) {
    console.log(`【存量 · 报告项 · 不阻断】${legacy.existing.length} 条（修法为搬迁，属待裁决项）：`);
    for (const h of legacy.existing) console.log(`  - ${h.rel}:${h.line}  ${h.spec}`);
    console.log("");
  }
  if (legacy.stale.length > 0) {
    console.log(`【基线提示】${legacy.stale.length} 条基线已不再命中，可从脚本 LAYER_BASELINE 删除：`);
    for (const k of legacy.stale) console.log(`  - ${k}`);
    console.log("");
  }

  console.log("─".repeat(72));
  console.log("G 类依赖矩阵 R1–R6（修改方案-G类 §2.2；裁决 G3：新目录规则落地即 error）");
  console.log("─".repeat(72));
  console.log(`扫描 raw ${counts.raw} / semantic ${counts.semantic} 个文件（ui ${counts.ui} 个见上）`);
  console.log(`R4 观察（允许方向 ✓，渐进指标只观察）：ui 内 import raw 的文件数 = ${g.r4ObservedFiles}\n`);

  const gGroups = [
    ["R1", g.r1],
    ["R2", g.r2],
    ["R3", g.r3],
    ["R6", g.r6],
  ];
  const gTotal = gGroups.reduce((n, [, hits]) => n + hits.length, 0);

  if (legacy.added.length > 0 || gTotal > 0) {
    if (legacy.added.length > 0) {
      console.error(`Layer check failed —— 新增分层倒置 ${legacy.added.length} 条：`);
      for (const h of legacy.added) console.error(`  - ${h.rel}:${h.line}  ${h.spec}`);
      console.error(
        "\n原子层不得 import 任何 modules/*（含 import type，§19.1）。" +
          "若该文件本质是业务组件，请上浮到 src/shared/components/ 或 src/modules/<m>/components/。",
      );
    }
    if (gTotal > 0) {
      console.error(`Layer check failed —— G 类依赖矩阵违例 ${gTotal} 条：`);
      for (const [rule, hits] of gGroups) {
        if (hits.length === 0) continue;
        console.error(`\n【${rule} · error】${G_RULE_MESSAGES[rule]} —— ${hits.length} 条：`);
        for (const h of hits) console.error(`  - ${h.rel}:${h.line}  ${h.spec}`);
      }
    }
    process.exit(1);
  }

  console.log(
    `Layer check passed（原子层 ${counts.ui} 个文件无**新增**分层倒置；存量 ${legacy.existing.length} 条已登记基线待裁决；` +
      `G 类 R1/R2/R3/R6 零违例，R4 观察 ${g.r4ObservedFiles} 个文件）。`,
  );
}

/** 仅直接执行本脚本时跑 CLI（测试 import 本模块只取导出函数，不产生副作用） */
function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    // 双侧 realpath：win32 下盘符大小写 / 调用路径大小写可能不一致
    return (
      pathToFileURL(realpathSync(process.argv[1])).href ===
      pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href
    );
  } catch {
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  }
}

if (isDirectRun()) main();

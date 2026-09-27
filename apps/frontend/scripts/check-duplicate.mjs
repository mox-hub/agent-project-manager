import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * lint:duplicate —— 组件重名/词干碰撞门禁（E 类方案 §四 4.2 / 宪法 §19.6 准入条件 1）
 *
 * §19.6 把「`lint:duplicate` 通过 —— 无同名/近义既有组件」列为**新增 components/ui 组件
 * 的全部条件之第 1 条**。方案点名的词干家族：`stat-*` / `*-switcher` / `*-select` / `*-card`。
 *
 * ## 判定口径（本轮）
 *
 * **碰撞档（判违规）**：组件名按 `-` 分词 → 每段做**单复数归一**（去尾部 `s`）→ 排序 → 拼接，
 * 归一后相等即为碰撞。这一档同时覆盖两类真实问题：
 *   - 完全同名：`member-card`（auth）与 `member-card`（team-member）
 *   - 词干/单复数碰撞：`stat-card` 与 `stats-card`（方案原文点名的例子）
 *
 * **家族普查档（只报告，不判违规）**：列出方案点名的 4 个词干家族的全部成员。
 * 更宽的「近义」自动判定（如 `select` ⊂ `native-select`）**本轮未做**——`*-card` 家族有 27 个
 * 成员，宽松判据会把整套卡片一起误报。家族成员清单交由人工裁决，故只做普查。
 *
 * ## 存量 vs 新增（新增即拦，存量放行）
 *
 * 存量**不许删、不许改名**（人类铁律：删除已被叫停，组件清退须先经 `review` 态公示 +
 * 人工批准，§19.6）。故存量碰撞只报告；不在基线内的碰撞 = 新增 → 退出码 1。
 * 基线键 = **归一后的词干**（不含文件数：清退/搬迁会让成员减少，但词干本身仍是碰撞对）。
 */

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(PKG_ROOT, "src");

const toPosix = (p) => p.split("\\").join("/");

/**
 * 存量基线（2026-09-27 实测）。
 *
 * **键的粒度**：`归一词干 → 允许的成员组件名集合`。判定规则：
 * - 该词干下**每个成员的名字都在基线集合内** ⇒ 存量 → 只报告；
 * - 只要出现**基线集合外的成员名** ⇒ 新增 → 失败。
 *
 * 之所以不用「词干存在即放行」：那样 `stat-card` / `stats-card` 已在基线时，
 * 再新增第三个 `stat-cards.tsx`（归一后同为 `card+stat`）会被静默放行 —— 恰恰漏掉
 * 「复制组件另存新文件」这种最该拦的情形。之所以不用「文件名/路径」做键：
 * 组件会随分层搬迁改路径（本会话就有批 2 的 6 件搬迁），路径键会天天假红。
 *
 * 残留缺口（**已知并接受**）：`member-card` 这类「同名但分布在不同模块」的碰撞，
 * 基线集合里只有一个名字，故在第三个模块再复制一份同名件不会被拦。该缺口要等
 * 「跨模块同名」有独立判据后再补。
 */
const DUPLICATE_BASELINE = new Map([
  // 方案原文点名的例子：stat-card / stats-card。属 §19.4 D1「复制组件源码另存新文件」，
  // 修法是合并为一个组件 + variant，须先经 review 态公示后人工裁决。
  [
    "card+stat",
    {
      members: ["stat-card", "stats-card"],
      reason: "stat-card / stats-card —— 方案 §19.4 D1 点名例，待裁决为合并 + variant",
    },
  ],
  // 两个模块各有一份同名组件；是否合并需先比对实现（可能只是命名碰撞而非重复实现）。
  [
    "card+member",
    {
      members: ["member-card"],
      reason: "member-card（auth / team-member 各一份）—— 待人工比对是否重复实现",
    },
  ],
]);

/** 单复数归一：去尾部 `s`（统一施加，故 `status` 也归一为 `statu`，不产生额外碰撞）。 */
const foldToken = (t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
const stemOf = (basename) =>
  basename
    .split("-")
    .map(foldToken)
    .sort()
    .join("+");

/** 方案点名的词干家族（只报告）。 */
const FAMILIES = [
  { label: "stat-*", test: (n) => n.startsWith("stat") },
  { label: "*-switcher", test: (n) => n.endsWith("-switcher") },
  { label: "*-select", test: (n) => n === "select" || n.endsWith("-select") },
  { label: "*-card", test: (n) => n === "card" || n.endsWith("-card") },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 语料 = 组件可能落地的三个位置（§19.1 三层放置规则）
const roots = [
  join(SRC, "components", "ui"),
  join(SRC, "shared"),
  ...readdirSync(join(SRC, "modules"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(SRC, "modules", e.name, "components")),
].filter((d) => statSync(d, { throwIfNoEntry: false })?.isDirectory());

const componentFiles = [];
for (const root of roots) {
  for (const p of walk(root)) {
    const rel = toPosix(p).replace(toPosix(SRC) + "/", "src/");
    const base = rel.split("/").pop();
    if (!/\.tsx$/.test(base)) continue;
    if (/\.(test|spec)\.tsx$/.test(base)) continue;
    if (base === "index.tsx") continue; // barrel 出口不是组件实体
    componentFiles.push({ rel, name: base.replace(/\.tsx$/, "") });
  }
}

// ---- 碰撞档 ----
const groups = new Map();
for (const f of componentFiles) {
  const stem = stemOf(f.name);
  if (!groups.has(stem)) groups.set(stem, []);
  groups.get(stem).push(f);
}

const collisions = [...groups.entries()]
  .filter(([, members]) => members.length > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));

/** 存量 = 该词干下所有成员名都在基线集合内；任一成员名在集合外 ⇒ 新增。 */
const isBaselineGroup = (stem, members) => {
  const allowed = DUPLICATE_BASELINE.get(stem);
  return Boolean(allowed) && members.every((m) => allowed.members.includes(m.name));
};

const existing = collisions.filter(([stem, members]) => isBaselineGroup(stem, members));
const added = collisions.filter(([stem, members]) => !isBaselineGroup(stem, members));
const stale = [...DUPLICATE_BASELINE.keys()].filter(
  (stem) => !collisions.some(([s]) => s === stem)
);

console.log("═".repeat(72));
console.log("lint:duplicate —— 组件重名/词干碰撞（§19.6 准入条件 1）");
console.log("═".repeat(72));
console.log(
  `扫描组件文件 ${componentFiles.length} 个；归一后碰撞组 ${collisions.length} 组` +
    `（存量 ${existing.length}，新增 ${added.length}）\n`
);

if (existing.length > 0) {
  console.log(`【存量 · 报告项 · 不阻断】${existing.length} 组（不许删、不许改名；须先经 review 态公示 + 人工批准）：`);
  for (const [stem, members] of existing) {
    console.log(`  - ${DUPLICATE_BASELINE.get(stem).reason}`);
    for (const m of members) console.log(`      ${m.name}  ←  ${m.rel}`);
  }
  console.log("");
}
if (stale.length > 0) {
  console.log(`【基线提示】${stale.length} 条基线已不再碰撞，可从 DUPLICATE_BASELINE 删除：`);
  for (const s of stale) console.log(`  - ${s}（${DUPLICATE_BASELINE.get(s).reason}）`);
  console.log("");
}

if (added.length > 0) {
  console.error(`Duplicate check failed —— 新增组件重名/词干碰撞 ${added.length} 组：`);
  for (const [stem, members] of added) {
    console.error(`  - 归一词干 [${stem}]：`);
    for (const m of members) console.error(`      ${m.rel}`);
  }
  console.error(
    "\n§19.4 D1：禁止复制组件源码另存新文件；§19.6：新增组件必须先过 lint:duplicate。" +
      "请改为「统一组件 + 新增 variant/size/tone」，或登记 review 态走人工裁决。"
  );
  process.exit(1);
}

// ---- 家族普查档（只报告）----
console.log("【家族普查 · 只报告】方案 §四 4.2 点名的 4 个词干家族成员数：");
for (const fam of FAMILIES) {
  const members = componentFiles.filter((f) => fam.test(f.name));
  console.log(`  ${fam.label.padEnd(12)} ${String(members.length).padStart(3)} 个：${members.map((m) => m.name).join(", ")}`);
}

console.log(
  `\nDuplicate check passed（无**新增**碰撞；存量 ${existing.length} 组已登记基线待裁决）。`
);

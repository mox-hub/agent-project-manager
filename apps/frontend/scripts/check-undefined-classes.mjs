import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:*`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── 幽灵类检测（修改方案-BCD类 C7「未定义类」）────────────────────────────────
// 动机：`text-12`（实测 3 处）这类「写了一个不存在的 token」的类不报错、不生效、没人
// 发现——Tailwind 只为真实存在的 token 生成 CSS，拼错的类名静默落空。
//
// 判据（务实版）：以构建产物 `dist/assets/index-*.css` 为「Tailwind 到底生成了哪些类」的
// 唯一真相源，反查源码里出现的刻度类是否有对应选择器；没有即幽灵类。
//   优点：判据取自真实产物，无需维护一份 Tailwind 默认主题白名单（C7 备选方案）
//   代价：依赖 `pnpm build`——产物缺失或比源码旧时只提示、**以 0 退出**：产物陈旧时的
//        比对结果同时含假阳与假阴，不可信，不能用来阻塞流水线。
//
// 候选口径（宁可窄而准）：
//   1) 命名空间只收**封闭刻度族**（字阶/颜色/圆角/阴影/行高/时长/字体/动画/缓动/层级）；
//      `animate-*` 与 `ease-*` 是 2026-09-27 补入的——此前漏掉这两个命名空间，导致
//      `animate-spin-slow` 与 `ease-ease` 两个实测幽灵类（C7 四例之二）逃过检查；
//      真正开放的命名空间（grid/flex/space/任意值…）不收：语义 token 经 @theme 桥接、
//      组合爆炸，误报率高；
//   2) 只在**字符串字面量**里取候选——JS/JSX 里类名唯一的写法就是引号/模板字符串，
//      这样天然排除注释与散文里形似类名的词（`text-color` / `font-size` / JSDoc 里的
//      `--text-10` 之类实测误报），而 `.ts` 常量文件里的类名（同样是字符串）照常覆盖；
//   3) 变体前缀（hover: / sm: / group-data-[x]:）与透明度修饰（/50）都不影响 token 本体，
//      故只比对 token 名；`${...}` 动态拼接处直接跳过（无法静态比对）。
//
// 已知取舍：`.css` / `.mdx` 不纳入扫描（与其余设计脚本一致）；`text-(--var)` 这类 v4
// 变量简写不参与比对（不是「token 名」，且必然由 Tailwind 直接生成）。
const ROOT = join(PKG_ROOT, "src");
const ASSETS = join(PKG_ROOT, "dist", "assets");
const TARGET_EXT = new Set([".ts", ".tsx"]);

const NAMESPACES = [
  // 字阶 / 颜色 / 圆角 / 阴影 / 行高 / 时长 / 字体 / 动画 / 缓动 / 层级
  "text",
  "bg",
  "rounded",
  "shadow",
  "leading",
  "duration",
  "font",
  "animate",
  "ease",
  "z",
];

// 已生成类选择器：`.` 之后 \X 转义连读；未转义的 { } , ; : ( ) [ ] # > + ~ 与空白即结束。
// （排除 `;` 是为了不被 `--text-base:1rem;` 这类 CSS 自定义属性声明误吞。）
const CLASS_SELECTOR = /\.((?:\\[\s\S]|[^\\\s{},;:()[\]#>+~])+)/g;

// 字符串字面量（双引号 / 单引号 / 模板字符串，均容忍转义）
const STRING_LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;

// 候选类名：`<命名空间>-<值>`（值含小数档 leading-8.5 / gap-3.5）
const CANDIDATE = new RegExp(
  `(?<![\\w-])(?:${NAMESPACES.join("|")})-(?:\\[[^\\]\\s]*\\]|[a-zA-Z0-9][\\w-]*(?:\\.[0-9]+)?)`,
  "g"
);

// 候选豁免（精确匹配，逐条写明理由）。误报优先靠收窄候选口径解决，此处只留「形态上就是
// 类名、但根本不是 Tailwind 类」的词；新增条目必须在注释里写明理由。
const IGNORED_CANDIDATES = new Set([
  // twMerge 的 class-group 键名（src/lib/utils.ts 的 extendTailwindMerge 配置），
  // 是分组标识而非可应用的类；Tailwind 里也没有 font-size / text-color 这两个工具类。
  "font-size",
  "text-color",
]);

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

// ── 1. 找构建产物 ────────────────────────────────────────────────────────
let cssPath = null;
try {
  const css = readdirSync(ASSETS)
    .filter((f) => /^index-.*\.css$/.test(f))
    .sort();
  if (css.length > 0) {
    cssPath = join(ASSETS, css.at(-1));
  }
} catch {
  cssPath = null;
}

if (cssPath === null) {
  console.log(
    "check-undefined-classes: 未找到构建产物 dist/assets/index-*.css，跳过本检查。\n" +
      "  本检查以构建产物为判据，请先执行 `pnpm --filter frontend build`（或 `pnpm build`）后重跑。"
  );
  process.exit(0);
}

const srcFiles = walk(ROOT);

// ── 2. 产物比源码旧则跳过（结果同时含假阳/假阴，不可信）───────────────────
const cssMtime = statSync(cssPath).mtimeMs;
let newestSrc = null;
for (const file of srcFiles) {
  const mtime = statSync(file).mtimeMs;
  if (newestSrc === null || mtime > newestSrc.mtime) {
    newestSrc = { file, mtime };
  }
}
if (newestSrc !== null && newestSrc.mtime - cssMtime > 1000) {
  console.log(
    "check-undefined-classes: 构建产物早于源码，跳过本检查（陈旧产物的比对结果不可信）。\n" +
      `  产物：${relative(PKG_ROOT, cssPath)}\n` +
      `  较新源码：${relative(PKG_ROOT, newestSrc.file)}\n` +
      "  请先执行 `pnpm --filter frontend build` 后重跑。"
  );
  process.exit(0);
}

// ── 3. 抽出「已生成」类名集合 ─────────────────────────────────────────────
const generated = new Set();
const remember = (raw) => {
  const unescaped = raw.replace(/\\(.)/g, "$1");
  const noBang = unescaped.replace(/^!/, ""); // important 修饰
  const last = noBang.split(":").pop(); // 变体前缀
  const body = last.replace(/\/[^/]*$/, ""); // 透明度修饰
  for (const token of [unescaped, noBang, last, body]) {
    if (token) generated.add(token);
  }
};

const cssText = readFileSync(cssPath, "utf8");
for (const match of cssText.matchAll(CLASS_SELECTOR)) {
  remember(match[1]);
}

// ── 4. 收集源码候选（仅字符串字面量）并比对 ──────────────────────────────
const offenders = [];
let candidateCount = 0;
for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  for (const literal of text.matchAll(STRING_LITERAL)) {
    const content = literal[1] ?? literal[2] ?? literal[3] ?? "";
    for (const match of content.matchAll(CANDIDATE)) {
      let token = match[0];
      let end = match.index + token.length;
      // `${...}` 动态拼接：匹配到这里会在 `$` 前截断，直接跳过
      if (content.startsWith("$", end)) continue;
      // v4 的 CSS 变量简写 `rounded-l-(--cell-radius)`：`-(` 说明后面是变量名而非档位
      if (content.startsWith("(-", end)) continue;
      // 侧向档 + 任意值（`rounded-t-[calc(...)]`）需连读补全；否则丢掉贪心吃进来的尾横线
      const bracket = /^\[[^\]\s]*\]/.exec(content.slice(end));
      if (bracket) {
        token += bracket[0];
        end += bracket[0].length;
      } else if (token.endsWith("-")) {
        token = token.slice(0, -1);
      }
      if (IGNORED_CANDIDATES.has(token)) continue;
      candidateCount += 1;
      if (!generated.has(token)) {
        offenders.push({ file, token });
      }
    }
  }
}

if (offenders.length > 0) {
  const lines = offenders.map(
    (o) => `${o.file}: ${o.token}  ← 构建产物中无此选择器（token 名拼写错误 / 未登记进 @theme / 命名空间不对）`
  );
  console.error(
    `Found undefined Tailwind classes (${offenders.length} 处「写了不生成 CSS」的幽灵类):\n` +
      lines.join("\n") +
      "\n提示：命名空间须与 Tailwind 一致（如 duration 读的是 --transition-duration-*，" +
      "不是 --duration-*）；确认无误后先 `pnpm build` 复跑，排除产物陈旧的干扰。"
  );
  process.exit(1);
}

console.log(
  `Undefined class check passed (比对已生成选择器 ${generated.size} 个 / 源码候选 ${candidateCount} 个).`
);

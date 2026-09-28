/**
 * design-governance —— E 类方案 §四 4.1 的 ESLint 规则插件
 *
 * 承载设计宪法 §19 里**只有 AST 才能可靠判定**的 3 条规则（逐行正则做不到跨行属性、
 * 嵌套与条件渲染，这正是把门禁从 grep 升级到 ESLint 的技术前提）：
 *
 *   - `no-naked-controls`  §19.2 禁止裸原子控件
 *   - `no-visual-override` §19.4 D2 禁止用 className 改写组件核心视觉
 *   - `no-adhoc-tone`      §19.5 禁止页面/模块自造 status→颜色 映射对象
 *
 * ## 本轮口径：一律 `warn`，零 `error`
 *
 * 方案 §六 批 5：「先 warn 一轮，再转 error」。存量命中量大（见各规则的命中统计），
 * 先以 warn 暴露全貌、由人来决定分批清剿顺序，**不缩窄规则去换绿色**。
 * 转 error 的前提是存量清零；豁免机制（`design-governance.allowlist.json`，见
 * `./allowlist.js`）已于 2026-09-28 落地——存量中「不可迁移但可解释」的范围
 * （如设计系统展示页，宪法附录 A.1）逐条登记豁免，其余迁移或裁决。
 *
 * ## 与既有脚本的关系：并存，不替代
 *
 * `scripts/check-*.mjs`（8 个）**全部保留**——它们做的是文本层检查，正则足够且性能好。
 * 本插件只承接需要 AST 的那 3 条，两者不互相调用、不互相推翻。
 *
 * ## 规则口径（与方案 §4.1 表格的差异见各规则注释）
 *
 * 测试文件（`*.test.tsx` / `*.spec.tsx` / `__mocks__` / `__fixtures__` / `test-utils`）
 * 不参与设计治理：它们不是出厂 UI，对其报错只会淹没真实信号。这与本仓既有 8 个
 * `check-*.mjs`（均排除 `.test.tsx`）口径一致。
 */

import { isExempt } from "./allowlist.js";

/** 正斜杠归一（Windows 的 path.join 给反斜杠，includes("a/b") 会静默失败） */
const toPosix = (p) => p.split("\\").join("/");

const isTestFile = (filename) => {
  const f = toPosix(filename);
  return (
    /\.(test|spec)\.[jt]sx?$/.test(f) ||
    f.includes("/__mocks__/") ||
    f.includes("/__fixtures__/") ||
    f.includes("/test-utils/")
  );
};

/** 原子层唯一命名空间：src/components/ui/（§19.1） */
const isUiAtomFile = (filename) => toPosix(filename).includes("/components/ui/");

// ---------------------------------------------------------------------------
// §19.2 禁止裸组件
// ---------------------------------------------------------------------------

/**
 * 裸原子控件 → 替代品（§19.2 表格）。
 *
 * ⚠️ 与方案 §4.1 表格的差异（**已报出，非遗漏**）：方案表格只列了 6 个标签，
 * §19.2 正文另有 `<a>`（条件禁止）与 `<img>`。
 * - `<a>` 的判定依赖 `href` 的**字面量**是否以 `http` 开头；`href={expr}` 时静态不可知，
 *   加了必然产生大量误报（本仓当前 `href={` 形态占多数）。故本轮**不纳入**。
 * - `<img>` 本轮**不纳入**：§19.2 允许「其他场景登记豁免」，豁免机制
 *   （`design-governance.allowlist.json`，`./allowlist.js`）2026-09-28 已落地，
 *   纳入 `<img>` 前先按宪法附录 A.1 把合规的头像/装饰图边界登记清楚。
 * 两条均记入交付报告「未做/存疑」。
 */
const NAKED_CONTROL_REPLACEMENTS = {
  button: "ui/button 的 <Button>（用 variant / size 表达形态）",
  input: "ui/input（或按语义选 ui/native-select / ui/checkbox / ui/switch）",
  select: "ui/select-field（表单）或 ui/select（组合件）",
  textarea: "ui/textarea",
  label: "ui/label（+ ui/field 组合件）",
  table: "ui/table 套件",
};

const noNakedControls = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止在 src/components/ui/ 之外直接书写裸原子控件（§19.2）",
      url: "docs/design/修改方案-E类-2026-09-27.md#192-禁止裸组件-must",
    },
    schema: [],
    messages: {
      naked:
        "禁止裸 <{{tag}}>（§19.2）：在 src/components/ui/ 之外必须走原子层组件 —— 改用 {{replacement}}。" +
        "若确需豁免，请登记 design-governance.allowlist.json（须带 reason / owner / expiresAt）。",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    // 原子层自身就是这些标签的实现处（ui/table 内部必然写 <table>），豁免；
    // allowlist 已登记的范围（如设计系统展示页，附录 A.1）整文件豁免本规则。
    if (isUiAtomFile(filename) || isTestFile(filename)) return {};
    if (isExempt("no-naked-controls", filename)) return {};
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return; // <Foo.Bar> 之类不判
        const tag = node.name.name;
        const replacement = NAKED_CONTROL_REPLACEMENTS[tag];
        if (!replacement) return;
        context.report({
          node,
          messageId: "naked",
          data: { tag, replacement },
        });
      },
    };
  },
};

// ---------------------------------------------------------------------------
// §19.4 D2 视觉覆盖
// ---------------------------------------------------------------------------

/**
 * className 的合法边界（§19.4 表格）。
 *
 * **允许（定位类）**：`m-*` `col-span-*` `row-span-*` `basis-*` `grow` `shrink`
 * `self-*` `justify-self-*` `order-*` `relative` `absolute` `z-*` `hidden` `sr-only`
 * **禁止（视觉/内部几何类）**：`p-*` `h-*` `w-*` `min-h-*` `max-w-*` `text-*` `font-*`
 * `leading-*` `bg-*` `border-*` `ring-*` `shadow-*` `rounded-*` `gap-*`
 *
 * 实现为「禁止前缀表」而非「允许前缀表」：className 里混入 `group` / 自定义类名时，
 * 允许表会因「不认识的类名」而误报；禁止表只对**明确已知违反**的类名开口。
 */
const FORBIDDEN_CLASS_PREFIXES = [
  "p-", "px-", "py-", "pt-", "pb-", "pl-", "pr-", "ps-", "pe-",
  "h-", "w-", "min-h-", "min-w-", "max-h-", "max-w-", "size-",
  "text-", "font-", "leading-", "tracking-",
  "bg-", "border-", "ring-", "shadow-", "rounded-", "gap-", "space-x-", "space-y-",
];

/** 去掉 Tailwind 变体前缀：`hover:bg-x` → `bg-x`、`md:p-2` → `p-2`。
 *  用「最后一个 `:`」而非 split(':')[1]：`data-[state=open]:bg-x` 的方括号内也含 `:`。 */
const stripVariants = (token) => {
  const idx = token.lastIndexOf(":");
  return idx === -1 ? token : token.slice(idx + 1);
};

const offendingClassesIn = (raw) =>
  raw
    .split(/\s+/)
    .filter(Boolean)
    .map(stripVariants)
    .filter((t) => FORBIDDEN_CLASS_PREFIXES.some((p) => t === p.slice(0, -1) || t.startsWith(p)));

/** 取 className 属性里可静态求值的类名串；动态表达式（`className={cn(a, b)}`）返 null。 */
const staticClassName = (attrValue) => {
  if (!attrValue) return null;
  if (attrValue.type === "Literal" && typeof attrValue.value === "string") return attrValue.value;
  if (attrValue.type === "JSXExpressionContainer") {
    const e = attrValue.expression;
    if (e.type === "Literal" && typeof e.value === "string") return e.value;
    if (e.type === "TemplateLiteral" && e.expressions.length === 0) {
      return e.quasis.map((q) => q.value.cooked ?? q.value.raw).join("");
    }
  }
  return null;
};

const UI_IMPORT_RE = /(^@\/components\/ui\/)|(\/components\/ui\/)/;

const noVisualOverride = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止用 className 改写 ui 原子组件的核心视觉（§19.4 D2）",
      url: "docs/design/修改方案-E类-2026-09-27.md#194-变体优先原则-must",
    },
    schema: [],
    messages: {
      override:
        "禁止视觉覆盖（§19.4 D2）：<{{component}}> 的 className 里出现 `{{token}}`。" +
        "className 只允许定位类（m-* / col-span-* / self-* / order-* / z-* / relative / absolute / hidden / sr-only）；" +
        "需要新形态请在组件内新增 variant/size/tone（变体轴封闭词表见 §19.4）。",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isUiAtomFile(filename) || isTestFile(filename)) return {};
    if (isExempt("no-visual-override", filename)) return {};

    // 用**导入来源**而非组件名白名单识别「宿主是本仓 ui 原子组件」：
    // 名字白名单会把同名局部组件误判，且无法覆盖 `import { Button as B }`。
    const uiLocalNames = new Set();
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string" || !UI_IMPORT_RE.test(source)) return;
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier" || spec.type === "ImportDefaultSpecifier") {
            uiLocalNames.add(spec.local.name);
          }
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "className") return;
        const opening = node.parent;
        if (!opening || opening.type !== "JSXOpeningElement") return;
        if (opening.name.type !== "JSXIdentifier") return;
        if (!uiLocalNames.has(opening.name.name)) return;

        const raw = staticClassName(node.value);
        if (raw === null) return; // 动态拼接：静态不可判，不报（避免误报）
        const offenders = offendingClassesIn(raw);
        if (offenders.length === 0) return;
        context.report({
          node,
          messageId: "override",
          data: { component: opening.name.name, token: [...new Set(offenders)].join(" / ") },
        });
      },
    };
  },
};

// ---------------------------------------------------------------------------
// §19.5 状态色唯一映射
// ---------------------------------------------------------------------------

/** 颜色类：`bg-` / `text-` / `border-` / `ring-` / `fill-` / `stroke-` 后接字母。
 *  后接字母（而非 `[`）是为了排除排版类 `text-[11px]`、`text-sm` 之外的尺寸写法；
 *  `text-muted-foreground` / `bg-status-danger` 这类语义 token 同样命中——这正是要拦的。 */
const COLOR_CLASS_RE = /\b(?:bg|text|border|ring|fill|stroke)-[a-z]/;

/** status 词表（§19.5：「键含 status 词」）。覆盖本仓实测的命名词族。 */
const STATUS_WORD_RE =
  /(status|state|stage|phase|tone|severity|priority|health|result|progress)/i;

const noAdhocTone = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止页面/模块自造 status→颜色 映射对象（§19.5）",
      url: "docs/design/修改方案-E类-2026-09-27.md#195-状态色唯一映射-must",
    },
    schema: [],
    messages: {
      adhoc:
        "禁止自造状态色映射（§19.5）：`{{name}}` 是 status→颜色 的映射对象。" +
        "全库只允许一条链路：业务层 status→tone（src/shared/status/status-visuals.ts）→ 视觉层 tone→class（src/components/ui/tone.ts）。" +
        "请改用 tone（或 StatusPill / StatusIconFrame 等已封装消费方）。",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isTestFile(filename)) return {};
    if (isExempt("no-adhoc-tone", filename)) return {};
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      VariableDeclarator(node) {
        if (!node.init || node.init.type !== "ObjectExpression") return;
        const props = node.init.properties;
        if (props.length < 2) return;

        // 值里至少 2 处颜色类 → 这是一个「配色表」而非恰好含一个颜色的普通对象
        const colorProps = props.filter(
          (p) =>
            p.type === "Property" &&
            p.value.type === "Literal" &&
            typeof p.value.value === "string" &&
            COLOR_CLASS_RE.test(p.value.value)
        );
        if (colorProps.length < 2) return;

        // status 语境：变量名 / 类型标注 / 任一键名命中 status 词表
        const name =
          node.id.type === "Identifier"
            ? node.id.name
            : sourceCode.getText(node.id); // 解构等罕见形态，退化为源码文本
        const annotation = sourceCode.getText(node.id.typeAnnotation ?? node.id);
        const keyHit = props.some(
          (p) =>
            p.type === "Property" &&
            p.key &&
            STATUS_WORD_RE.test(p.key.type === "Identifier" ? p.key.name : String(p.key.value ?? ""))
        );
        if (!STATUS_WORD_RE.test(name) && !STATUS_WORD_RE.test(annotation) && !keyHit) return;

        context.report({ node, messageId: "adhoc", data: { name } });
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 插件出口（flat config 形态）
// ---------------------------------------------------------------------------

export default {
  meta: {
    name: "design-governance",
    version: "1.0.0",
  },
  rules: {
    "no-naked-controls": noNakedControls,
    "no-visual-override": noVisualOverride,
    "no-adhoc-tone": noAdhocTone,
  },
};

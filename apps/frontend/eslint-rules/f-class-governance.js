/**
 * f-class-governance —— F 类方案（docs/design/修改方案-F类-布局与组合-2026-09-28.md）
 * 批 F3 机器强制的 ESLint 规则插件
 *
 * 承载 F 类条文里**只有 AST 才能可靠判定**的规则（嵌套、祖先链、跨属性组合，
 * 文本层正则做不到或误报率高——与 E 类 design-governance 插件同一立项理由）：
 *
 *   - `no-dialog-width-escape`    F3.1   Dialog 宽度五档外逃逸（数字档 / 3xl+）
 *   - `no-page-handwritten-maxw`  F1.4   页面手写 mx-auto + max-w 居中容器（宽度须由母版分发）
 *   - `no-card-nesting`           F6.3   Card 同档嵌套（内层无 size="sm"）
 *   - `no-overlay-nesting`        F0     浮层互嵌（Dialog/Sheet/Drawer 内容件套内容件）
 *   - `no-section-card-in-dialog` F3.5   弹窗内禁 SectionCard（区块卡是页面层原语）
 *   - `require-page-header-icon`  F2.5①  L1 页面标题必带图标（骨架头豁免）
 *
 * 第 7 条 `no-standalone-form`（F3.6 原地 <form 检测）在 F3.6 存量迁移完成后另行
 * 启用——先落规则会把 9 项已知迁移靶全部打红，属「拿规则圈已有账」而非防回流。
 *
 * ## 口径
 *
 * - 一律 `warn`，零 `error`：与 design-governance 同款「先 warn 一轮，存量清零后转
 *   error」。lint 门禁不带 --max-warnings，warn 不弄红 CI。
 * - 豁免走**文件级内联白名单**（本文件常量，逐条带理由）：E 类的
 *   design-governance.allowlist.json 词表与 90 天 TTL 是 E 插件专属机制，F 类
 *   存量豁免均为「待迁移/展示页」性质，以源码常量 + 方案附录双登记承载；
 *   迁移完成后从白名单删行即可收紧。
 * - 测试文件不参与（与 design-governance 同口径）；`src/components/ui/**` 是
 *   原子层实现处，全部规则豁免。
 */

/** 正斜杠归一（Windows 路径分隔符） */
const toPosix = (p) => p.split('\\').join('/');

const isTestFile = (filename) => {
  const f = toPosix(filename);
  return (
    /\.(test|spec)\.[jt]sx?$/.test(f) ||
    f.includes('/__mocks__/') ||
    f.includes('/__fixtures__/') ||
    f.includes('/test-utils/')
  );
};

/** 原子层实现处：ui/** 内部的 <dialog> / max-w 等是组件自身实现，不是消费违规 */
const isUiAtomFile = (filename) => toPosix(filename).includes('/components/ui/');

// ---------------------------------------------------------------------------
// 共用工具
// ---------------------------------------------------------------------------

/** JSXOpeningElement 的组件名（Identifier 或 MemberExpression 的全名），非组件标签返回 null */
const jsxElementName = (opening) => {
  if (!opening || opening.type !== 'JSXOpeningElement') return null;
  if (opening.name.type === 'JSXIdentifier') return opening.name.name;
  if (opening.name.type === 'JSXMemberExpression') {
    const obj = opening.name.object;
    if (obj.type === 'JSXIdentifier') return `${obj.name}.${opening.name.property.name}`;
  }
  return null;
};

/** 收集 className 属性里的全部字符串字面量（含 cn(...) / 条件表达式内的静态段） */
const classNameLiterals = (opening) => {
  const attr = opening.attributes.find(
    (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'className',
  );
  if (!attr || !attr.value) return [];
  const literals = [];
  const visit = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') {
      literals.push(n.value);
      return;
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  };
  visit(attr.value);
  return literals;
};

/** 祖先链上是否存在满足谓词的 JSXOpeningElement（element 为自身 JSXElement，从其父级起算） */
const hasAncestorOpening = (element, pred) => {
  let cur = element && element.parent;
  while (cur) {
    if (cur.type === 'JSXElement' && pred(cur.openingElement)) return true;
    cur = cur.parent;
  }
  return false;
};

/** JSXElement 子树内（不含自身）满足谓词的全部 JSXOpeningElement */
const descendantOpenings = (element, pred) => {
  const hits = [];
  const visit = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'JSXElement' && n !== element) {
      if (pred(n.openingElement)) hits.push(n.openingElement);
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  };
  visit(element);
  return hits;
};

// ---------------------------------------------------------------------------
// F3.1 Dialog 宽度五档外逃逸
// ---------------------------------------------------------------------------

/** 禁用形态：数字档（max-w-100…）与 3xl 及以上；sm/md/lg/xl/2xl、full、none、token 族（max-w-dialog 等）合法 */
const DIALOG_BANNED_WIDTH_RE = /\bmax-w-(?:\d{2,3}|3xl|4xl|5xl|6xl|7xl)\b/;

const noDialogWidthEscape = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Dialog 宽度只许 F3.1 五档语义阶梯（禁数字档与 3xl+）',
      url: 'docs/design/修改方案-F类-布局与组合-2026-09-28.md#f31-宽度五档语义阶梯-must',
    },
    schema: [],
    messages: {
      escape:
        "Dialog 宽度逃逸五档（F3.1）：className 含「{{token}}」。合法档 = sm:max-w-sm/md/lg/xl/2xl（" +
        "默认 md）；全屏画布特例走 keepDefaultWidth 逃生舱并在方案附二登记。",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isUiAtomFile(filename) || isTestFile(filename)) return {};
    return {
      JSXOpeningElement(node) {
        if (jsxElementName(node) !== 'DialogContent') return;
        for (const literal of classNameLiterals(node)) {
          const hit = literal.match(DIALOG_BANNED_WIDTH_RE);
          if (hit) {
            context.report({ node, messageId: 'escape', data: { token: hit[0] } });
            return;
          }
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// F1.4 页面手写居中容器
// ---------------------------------------------------------------------------

/** 存量登记（F 方案附录附三同步）：L1/L2 页面骨架或内容层手写 mx-auto+max-w，待母版收编逐步清退；新页面禁新增 */
const HANDWRITTEN_CENTERING_LEGACY = new Set([
  'modules/acceptance/pages/acceptance-detail-page.tsx',
  'modules/ai-surface/pages/ai-surface-page.tsx',
  'modules/ai-surface/pages/ai-surface-replay-page.tsx',
  'modules/analytics/pages/analytics-page.tsx',
  'modules/design-system/pages/design-system-page.tsx',
  'modules/document/pages/document-edit-page.tsx',
  'modules/document/pages/document-new-page.tsx', // F3.6-⑥ 退役后自动消失，白名单行随之删
  'modules/document/pages/document-view-page.tsx',
  'modules/document/pages/documents-page.tsx',
  'modules/git/pages/repository-detail-page.tsx',
  'modules/git/pages/repository-settings-page.tsx',
  'modules/help/pages/help-page.tsx',
  'modules/intake/pages/requirement-intake-page.tsx',
  'modules/issue/pages/bug-detail-page.tsx',
  'modules/issue/pages/task-detail-page.tsx',
  'modules/project/pages/dashboard-page.tsx',
  'modules/project/pages/project-init-page.tsx',
  'modules/project/pages/project-settings-page.tsx',
  'modules/release/pages/release-detail-page.tsx',
  'modules/team-member/pages/member-detail-page.tsx',
  'modules/team-member/pages/team-detail-page.tsx',
  'modules/workspace/pages/new-workspace-page.tsx',
]);

const CENTERING_RE = /\bmx-auto\b/;
const CENTERING_MAXW_RE = /\bmax-w-(?:\[)?/;

const noPageHandwrittenMaxw = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '页面禁手写 mx-auto + max-w 居中容器，宽度一律由母版分发（F1.4）',
      url: 'docs/design/修改方案-F类-布局与组合-2026-09-28.md#f14-嵌套治理铁律--must',
    },
    schema: [],
    messages: {
      handwritten:
        '页面手写居中容器（F1.4）：宽度应由母版分发——L1 用 PageShell variant（full/wide/standard/reading），' +
        'L2 详情页用 project-detail-frame 自管双栏；确属内容级限宽（article/空态居中）请登记白名单并给理由。',
    },
  },
  create(context) {
    const filename = toPosix(context.filename ?? context.getFilename());
    if (isTestFile(filename) || isUiAtomFile(filename)) return {};
    // 只管页面文件；母版/组件层（project-detail-frame 等）是分发者本身，F1.2 授权自管
    if (!/-page\.tsx$/.test(filename)) return {};
    const rel = filename.replace(/^.*?src\//, '');
    const isLegacy = HANDWRITTEN_CENTERING_LEGACY.has(rel);
    return {
      JSXOpeningElement(node) {
        if (isLegacy) return;
        const literals = classNameLiterals(node);
        const joined = literals.join(' ');
        if (CENTERING_RE.test(joined) && CENTERING_MAXW_RE.test(joined)) {
          context.report({ node, messageId: 'handwritten' });
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// F6.3 Card 同档禁嵌
// ---------------------------------------------------------------------------

const noCardNesting = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Card 内禁直接嵌另一个默认档 Card（内层须 size="sm" 视觉降权，F6.3）',
      url: 'docs/design/修改方案-F类-布局与组合-2026-09-28.md#f63-嵌套三律--must',
    },
    schema: [],
    messages: {
      nested:
        'Card 嵌 Card（F6.3 同档禁嵌/深度≤2）：内层卡必须 size="sm" + 视觉降权（border/底色去投影）；' +
        '第三层内容改用 DataList 行 / PropertyRow 承载。',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isUiAtomFile(filename) || isTestFile(filename)) return {};
    return {
      JSXElement(node) {
        if (jsxElementName(node.openingElement) !== 'Card') return;
        for (const inner of descendantOpenings(node, (o) => jsxElementName(o) === 'Card')) {
          const sizeAttr = inner.attributes.find(
            (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'size',
          );
          const sizeVal =
            sizeAttr && sizeAttr.value && sizeAttr.value.type === 'Literal'
              ? sizeAttr.value.value
              : null;
          if (sizeVal !== 'sm') {
            context.report({ node: inner, messageId: 'nested' });
          }
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// F0 浮层串行律：Dialog/Sheet/Drawer 内容件互嵌
// ---------------------------------------------------------------------------

const OVERLAY_CONTENT_NAMES = new Set(['DialogContent', 'SheetContent', 'DrawerContent']);

const noOverlayNesting = {
  meta: {
    type: 'problem',
    docs: {
      description: '浮层（Dialog/Sheet/Drawer）互嵌禁止，二次确认走 AlertDialog（F0 浮层串行律）',
      url: 'docs/design/修改方案-F类-布局与组合-2026-09-28.md#f0-界面层级模型-must',
    },
    schema: [],
    messages: {
      nested:
        '浮层嵌套（F0 串行律）：{{inner}} 嵌在 {{outer}} 内。需要二次确认一律在其上叠加 AlertDialog（Portal 同层）。',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isUiAtomFile(filename) || isTestFile(filename)) return {};
    return {
      JSXOpeningElement(node) {
        const name = jsxElementName(node);
        if (!name || !OVERLAY_CONTENT_NAMES.has(name)) return;
        const outer = hasAncestorOpening(
          node.parent,
          (o) => OVERLAY_CONTENT_NAMES.has(jsxElementName(o)),
        );
        if (outer) {
          context.report({ node, messageId: 'nested', data: { inner: name, outer: '浮层内容件' } });
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// F3.5 弹窗内禁 SectionCard
// ---------------------------------------------------------------------------

const noSectionCardInDialog = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Dialog 内禁用 SectionCard（页面区块卡原语），子区块用微卡/分区骨架（F3.5）',
      url: 'docs/design/修改方案-F类-布局与组合-2026-09-28.md#f35-富弹窗内部组合三型选型--must',
    },
    schema: [],
    messages: {
      banned:
        '弹窗内 SectionCard（F3.5 约束 1）：SectionCard 是页面区块卡；文档流型用微卡 rounded-lg border bg-background px-2.5 py-2，工作台型用分区骨架。',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (isUiAtomFile(filename) || isTestFile(filename)) return {};
    return {
      JSXOpeningElement(node) {
        if (jsxElementName(node) !== 'SectionCard') return;
        if (hasAncestorOpening(node.parent, (o) => jsxElementName(o) === 'DialogContent')) {
          context.report({ node, messageId: 'banned' });
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// F2.5① L1 页面标题必带图标
// ---------------------------------------------------------------------------

/** 豁免：Loading 骨架头 / 数据缺失异常态头（X8 裁决豁免类）与设计系统展示页 demo */
const PAGE_HEADER_ICON_WHITELIST = [
  'modules/git/pages/repository-settings-page.tsx', // Loading 骨架头，X8 裁决豁免
  'modules/settings/pages/sections/linear-integration-section.tsx', // 46 行「未找到」异常态头（真实分支已带 LinearIcon）
  'modules/design-system/', // 展示页 demo 不代表真实页面形态
];

const requirePageHeaderIcon = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'PageHeader 的 icon 槽必填（实体页用实体图标，功能页用功能图标，F2.5①）',
      url: 'docs/design/修改方案-F类-布局与组合-2026-09-28.md#f25-标题图标分层规定不做全站一刀切--must',
    },
    schema: [],
    messages: {
      missing:
        'PageHeader 缺 icon（F2.5① L1 页面标题必带图标）：实体页从 entity-icons 取实体图标，功能页用功能图标；唯一豁免 = Loading 骨架头。',
    },
  },
  create(context) {
    const filename = toPosix(context.filename ?? context.getFilename());
    if (isTestFile(filename) || isUiAtomFile(filename)) return {};
    if (PAGE_HEADER_ICON_WHITELIST.some((w) => filename.includes(w))) return {};
    return {
      JSXOpeningElement(node) {
        if (jsxElementName(node) !== 'PageHeader') return;
        const hasIcon = node.attributes.some(
          (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'icon',
        );
        if (!hasIcon) context.report({ node, messageId: 'missing' });
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 插件出口（flat config 形态）
// ---------------------------------------------------------------------------

export default {
  meta: {
    name: 'f-class-governance',
    version: '1.0.0',
  },
  rules: {
    'no-dialog-width-escape': noDialogWidthEscape,
    'no-page-handwritten-maxw': noPageHandwrittenMaxw,
    'no-card-nesting': noCardNesting,
    'no-overlay-nesting': noOverlayNesting,
    'no-section-card-in-dialog': noSectionCardInDialog,
    'require-page-header-icon': requirePageHeaderIcon,
  },
};

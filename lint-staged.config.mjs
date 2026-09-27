/**
 * pre-commit 只处理暂存文件：eslint 按各包自己的配置做 --fix 与把关。
 * lint-staged 传入的是绝对路径，server(eslintrc) 按文件位置解析配置、
 * frontend(flat config) 按 pnpm --filter exec 切换后的 cwd 解析配置，均不受根目录影响。
 * 全量 type-check + lint 已移至 .husky/pre-push。
 * 设计宪法（docs/design/PRINCIPLES.md）的四个治理脚本同样在 pre-commit 把关：
 * 它们都是纯文本全库扫描（单个 0.2~0.6s，四个合计约 1.5s），能跟上提交节奏。
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 本配置由 lint-staged 从仓库根加载，`import.meta.url` 即仓库根的可靠来源。
// 设计脚本一律用**绝对路径**调用（脚本自身也已锚定 import.meta.url，见 PKG_ROOT），
// 双重目的：任务不再依赖 worker 进程的 cwd——实测其 cwd 既不是仓库根也不是 app 根，
// 写相对路径会解析到不存在的目录并报「系统找不到指定的路径」。
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const designCheck = (name) =>
  `node "${join(REPO_ROOT, "apps", "frontend", "scripts", name)}"`;

export default {
  'apps/server/**/*.ts': (files) =>
    `pnpm --filter server exec eslint --fix ${files.map((f) => `"${f}"`).join(' ')}`,
  'apps/frontend/**/*.{ts,tsx}': (files) =>
    `pnpm --filter frontend exec eslint --fix ${files.map((f) => `"${f}"`).join(' ')}`,
  // 设计治理（宪法 §11 豁免与修订）：frontend src 一旦变更即跑四个设计脚本。
  // 四个脚本都是「全库扫描」语义（不按暂存文件过滤），故用函数形态返回固定命令——
  // lint-staged 只对字符串任务追加文件参数（getSpawnedTasks.js），函数任务原样执行。
  // 这里直接 node 而非 `pnpm --filter ... run`：脚本自身只要 0.2~0.6s，四次 pnpm 启动
  // 却要额外 ~6.5s（实测 7.96s → 1.47s）；脚本内容与 package.json 的 lint:* 完全一致。
  //
  // ⚠️ 不写 `cd`、不用相对路径（详见 REPO_ROOT 处注释）。
  // 不接入 check-undefined-classes：它依赖 dist/ 构建产物，而 pre-commit 阶段没有构建
  // （缺产物时该脚本会自行跳过并以 0 退出，接入也无意义）。
  'apps/frontend/src/**/*.{ts,tsx,css}': () =>
    [
      designCheck('check-spacing-governance.mjs'),
      designCheck('check-palette.mjs'),
      designCheck('check-component-registry.mjs'),
      designCheck('check-semantic-classes.mjs'),
    ].join(' && '),
};

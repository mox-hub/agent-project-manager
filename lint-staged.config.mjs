/**
 * pre-commit 只处理暂存文件：eslint 按各包自己的配置做 --fix 与把关。
 * lint-staged 传入的是绝对路径，server(eslintrc) 按文件位置解析配置、
 * frontend(flat config) 按 pnpm --filter exec 切换后的 cwd 解析配置，均不受根目录影响。
 * 全量 type-check + lint 已移至 .husky/pre-push。
 */
export default {
  'apps/server/**/*.ts': (files) =>
    `pnpm --filter server exec eslint --fix ${files.map((f) => `"${f}"`).join(' ')}`,
  'apps/frontend/**/*.{ts,tsx}': (files) =>
    `pnpm --filter frontend exec eslint --fix ${files.map((f) => `"${f}"`).join(' ')}`,
};

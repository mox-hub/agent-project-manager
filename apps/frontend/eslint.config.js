import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import designGovernance from './eslint-rules/design-governance.js'

export default defineConfig([
  globalIgnores([
    'dist',
    'public/mockServiceWorker.js',
    'tailwind.config.js',
    '@/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // —— D11 无障碍「阶段 1」：低误报、无设计取舍空间的规则，一律 `error` ——
      // 依据 docs/design/审计-D10断点与D11无障碍-2026-09-27.md §3.3 阶段 1（18 条）。
      // 阶段 2/3 的规则（no-static-element-interactions / label-has-associated-control /
      // no-autofocus / no-aria-hidden-on-focusable …）存量较大，待存量清剿后再开，此处保持未启用。
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/iframe-has-title': 'error',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // `_` 前缀 = 接口实现占位参数/有意保留的未用绑定（清零 warning 约定）
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      // 以下两条为 React Compiler 专属规则；本项目未启用 React Compiler
      // （package.json 无 babel-plugin-react-compiler），属误报，予以关闭。
      'react-hooks/incompatible-library': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    // Playwright e2e spec：非 React 组件树，`use()` 是测试夹具不是 Hook
    files: ['e2e/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // ══ E 类批 5：设计门禁 AST 规则（design-governance）═════════════════════════
  // 依据 docs/design/修改方案-E类-2026-09-27.md §四 4.1（第 431–450 行）与批 5（§六）。
  // 规则实现见 ./eslint-rules/design-governance.js（3 条：no-naked-controls /
  // no-visual-override / no-adhoc-tone），承接 §19.2 / §19.4 D2 / §19.5 里
  // **只有 AST 才能可靠判定**的部分；8 个 check-*.mjs 保留并存，不替代、不改写。
  //
  // ⚠️ 本轮一律 `warn`，零 `error`（方案 §六批 5 第 569 行「先 warn 一轮，再转 error」）。
  // 实测 `pnpm lint`（frontend = 9 个 lint:* 脚本 + `eslint .`）与 CI quality-gate.yml
  // 均**不带 `--max-warnings`**，故 warn 不会把门禁弄红、不阻塞并行提交；
  // 转 error 的前提是存量清零。豁免机制（design-governance.allowlist.json）已于
  // 2026-09-28 落地（读取实现 ./eslint-rules/allowlist.js，登记约束见宪法附录 A.1）。
  //
  // 本块为**新增**，不改动上方 D11 的 jsx-a11y 块（批 9b，18 条 error）。
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'design-governance': designGovernance,
    },
    rules: {
      'design-governance/no-naked-controls': 'warn',
      'design-governance/no-visual-override': 'warn',
      'design-governance/no-adhoc-tone': 'warn',
    },
  },
])

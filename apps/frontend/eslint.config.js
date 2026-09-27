import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
])

import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['electron/dist/**', 'release/**', 'src-tauri/**', 'build/**', 'scripts/**'],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['electron/src/**/*.ts', 'tsup.config.ts'],
  })),
  {
    files: ['electron/src/**/*.ts', 'tsup.config.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Electron main/preload 按模块组织，允许 dev 依赖类型导入的省略写法由 tsc 把关
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);

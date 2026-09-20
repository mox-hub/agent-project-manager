import globals from 'globals';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // src/generated/** 由生成器产出（如 nestjs-i18n 的 i18n.generated.ts），
  // 生成器会回写还原，禁止手改，直接整目录 ignore。
  { ignores: ['dist', 'coverage', 'eslint.config.mjs', 'src/generated/**'] },
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);

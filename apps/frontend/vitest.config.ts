import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright e2e 归 playwright 跑，vitest 误收会在 collect 阶段报错
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // 设置覆盖率阈值（目标是 80%）
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'node_modules/',
        'src/templates/', // 参考模板，无测试
        'src/test/',
        'src/__mocks__/',
        'src/test-utils/',
        'src/__fixtures__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'public/',
      ],
      // 每个文件的覆盖率报告
      all: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@apm/shared': path.resolve(__dirname, '../../packages/apm-shared/src'),
    },
  },
});

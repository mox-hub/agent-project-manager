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
    // 并行裁决（2026-09-18）：threads 池 16 worker 下内存膨胀假死（100% CPU /
    // 73% 内存后启动阶段卡死），forks 并行又与抢核互相放大。与 server e2e 同款
    // 串行先例：forks + 单 worker 顺序执行（等价 jest --runInBand），稳定优先。
    pool: 'forks',
    fileParallelism: false,
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
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@apm/shared': path.resolve(__dirname, '../../packages/apm-shared/src'),
    },
  },
});

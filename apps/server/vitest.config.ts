import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * server 单测配置（Vitest 替代 Jest 的迁移基建）。
 *
 * 关键点：Nest 依赖 emitDecoratorMetadata 做构造器注入，Vitest 默认的 esbuild
 * 不支持该编译选项——必须走 unplugin-swc（swc 支持）转换，否则 DI 全崩。
 * e2e 与 contract:export 仍走 jest 链路（test/jest-e2e.json），迁移在后续切片。
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // forks 池为稳定性兜底：threads 池实测快 2.4 倍，但 Mastra/workflow 套件在
    // worker_threads 下非确定性挂起（2026-09-18 实证：同配置一次绿一次 43s 无声
    // 死亡 exit 5），进程级强隔离 + 强杀更可靠。勿在未复验前改 pool。
    pool: 'forks',
    // 防与 frontend 并行跑时 CPU 饱和，Nest DI 编译超默认 10s 的误报（对齐 e2e 配置先例）
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // 沿用 jest 时代的全局基线（--coverage 触发时生效）
      thresholds: {
        statements: 11,
        branches: 10,
        functions: 9,
        lines: 11,
      },
    },
  },
});

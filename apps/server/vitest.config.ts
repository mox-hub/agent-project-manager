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
    // AppModule 全量启动内存重：forks 池按文件回收进程，避免 jest 式常驻累积
    pool: 'forks',
  },
});

import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * server e2e 配置（自 Jest 迁移）：test/ 目录的 *.e2e-spec.ts，串行执行
 * （singleFork 等价 jest --runInBand——e2e 共享 dev/template 库资源，勿并行）。
 * octokit 与 @/ 别名沿用原 jest moduleNameMapper 的映射。
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
      '^octokit$': path.resolve(__dirname, 'test/octokit.stub.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // AppModule 全量启动 + 工作区库副本初始化，放宽超时
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

import { defineConfig } from 'vitest/config';

// dist/ 下的 CJS 编译产物被 tsc（非 build 配置）连同测试一起产出，
// vitest 默认 include 会扫到 *.test.js 产物并以 require("vitest") 炸掉——
// 测试只跑 src/ 源码，构建产物一律排除。
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', 'dist/**'],
  },
});

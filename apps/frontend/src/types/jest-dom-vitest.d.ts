/**
 * jest-dom matchers 的 vitest 断言类型增强（toBeInTheDocument 等）。
 * 运行时由 src/test/setup.ts 的 expect.extend(matchers) 提供；
 * 类型侧通过本文件的副作用 import 全局生效（对齐 jest-dom v6 官方 vitest 集成）。
 */
import '@testing-library/jest-dom/vitest';

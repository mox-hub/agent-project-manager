/**
 * 模块边界巡检（report-only，暂不入 quality gate）。
 * 运行：pnpm check:boundaries
 * 规则意图：
 *  - core/* 是地基，禁止反向依赖 modules/*（依赖方向必须 modules → core）
 *  - common/* 同理，只许被依赖不许依赖业务模块
 *  - modules 之间禁止深挖内部路径（只许 import 对方顶层 Module 类 / 公开入口）
 */
module.exports = {
  forbidden: [
    {
      name: 'core-not-depend-on-modules',
      comment: 'core 层是地基，依赖方向必须 modules → core',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'common-not-depend-on-modules',
      comment: 'common 是跨模块公共件，不许依赖业务模块',
      severity: 'error',
      from: { path: '^src/common/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'modules-deep-import-between-modules',
      comment:
        '跨模块只许引对方顶层 Module 类或公开入口（*.module.ts / index.ts），禁止深挖内部文件',
      severity: 'warn',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/(?!$1/)[^/]+/',
        pathNot: [
          '^src/modules/[^/]+/[^/]+\\.module\\.ts$',
          '^src/modules/[^/]+/index\\.ts$',
        ],
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: './tsconfig.json' },
    prefix: '@/',
  },
};

/**
 * octokit jest 桩：octokit v5 为 ESM-only 包，jest CJS 环境无法直接 require。
 * e2e 不应打真实 GitHub API（在 service 层 mock），这里只提供可实例化的空壳，
 * 让 AppModule 能完成加载并生成路由元数据。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const throwingEndpoint = (): never => {
  throw new Error('octokit is stubbed in jest; mock at service layer instead');
};

const restProxy: any = new Proxy({}, { get: () => throwingEndpoint });

export class Octokit {
  rest: any = restProxy;
  paginate = throwingEndpoint;
  request = throwingEndpoint;

  constructor(_options?: unknown) {}

  static plugin(..._plugins: unknown[]): typeof Octokit {
    return Octokit;
  }
}

export default Octokit;

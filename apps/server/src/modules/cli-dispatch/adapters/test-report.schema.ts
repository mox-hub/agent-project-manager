/**
 * 测试报告 schema
 * 用于 cli-dispatch adapters 输出结构化测试结果，并通过 ExecutionArtifact 持久化。
 * 接收方依据本 schema 校验报告完整性。
 */

export interface TestCaseResult {
  /** 测试用例名 */
  name: string;
  /** 类/模块分组 */
  classname?: string;
  /** 状态 */
  status: 'passed' | 'failed' | 'skipped' | 'error';
  /** 耗时（毫秒） */
  durationMs?: number;
  /** 失败原因（status=failed|error 时必填） */
  message?: string;
  /** stack trace（status=failed|error 时可选） */
  stack?: string;
}

export interface CoverageMetrics {
  /** 行覆盖率 0-1（如 0.82 = 82%） */
  lines?: number;
  /** 分支覆盖率 0-1 */
  branches?: number;
  /** 函数覆盖率 0-1 */
  functions?: number;
  /** statement 覆盖率 0-1 */
  statements?: number;
}

export interface TestReportPayload {
  /** 报告 schema 版本 */
  schemaVersion: 1;
  /** 报告来源，如 'jest' | 'vitest' | 'pytest' | 'go-test' | 'custom' */
  source: string;
  /** 全部用例数 */
  total: number;
  /** 通过数 */
  passed: number;
  /** 失败数 */
  failed: number;
  /** 跳过数 */
  skipped: number;
  /** 错误数（环境/配置等导致的非预期失败） */
  errored?: number;
  /** 整体耗时（毫秒） */
  durationMs?: number;
  /** 覆盖率 */
  coverage?: CoverageMetrics;
  /** 用例详情（可选，若上百条可放到 storageRef） */
  cases?: TestCaseResult[];
  /** 大报告 / junit 原始文件引用 */
  junitRef?: string;
  /** 报告生成时间（ISO） */
  generatedAt: string;
}

export const TEST_REPORT_SCHEMA_VERSION = 1 as const;

/**
 * 校验测试报告字段完整性。
 * 返回缺失字段；缺失即视为 "received but invalid"。
 */
export function validateTestReport(
  report: unknown,
):
  | { valid: true; report: TestReportPayload }
  | { valid: false; missing: string[]; report?: TestReportPayload } {
  if (!report || typeof report !== 'object') {
    return { valid: false, missing: ['<root>'] };
  }
  const r = report as Partial<TestReportPayload>;
  const missing: string[] = [];
  if (r.schemaVersion !== TEST_REPORT_SCHEMA_VERSION)
    missing.push('schemaVersion');
  if (typeof r.source !== 'string' || !r.source) missing.push('source');
  if (typeof r.total !== 'number') missing.push('total');
  if (typeof r.passed !== 'number') missing.push('passed');
  if (typeof r.failed !== 'number') missing.push('failed');
  if (typeof r.skipped !== 'number') missing.push('skipped');
  if (typeof r.generatedAt !== 'string') missing.push('generatedAt');

  if (missing.length > 0) {
    return { valid: false, missing, report: r as TestReportPayload };
  }
  return { valid: true, report: r as TestReportPayload };
}

/**
 * 完成契约类型枚举
 */
export type CompletionType = 'pr' | 'test_report' | 'document' | 'artifact';

/**
 * 根据任务类型 + 标签推断默认完成契约。
 * 规则：
 * - 任务有 'test'/'qa' label → test_report
 * - 任务 type='doc' 或有 'documentation' label → document
 * - 任务 type='feature' 且标签里有 'breaking-change' → pr
 * - 其余默认 'artifact'
 */
export function inferCompletionType(
  task: { type?: string | null; tags?: string[] | null } | null | undefined,
): CompletionType {
  if (!task) return 'artifact';
  const tags = (task.tags ?? []).map((t) => t.toLowerCase());

  if (
    tags.some(
      (t) =>
        t.includes('test') || t.includes('qa') || t.includes('verification'),
    )
  ) {
    return 'test_report';
  }
  if (task.type === 'doc' || tags.some((t) => t.includes('doc'))) {
    return 'document';
  }
  if (tags.some((t) => t.includes('breaking') || t.includes('release'))) {
    return 'pr';
  }
  return 'artifact';
}

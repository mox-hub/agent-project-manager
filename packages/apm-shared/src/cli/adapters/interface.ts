/**
 * CLI 适配器接口
 *
 * 自 apps/server/src/modules/cli-dispatch/adapters/cli-adapter.interface.ts 迁移，
 * 保持框架无关（仅依赖 child_process）。CommandBuildResult 扩展 stdinData 以修复
 * prompt 传递缺陷。
 */

export type ProviderId = 'claude-code' | 'codex' | 'zcode';

export interface Artifact {
  type: string;
  name: string;
  content?: string;
  storageRef?: string;
  metadata?: Record<string, unknown>;
}

export const TEST_REPORT_ARTIFACT_TYPE = 'test_report';

export type ArtifactType =
  | 'code_diff'
  | 'command_output'
  | 'file_path'
  | 'screenshot'
  | 'log'
  | 'report'
  | 'test_report';

export interface ExecutionStepUpdate {
  stepType:
    | 'tool_call'
    | 'observation'
    | 'thinking'
    | 'approval_gate'
    | 'error'
    | 'result';
  name?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  sequence?: number;
}

export interface ApprovalHint {
  requestedAction: string;
  actionType:
    | 'tool_call'
    | 'git_write'
    | 'terminal_exec'
    | 'external_sync'
    | 'status_change';
  riskLevel: 'read' | 'write' | 'high_risk';
  reason?: string;
}

export interface StreamEmitter {
  token?: (delta: string) => void;
  step?: (step: ExecutionStepUpdate) => void;
  approvalNeeded?: (req: ApprovalHint) => void;
}

export interface CliExecutionInput {
  workspaceRoot: string;
  prompt: string;
  sessionId?: string;
  model?: string;
  allowedTools?: string[];
  maxTokens?: number;
  timeout?: number;
}

export interface DetectResult {
  available: boolean;
  version?: string;
  error?: string;
}

export interface CommandBuildResult {
  cmd: string;
  args: string[];
  env: Record<string, string>;
  /**
   * stdin 数据（claude 的 stream-json 模式）。
   * process-runner 会写入子进程 stdin 后关闭；避免 prompt 未送达的缺陷。
   */
  stdinData?: string;
}

export interface ParseResult {
  status: 'completed' | 'failed';
  artifacts: Artifact[];
  error?: string;
  output?: Record<string, unknown>;
  /** 终事件携带的 token 用量（stream-json result 事件），缺失表示 CLI 未上报 */
  usage?: CliUsage;
}

/** CLI token 用量（统一为 prompt/completion/total 口径） */
export interface CliUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** CLI 直接给出的美元成本（如 claude 的 total_cost_usd），可选 */
  costUsd?: number;
  model?: string;
}

/**
 * 从 stream-json 终事件 JSON 中尽力提取用量。
 * 兼容 claude（input_tokens/output_tokens/total_cost_usd）、
 * openai 系（prompt_tokens/completion_tokens）与 AI SDK
 * （inputTokens/outputTokens）三种常见口径。
 */
export function extractCliUsage(data: unknown): CliUsage | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const usage = (
    (record.usage as Record<string, unknown> | undefined) ?? record
  );
  const num = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = usage[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return undefined;
  };
  const promptTokens = num('input_tokens', 'prompt_tokens', 'promptTokens', 'inputTokens');
  const completionTokens = num(
    'output_tokens',
    'completion_tokens',
    'completionTokens',
    'outputTokens',
  );
  if (promptTokens === undefined && completionTokens === undefined) {
    return undefined;
  }
  const totalTokens =
    num('total_tokens', 'totalTokens') ??
    (promptTokens ?? 0) + (completionTokens ?? 0);
  const costUsd = num('total_cost_usd', 'totalCostUsd', 'cost_usd');
  const model = typeof record.model === 'string' ? record.model : undefined;
  return {
    promptTokens: promptTokens ?? 0,
    completionTokens: completionTokens ?? 0,
    totalTokens,
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(model ? { model } : {}),
  };
}

export interface CliAdapter {
  getProviderId(): ProviderId;

  detect(): Promise<DetectResult>;

  buildCommand(input: CliExecutionInput): CommandBuildResult;

  parseStream(line: string, emit: StreamEmitter): void;

  parseFinalResult(stdout: string, exitCode: number): ParseResult;
}

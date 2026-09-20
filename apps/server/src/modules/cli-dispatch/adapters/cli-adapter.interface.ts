/**
 * CLI Adapter Interface
 * 严格对齐设计文档 CLI适配器模型-v1.md §7 的 7 方法
 */

export type ProviderId = 'claude-code' | 'codex' | 'zcode' | 'opencode';

/**
 * CLI adapter 治理语义能力位（P1-22a）。
 * 镜像自 packages/apm-shared/src/cli/adapters/interface.ts（单源），server 侧
 * 进程内派发告警按此读；两侧口径必须一致，修改需同步镜像。
 */
export interface CliAdapterCapabilities {
  /** buildCommand 是否真正把 input.allowedTools 透传为 CLI 参数（false = 调用方传入会被静默忽略） */
  allowedTools: boolean;
  /** 是否产出 token 用量（StreamEmitter.usage / ParseResult.usage）；false = 双轨成本无该家数据 */
  usage: boolean;
  /** parseStream 是否能把审批类事件映射为 approvalNeeded（false = 审批事件通道不可达） */
  approval: boolean;
  /** MCP server 工具枚举（mcp-server 模块 CLI 工具 schema）是否收录该 provider */
  mcpTools: boolean;
}

/** 四家 adapter 能力位总表（镜像 shared 单源事实） */
export const CLI_ADAPTER_CAPABILITIES: Record<
  ProviderId,
  CliAdapterCapabilities
> = {
  'claude-code': {
    allowedTools: true,
    usage: true,
    approval: true,
    mcpTools: true,
  },
  codex: { allowedTools: true, usage: false, approval: false, mcpTools: true },
  zcode: { allowedTools: false, usage: false, approval: false, mcpTools: true },
  opencode: {
    allowedTools: false,
    usage: true,
    approval: false,
    mcpTools: true,
  },
};

export interface Artifact {
  type: string;
  name: string;
  content?: string;
  storageRef?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Adapter 标记：Artifact.type === 'test_report' 时，metadata 应满足 TestReportPayload。
 * 详见 ./test-report.schema.ts
 */
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
  usage?: (usage: CliUsage) => void;
}

/** CLI token 用量（统一为 prompt/completion/total 口径；镜像 packages/apm-shared src/cli/adapters/interface.ts 的 CliUsage） */
export interface CliUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** CLI 直接给出的美元成本（如 claude 的 total_cost_usd），可选 */
  costUsd?: number;
  model?: string;
}

/**
 * 从 stream-json 终事件 JSON 中尽力提取用量（镜像 shared 的 extractCliUsage）。
 * 兼容 claude（input_tokens/output_tokens/total_cost_usd）、
 * openai 系（prompt_tokens/completion_tokens）与 AI SDK
 * （inputTokens/outputTokens）三种常见口径。
 */
export function extractCliUsage(data: unknown): CliUsage | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const usage = (record.usage as Record<string, unknown> | undefined) ?? record;
  const num = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = usage[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return undefined;
  };
  const promptTokens = num(
    'input_tokens',
    'prompt_tokens',
    'promptTokens',
    'inputTokens',
  );
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
  // claude 把 total_cost_usd 放在 result 顶层而非 usage 内，两处都找
  const costUsd =
    num('total_cost_usd', 'totalCostUsd', 'cost_usd') ??
    (typeof record.total_cost_usd === 'number'
      ? record.total_cost_usd
      : undefined);
  const model = typeof record.model === 'string' ? record.model : undefined;
  return {
    promptTokens: promptTokens ?? 0,
    completionTokens: completionTokens ?? 0,
    totalTokens,
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(model ? { model } : {}),
  };
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
  /** prompt 经 stdin 注入时的载荷（如 claude-code stream-json 的 NDJSON user message） */
  stdinData?: string;
}

export interface ParseResult {
  status: 'completed' | 'failed';
  artifacts: Artifact[];
  error?: string;
  output?: Record<string, unknown>;
  /** 终事件携带的 token 用量（stream-json result 事件），缺失表示 CLI 未上报（usage 能力位为 false 的家恒缺省） */
  usage?: CliUsage;
}

export interface CliAdapter {
  getProviderId(): ProviderId;

  /** 探测本机可用性；commandPath 为 DB 覆盖的自定义二进制路径（与执行路径同语义） */
  detect(commandPath?: string): Promise<DetectResult>;

  buildCommand(input: CliExecutionInput): CommandBuildResult;

  parseStream(line: string, emit: StreamEmitter): void;

  parseFinalResult(stdout: string, exitCode: number): ParseResult;
}

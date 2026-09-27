/**
 * CLI 适配器接口
 *
 * 自 apps/server/src/modules/cli-dispatch/adapters/cli-adapter.interface.ts 迁移，
 * 保持框架无关（仅依赖 child_process）。CommandBuildResult 扩展 stdinData 以修复
 * prompt 传递缺陷。
 */

export type ProviderId = 'claude-code' | 'codex' | 'zcode' | 'opencode';

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
  /** 逐轮 token 用量（claude assistant 消息自带 usage；累计口径由调用方处理） */
  usage?: (usage: CliUsage) => void;
}

export interface CliExecutionInput {
  workspaceRoot: string;
  prompt: string;
  sessionId?: string;
  model?: string;
  allowedTools?: string[];
  maxTokens?: number;
  timeout?: number;
  /** 权限模式透传（zcode: build|edit|plan|yolo，headless 缺省 yolo；其余 adapter 忽略） */
  permissionMode?: string;
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
  /**
   * false = 绕过 shell 直启（spawn 免 shell）。Windows cmd.exe shell 路径有 ~8K
   * 命令行上限且引号/换行/百分号会被改写；prompt 走 argv 的 adapter（如 zcode，
   * 无 stdin 通道）在长 prompt 下必须直启（CreateProcess 上限 32K）。
   * 缺省 true，保持既有 spawn(shell:true) 行为。
   */
  shell?: boolean;
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
  // claude 把 total_cost_usd 放在 result 顶层而非 usage 内，两处都找
  const costUsd =
    num('total_cost_usd', 'totalCostUsd', 'cost_usd') ??
    (typeof record.total_cost_usd === 'number' ? record.total_cost_usd : undefined);
  const model = typeof record.model === 'string' ? record.model : undefined;
  return {
    promptTokens: promptTokens ?? 0,
    completionTokens: completionTokens ?? 0,
    totalTokens,
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(model ? { model } : {}),
  };
}

/**
 * CLI adapter 治理语义能力位：按代码事实静态声明该 adapter 真正支持的治理能力，
 * 让「请求选项被静默忽略 / 事件通道不可达」在派发侧可见（P1-22a）。
 * 判定口径：治理链路（参数透传 / 事件解析 → emit → 下游）在当前命令构造下能否真实走通；
 * 依赖未校准协议假设或被命令行形态排除的，一律保守声明 false。
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

/** 四家 adapter 能力位总表（单源事实，server 侧派发告警与 daemon worker 均按此读） */
export const CLI_ADAPTER_CAPABILITIES: Record<ProviderId, CliAdapterCapabilities> = {
  'claude-code': { allowedTools: true, usage: true, approval: true, mcpTools: true },
  // codex：usage 无任何提取路径；--non-interactive 排除交互审批（approval_required 分支不可达）
  codex: { allowedTools: true, usage: false, approval: false, mcpTools: true },
  // zcode：headless stream-json 协议已校准（v0.16.9 实测采样+源码对照）——result 终行自带
  // usage；allowedTools 无对应旗标（--disallowed-tools 是 denylist 语义，不消费该字段）；
  // headless 无交互审批面（permission.requested 只作时间线记录，approval 通道保持 false）
  zcode: { allowedTools: false, usage: true, approval: false, mcpTools: true },
  // opencode：buildCommand 不消费 allowedTools（权限走全局配置）；usage 经 step_finish 实跑采样校准；无审批事件
  opencode: { allowedTools: false, usage: true, approval: false, mcpTools: true },
};

export interface CliAdapter {
  getProviderId(): ProviderId;

  /** 治理语义能力位（读 CLI_ADAPTER_CAPABILITIES，派发侧告警依据） */
  getCapabilities(): CliAdapterCapabilities;

  detect(): Promise<DetectResult>;

  buildCommand(input: CliExecutionInput): CommandBuildResult;

  parseStream(line: string, emit: StreamEmitter): void;

  parseFinalResult(stdout: string, exitCode: number): ParseResult;
}

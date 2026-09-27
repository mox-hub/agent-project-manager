/**
 * Workflow definition 文法 v2（CAP-S-03，用户 D1-D5 裁决：JSON 通用编排 + 自研引擎）
 *
 * 与文法 v1（workflow.definition.ts，Mastra 线性链）的关系：
 * - v1 = CAP-A-11 一期交付，兼容层只读保留，运行时走 Mastra 编排壳；
 * - v2 = 节点树文法 + 自研确定性引擎（journal 双层账 + 跨重启恢复），
 *   节点 8 型：llm / human / condition / action 保留增强 + agent / fan-out / loop / wait。
 *
 * 结构要点：
 * - 节点树容器嵌套：condition（then/else 分支）、fan-out（children）、loop（children）
 * - 插值沿用 v1 口径 {input.x} / {steps.y.z}；容器子树额外可用 {item.x}（fan-out 项）、
 *   {round}（loop 轮次）；steps 以节点 id 为键，同 id 多次执行（loop）取最近一次输出
 * - loop.maxRounds 强制（round cap 无上限的循环不进文法）；fan-out 并发上限 16
 * - triggers.on 为事件名白名单（本期仅校验与存储；定时触发留 W4）
 * - v2.1 边界：fan-out / loop 子树不得包含挂起型节点（human / wait / agent）——
 *   挂起只在根层顺序链上发生，子树并行挂起语义留待后续切片（诚实收窄，不留暗坑）
 */

import {
  interpolateDeep,
  interpolateTemplate,
  type WorkflowTemplate,
} from './workflow.definition';

export type V2ConditionOp =
  'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';

interface V2BaseNode {
  id: string;
  title?: string;
}

export interface V2LlmNode extends V2BaseNode {
  type: 'llm';
  system?: WorkflowTemplate;
  prompt: WorkflowTemplate;
  temperature?: number;
}

/** human 双轨（D3 裁决）：inline=运行详情页内联表单恢复；decision-card=走决策卡审批流 */
export interface V2HumanNode extends V2BaseNode {
  type: 'human';
  mode?: 'inline' | 'decision-card';
  message: WorkflowTemplate;
}

export interface V2ConditionNode extends V2BaseNode {
  type: 'condition';
  left: WorkflowTemplate;
  op: V2ConditionOp;
  right: unknown;
  then: V2Node[];
  else?: V2Node[];
}

export interface V2ActionNode extends V2BaseNode {
  type: 'action';
  action: string;
  params?: Record<string, unknown>;
}

export interface V2AgentNode extends V2BaseNode {
  type: 'agent';
  provider: 'claude-code' | 'codex' | 'zcode' | 'opencode';
  /** prompt=直接派发 prompt；goal=以 prompt（经插值）为 /goal 目标喂目标循环 */
  targetMode?: 'prompt' | 'goal';
  /** prompt/goal 共用此字段：goal 模式下为目标描述 */
  prompt: WorkflowTemplate;
  /** 缺省用运行入参 issueId；工单是派发门禁与记账的挂载点 */
  issueId?: WorkflowTemplate;
  /** 权限模式透传（zcode: build|edit|plan|yolo） */
  permissionMode?: string;
}

export interface V2FanOutNode extends V2BaseNode {
  type: 'fan-out';
  /** 插值路径，须解析为数组 */
  over: WorkflowTemplate;
  itemVar?: string;
  /** 缺省 4，上限 16 */
  concurrency?: number;
  children: V2Node[];
}

export interface V2LoopNode extends V2BaseNode {
  type: 'loop';
  /** 强制轮次上限（1-100） */
  maxRounds: number;
  /** 每轮结束后判定，满足即停；缺省跑满 maxRounds */
  until?: { left: WorkflowTemplate; op: V2ConditionOp; right: unknown };
  children: V2Node[];
}

/** wait 事件推进器白名单：执行域完成事件（幂等键 executionRunId） */
export const V2_WAIT_EVENT_WHITELIST = [
  'runtime.execution.result',
  'execution.completed',
] as const;

export type V2WaitEvent = (typeof V2_WAIT_EVENT_WHITELIST)[number];

export interface V2WaitNode extends V2BaseNode {
  type: 'wait';
  event: V2WaitEvent;
  /** 事件载荷匹配：payload[path] === equals 时结算该节点 */
  match?: { path: string; equals?: unknown };
  /** 挂起超时（分钟），超时该节点置 failed；缺省 1440（24h），上限 7 天 */
  timeoutMinutes?: number;
}

export type V2Node =
  | V2LlmNode
  | V2HumanNode
  | V2ConditionNode
  | V2ActionNode
  | V2AgentNode
  | V2FanOutNode
  | V2LoopNode
  | V2WaitNode;

export interface V2WorkflowDoc {
  version: 2;
  inputHint?: Record<string, string>;
  /** 触发事件白名单（本期仅校验与存储；定时触发留 W4） */
  triggers?: { on: string[] };
  nodes: V2Node[];
}

export class WorkflowV2DefinitionError extends Error {}

const NODE_TYPES = [
  'llm',
  'human',
  'condition',
  'action',
  'agent',
  'fan-out',
  'loop',
  'wait',
] as const;

const CONDITION_OPS: ReadonlySet<string> = new Set([
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
]);

const AGENT_PROVIDERS: ReadonlySet<string> = new Set([
  'claude-code',
  'codex',
  'zcode',
  'opencode',
]);

/** 挂起型节点：v2.1 只允许出现在根层顺序链（fan-out/loop 子树禁入） */
const SUSPENDING_TYPES: ReadonlySet<string> = new Set([
  'human',
  'wait',
  'agent',
]);

export function isV2Definition(raw: unknown): boolean {
  return (
    !!raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    (raw as Record<string, unknown>).version === 2
  );
}

/** 编译期校验 v2 文法（结构性错误一律抛 WorkflowV2DefinitionError） */
export function parseWorkflowDefinitionV2(raw: unknown): V2WorkflowDoc {
  const doc = raw as V2WorkflowDoc;
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new WorkflowV2DefinitionError('definition 必须是对象');
  }
  if (doc.version !== 2) {
    throw new WorkflowV2DefinitionError(
      `不支持的 definition 版本：${String(doc.version)}`,
    );
  }
  if (!Array.isArray(doc.nodes) || doc.nodes.length === 0) {
    throw new WorkflowV2DefinitionError('definition.nodes 必须是非空数组');
  }
  if (doc.triggers !== undefined) {
    if (
      !doc.triggers ||
      typeof doc.triggers !== 'object' ||
      !Array.isArray(doc.triggers.on)
    ) {
      throw new WorkflowV2DefinitionError('triggers.on 必须是字符串数组');
    }
  }
  const ids = new Set<string>();
  for (const node of doc.nodes) validateNode(node, ids, true);
  return doc;
}

/**
 * allowSuspend：当前子树是否允许挂起型节点（human/wait/agent）。
 * 根层顺序链与 condition 分支（确定性顺序上下文）允许；fan-out/loop 子树（并行/轮次
 * 执行上下文）禁止——v2.1 挂起只发生在顺序链上，子树并行挂起语义留待后续切片。
 */
function validateNode(
  node: V2Node,
  ids: Set<string>,
  allowSuspend: boolean,
): void {
  if (!node || typeof node !== 'object') {
    throw new WorkflowV2DefinitionError('节点必须是对象');
  }
  if (!node.id || !/^[a-z][a-z0-9-]*$/.test(node.id)) {
    throw new WorkflowV2DefinitionError(
      `节点 id 非法（需 kebab-case）：${String(node.id)}`,
    );
  }
  if (ids.has(node.id)) {
    throw new WorkflowV2DefinitionError(`节点 id 重复：${node.id}`);
  }
  ids.add(node.id);
  if (!(NODE_TYPES as readonly string[]).includes(node.type)) {
    throw new WorkflowV2DefinitionError(
      `不支持的节点类型「${String(node.type)}」（支持：${NODE_TYPES.join('、')}）`,
    );
  }
  if (SUSPENDING_TYPES.has(node.type) && !allowSuspend) {
    throw new WorkflowV2DefinitionError(
      `节点 ${node.id}（${node.type}）不允许嵌套在 fan-out/loop 子树内（v2.1 挂起仅在顺序链发生）`,
    );
  }
  const childSuspend = allowSuspend;
  switch (node.type) {
    case 'llm':
      if (!node.prompt)
        throw new WorkflowV2DefinitionError(`llm 节点 ${node.id} 缺 prompt`);
      break;
    case 'human':
      if (!node.message)
        throw new WorkflowV2DefinitionError(`human 节点 ${node.id} 缺 message`);
      if (node.mode && !['inline', 'decision-card'].includes(node.mode)) {
        throw new WorkflowV2DefinitionError(
          `human 节点 ${node.id} mode 非法（inline | decision-card）`,
        );
      }
      break;
    case 'condition':
      if (!node.left)
        throw new WorkflowV2DefinitionError(
          `condition 节点 ${node.id} 缺 left`,
        );
      if (!CONDITION_OPS.has(node.op)) {
        throw new WorkflowV2DefinitionError(
          `condition 节点 ${node.id} op 非法：${String(node.op)}`,
        );
      }
      if (!Array.isArray(node.then) || node.then.length === 0) {
        throw new WorkflowV2DefinitionError(
          `condition 节点 ${node.id} 缺 then 分支`,
        );
      }
      for (const child of node.then) validateNode(child, ids, childSuspend);
      if (node.else) {
        if (!Array.isArray(node.else)) {
          throw new WorkflowV2DefinitionError(
            `condition 节点 ${node.id} else 必须是数组`,
          );
        }
        for (const child of node.else) validateNode(child, ids, childSuspend);
      }
      break;
    case 'action':
      if (!node.action) {
        throw new WorkflowV2DefinitionError(
          `action 节点 ${node.id} 缺 action（可选值见 GET /workflows/actions 目录）`,
        );
      }
      break;
    case 'agent':
      if (!AGENT_PROVIDERS.has(node.provider)) {
        throw new WorkflowV2DefinitionError(
          `agent 节点 ${node.id} provider 非法（claude-code | codex | zcode | opencode）`,
        );
      }
      if (!node.prompt)
        throw new WorkflowV2DefinitionError(`agent 节点 ${node.id} 缺 prompt`);
      if (
        node.targetMode !== undefined &&
        !['prompt', 'goal'].includes(node.targetMode)
      ) {
        throw new WorkflowV2DefinitionError(
          `agent 节点 ${node.id} targetMode 非法（prompt | goal）`,
        );
      }
      break;
    case 'fan-out': {
      if (!node.over)
        throw new WorkflowV2DefinitionError(`fan-out 节点 ${node.id} 缺 over`);
      if (!Array.isArray(node.children) || node.children.length === 0) {
        throw new WorkflowV2DefinitionError(
          `fan-out 节点 ${node.id} 缺 children`,
        );
      }
      if (
        node.concurrency !== undefined &&
        (!Number.isInteger(node.concurrency) ||
          node.concurrency < 1 ||
          node.concurrency > 16)
      ) {
        throw new WorkflowV2DefinitionError(
          `fan-out 节点 ${node.id} concurrency 须为 1-16`,
        );
      }
      for (const child of node.children) validateNode(child, ids, false);
      break;
    }
    case 'loop': {
      if (
        !Number.isInteger(node.maxRounds) ||
        node.maxRounds < 1 ||
        node.maxRounds > 100
      ) {
        throw new WorkflowV2DefinitionError(
          `loop 节点 ${node.id} maxRounds 须为 1-100（round cap 强制）`,
        );
      }
      if (node.until) {
        if (!node.until.left || !CONDITION_OPS.has(node.until.op)) {
          throw new WorkflowV2DefinitionError(
            `loop 节点 ${node.id} until 条件非法`,
          );
        }
      }
      if (!Array.isArray(node.children) || node.children.length === 0) {
        throw new WorkflowV2DefinitionError(`loop 节点 ${node.id} 缺 children`);
      }
      for (const child of node.children) validateNode(child, ids, false);
      break;
    }
    case 'wait': {
      if (
        !(V2_WAIT_EVENT_WHITELIST as readonly string[]).includes(node.event)
      ) {
        throw new WorkflowV2DefinitionError(
          `wait 节点 ${node.id} event 不在白名单（${V2_WAIT_EVENT_WHITELIST.join(' | ')}）`,
        );
      }
      if (node.timeoutMinutes !== undefined) {
        const limit = 7 * 24 * 60;
        if (
          !Number.isFinite(node.timeoutMinutes) ||
          node.timeoutMinutes < 1 ||
          node.timeoutMinutes > limit
        ) {
          throw new WorkflowV2DefinitionError(
            `wait 节点 ${node.id} timeoutMinutes 须为 1-${limit}`,
          );
        }
      }
      break;
    }
  }
}

// ── 静态投影（运行前确认卡 / 列表摘要 / 运行视图同源） ──

export interface V2NodeSummary {
  id: string;
  type: string;
  title?: string;
  /** agent 节点的派发声明（运行前确认卡展示） */
  agent?: { provider: string; targetMode: string };
  children?: V2NodeSummary[];
  then?: V2NodeSummary[];
  else?: V2NodeSummary[];
}

/** 节点树摘要投影：运行前确认卡、定义详情、运行视图三处共用同一投影函数 */
export function summarizeV2Definition(doc: V2WorkflowDoc): V2NodeSummary[] {
  return doc.nodes.map(summarizeNode);
}

function summarizeNode(node: V2Node): V2NodeSummary {
  const base: V2NodeSummary = {
    id: node.id,
    type: node.type,
    ...(node.title ? { title: node.title } : {}),
  };
  switch (node.type) {
    case 'condition':
      return {
        ...base,
        then: node.then.map(summarizeNode),
        ...(node.else ? { else: node.else.map(summarizeNode) } : {}),
      };
    case 'agent':
      return {
        ...base,
        agent: {
          provider: node.provider,
          targetMode: node.targetMode ?? 'prompt',
        },
      };
    case 'fan-out':
      return { ...base, children: node.children.map(summarizeNode) };
    case 'loop':
      return { ...base, children: node.children.map(summarizeNode) };
    default:
      return base;
  }
}

// ── 插值（复用 v1 口径；容器子树扩展 item/round 上下文） ──

export interface V2InterpolateContext {
  input: Record<string, unknown>;
  steps: Record<string, unknown>;
  item?: unknown;
  index?: number;
  round?: number;
}

export function interpolateV2Template(
  template: WorkflowTemplate,
  ctx: V2InterpolateContext,
): string {
  // 全量上下文传入（含 item/index/round），容器子树的插值路径可用
  return interpolateTemplate(template, ctx);
}

export function interpolateV2Deep(
  value: unknown,
  ctx: V2InterpolateContext,
): unknown {
  return interpolateDeep(value, ctx);
}

/** 条件判定（condition / loop.until 共用）；插值产物默认字符串，数字/布尔还原字面量 */
export function evaluateV2Condition(
  op: V2ConditionOp,
  leftRaw: string,
  right: unknown,
): boolean {
  const left = parseScalarV2(leftRaw);
  switch (op) {
    case 'eq':
      return left === right;
    case 'ne':
      return left !== right;
    case 'gt':
      return Number(left) > Number(right);
    case 'gte':
      return Number(left) >= Number(right);
    case 'lt':
      return Number(left) < Number(right);
    case 'lte':
      return Number(left) <= Number(right);
    case 'contains':
      return String(left).includes(String(right));
  }
}

export function parseScalarV2(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && Number.isFinite(Number(value))) return Number(value);
  return value;
}

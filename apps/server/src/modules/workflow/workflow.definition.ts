/**
 * Workflow definition 文法（CAP-A-11 基座）
 *
 * AIWorkflowDefinition.definition JSON 的唯一真相结构——未来「AI 生成/修改
 * workflow」即生成该文法的实例，经 WorkflowCompilerService 编译为可执行链。
 *
 * 设计要点：
 * - 线性步骤链（then 串联）；步骤间不直传数据，统一累积上下文
 *   { input, steps: { [stepId]: output } }
 * - prompt / url / expr 支持插值 {input.x} / {steps.y.z}，编译期做路径白名单求值
 * - 基座支持 4 类步骤：llm / http / human-confirm / condition；
 *   code / plugin 待沙箱真落地后再放开（声明了直接编译报错）
 */

/** 插值表达式：{input.topic} / {steps.draft.value} */
export type WorkflowTemplate = string;

export interface LlmStepDef {
  id: string;
  type: 'llm';
  title?: string;
  /** 系统提示（可选） */
  system?: string;
  /** 用户提示，支持插值 */
  prompt: WorkflowTemplate;
  /** 生成温度（0-2，可选，默认走 provider 默认） */
  temperature?: number;
}

export interface HttpStepDef {
  id: string;
  type: 'http';
  title?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** 支持插值 */
  url: WorkflowTemplate;
  headers?: Record<string, WorkflowTemplate>;
  /** JSON body，字符串叶子支持插值 */
  body?: Record<string, unknown>;
  /** 超时毫秒（默认 15s） */
  timeoutMs?: number;
}

export interface HumanConfirmStepDef {
  id: string;
  type: 'human-confirm';
  title?: string;
  /** 暂停时展示给确认人的信息（支持插值） */
  message: WorkflowTemplate;
}

export interface ConditionStepDef {
  id: string;
  type: 'condition';
  title?: string;
  /** 左值支持插值 */
  left: WorkflowTemplate;
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  /** 右值为字面量（数字按数字比较） */
  right: unknown;
}

export type WorkflowStepDef =
  LlmStepDef | HttpStepDef | HumanConfirmStepDef | ConditionStepDef;

export interface WorkflowDefinitionDoc {
  version: 1;
  /** 触发入口的输入说明（仅文档性，运行时 input 为任意 JSON object） */
  inputHint?: Record<string, string>;
  steps: WorkflowStepDef[];
}

export class WorkflowDefinitionError extends Error {}

/** 编译期校验 definition 文法（结构性错误一律抛 WorkflowDefinitionError） */
export function parseWorkflowDefinition(raw: unknown): WorkflowDefinitionDoc {
  const doc = raw as WorkflowDefinitionDoc;
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new WorkflowDefinitionError('definition 必须是对象');
  }
  if (doc.version !== 1) {
    throw new WorkflowDefinitionError(
      `不支持的 definition 版本：${String(doc.version)}`,
    );
  }
  if (!Array.isArray(doc.steps) || doc.steps.length === 0) {
    throw new WorkflowDefinitionError('definition.steps 必须是非空数组');
  }

  const ids = new Set<string>();
  for (const step of doc.steps) {
    if (!step || typeof step !== 'object') {
      throw new WorkflowDefinitionError('步骤必须是对象');
    }
    if (!step.id || !/^[a-z][a-z0-9-]*$/.test(step.id)) {
      throw new WorkflowDefinitionError(
        `步骤 id 非法（需 kebab-case）：${String(step.id)}`,
      );
    }
    if (ids.has(step.id)) {
      throw new WorkflowDefinitionError(`步骤 id 重复：${step.id}`);
    }
    ids.add(step.id);
    const known = ['llm', 'http', 'human-confirm', 'condition'];
    if (!known.includes(step.type)) {
      throw new WorkflowDefinitionError(
        `基座暂不支持步骤类型「${String(step.type)}」（支持：${known.join('、')}；code/plugin 待沙箱落地后放开）`,
      );
    }
    if (step.type === 'llm' && !step.prompt) {
      throw new WorkflowDefinitionError(`llm 步骤 ${step.id} 缺 prompt`);
    }
    if (step.type === 'http' && !step.url) {
      throw new WorkflowDefinitionError(`http 步骤 ${step.id} 缺 url`);
    }
    if (step.type === 'human-confirm' && !step.message) {
      throw new WorkflowDefinitionError(
        `human-confirm 步骤 ${step.id} 缺 message`,
      );
    }
    if (step.type === 'condition' && !step.left) {
      throw new WorkflowDefinitionError(`condition 步骤 ${step.id} 缺 left`);
    }
  }
  return doc;
}

/** 模板插值：按 {input.x} / {steps.y.z} 路径从运行上下文取值，未命中留空串 */
export function interpolateTemplate(
  template: WorkflowTemplate,
  ctx: { input: Record<string, unknown>; steps: Record<string, unknown> },
): string {
  return template.replace(/\{([^{}]+)\}/g, (_m, path: string) => {
    const value = resolvePath(ctx, path.trim());
    if (value === undefined || value === null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

/** JSON body 叶子插值（字符串叶子才替换，结构保持） */
export function interpolateDeep(
  value: unknown,
  ctx: { input: Record<string, unknown>; steps: Record<string, unknown> },
): unknown {
  if (typeof value === 'string') return interpolateTemplate(value, ctx);
  if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, ctx));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, interpolateDeep(v, ctx)]),
    );
  }
  return value;
}

function resolvePath(root: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, seg) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[seg]
          : undefined,
      root,
    );
}

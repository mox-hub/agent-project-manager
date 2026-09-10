import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { z } from 'zod';
import type { AnyWorkflow, Step } from '@mastra/core/workflows';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { AdapterRegistryService } from '../ai-hub/services/adapter-registry.service';
import { PrismaService } from '@/core/database/prisma.service';
import { WORKFLOW_ACTIONS } from './workflow-actions';
import {
  interpolateDeep,
  interpolateTemplate,
  parseWorkflowDefinition,
  type ActionStepDef,
  type ConditionStepDef,
  type HumanConfirmStepDef,
  type HttpStepDef,
  type LlmStepDef,
  type WorkflowDefinitionDoc,
} from './workflow.definition';

/**
 * WorkflowCompilerService（CAP-A-11）——definition 文法 → Mastra 可执行链。
 *
 * 跨步骤传递用统一累积上下文（每步 inputSchema/outputSchema 同形）：
 *   { input: 触发入参, steps: { [stepId]: 该步输出 } }
 * llm 输出 { value }；http 输出 { status, body }；human-confirm 输出确认数据
 * （resumeData 原样）；condition 输出 { met }，met=false 直接 fail 该 run。
 */

/** 累积上下文 schema（zod v4 record 双参形式） */
const CtxSchema = z.object({
  input: z.record(z.string(), z.unknown()),
  steps: z.record(z.string(), z.unknown()),
});

type Ctx = z.infer<typeof CtxSchema>;

/** 宽松步骤类型：编译器以统一上下文信封串链，不依赖 Mastra 的逐位泛型推导 */
type AnyStep = Step<string, any, any, any, any, any, any>;

function withStepOutput(ctx: Ctx, stepId: string, output: unknown): Ctx {
  return { input: ctx.input, steps: { ...ctx.steps, [stepId]: output } };
}

@Injectable()
export class WorkflowCompilerService {
  private readonly logger = new Logger(WorkflowCompilerService.name);

  constructor(
    private readonly adapterRegistry: AdapterRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  /** 编译 definition 文法为 Mastra workflow（每次触发即时编译，定义变更零缓存失效成本） */
  compile(workflowId: string, raw: unknown): AnyWorkflow {
    const doc: WorkflowDefinitionDoc = parseWorkflowDefinition(raw);
    const steps = doc.steps.map((step) => this.buildStep(step));

    let chain = createWorkflow({
      id: workflowId,
      inputSchema: CtxSchema,
      outputSchema: CtxSchema,
      steps: [] as AnyStep[],
    });
    for (const step of steps) {
      chain = chain.then(step);
    }
    return chain.commit() as unknown as AnyWorkflow;
  }

  private buildStep(def: WorkflowDefinitionDoc['steps'][number]): AnyStep {
    switch (def.type) {
      case 'llm':
        return this.buildLlmStep(def);
      case 'http':
        return this.buildHttpStep(def);
      case 'human-confirm':
        return this.buildHumanConfirmStep(def);
      case 'condition':
        return this.buildConditionStep(def);
      case 'action':
        return this.buildActionStep(def);
    }
  }

  private buildLlmStep(def: LlmStepDef): AnyStep {
    return createStep({
      id: def.id,
      inputSchema: CtxSchema,
      outputSchema: CtxSchema,
      execute: async ({ inputData, abortSignal }) => {
        const adapters = this.adapterRegistry.listAdapters();
        if (adapters.length === 0) {
          throw new Error(
            '没有可用的 LLM provider，请先在设置中配置并启用后重试',
          );
        }
        const adapter = this.adapterRegistry.getAdapter(adapters[0].provider);
        if (!adapter) {
          throw new Error('LLM 适配器不可用，请重新加载 provider');
        }
        const model = adapter.getModel() as Parameters<
          typeof generateText
        >[0]['model'];
        const prompt = interpolateTemplate(def.prompt, inputData as Ctx);
        this.logger.log(
          `[workflow llm step=${def.id}] prompt ${prompt.length} chars`,
        );
        const { text } = await generateText({
          model,
          ...(def.system
            ? { system: interpolateTemplate(def.system, inputData as Ctx) }
            : {}),
          ...(typeof def.temperature === 'number'
            ? { temperature: def.temperature }
            : {}),
          prompt,
          abortSignal,
        });
        return withStepOutput(inputData as Ctx, def.id, { value: text });
      },
    }) as unknown as AnyStep;
  }

  private buildHttpStep(def: HttpStepDef): AnyStep {
    return createStep({
      id: def.id,
      inputSchema: CtxSchema,
      outputSchema: CtxSchema,
      execute: async ({ inputData }) => {
        const ctx = inputData as Ctx;
        const url = interpolateTemplate(def.url, ctx);
        const method = def.method ?? 'GET';
        const timeoutMs = def.timeoutMs ?? 15_000;
        const headers = def.headers
          ? (interpolateDeep(def.headers, ctx) as Record<string, string>)
          : undefined;
        const body =
          method !== 'GET' && def.body !== undefined
            ? JSON.stringify(interpolateDeep(def.body, ctx))
            : undefined;

        const response = await fetch(url, {
          method,
          headers: { 'content-type': 'application/json', ...headers },
          ...(body !== undefined ? { body } : {}),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const rawText = await response.text();
        // 基座保护：body 截断到 100KB，防止单步输出撑爆上下文
        const clipped =
          rawText.length > 100_000
            ? `${rawText.slice(0, 100_000)}…[truncated]`
            : rawText;
        let parsed: unknown = clipped;
        try {
          parsed = JSON.parse(clipped);
        } catch {
          /* 非 JSON 保持文本 */
        }
        return withStepOutput(ctx, def.id, {
          status: response.status,
          body: parsed,
        });
      },
    }) as unknown as AnyStep;
  }

  private buildHumanConfirmStep(def: HumanConfirmStepDef): AnyStep {
    return createStep({
      id: def.id,
      inputSchema: CtxSchema,
      outputSchema: CtxSchema,
      resumeSchema: z.object({
        approved: z.boolean(),
        note: z.string().optional(),
      }),
      suspendSchema: z.object({
        stepId: z.string(),
        title: z.string().optional(),
        message: z.string(),
      }),
      execute: async ({ inputData, resumeData, suspend }) => {
        const ctx = inputData as Ctx;
        if (!resumeData) {
          // suspend 返回 undefined 且不抛：引擎在 execute 结束后以「suspend 已调用」
          // 标记 suspended；此处的返回值不会被采用
          await suspend({
            stepId: def.id,
            ...(def.title ? { title: def.title } : {}),
            message: interpolateTemplate(def.message, ctx),
          });
          return ctx;
        }
        return withStepOutput(ctx, def.id, resumeData);
      },
    }) as unknown as AnyStep;
  }

  private buildConditionStep(def: ConditionStepDef): AnyStep {
    return createStep({
      id: def.id,
      inputSchema: CtxSchema,
      outputSchema: CtxSchema,
      execute: async ({ inputData }) => {
        const ctx = inputData as Ctx;
        const leftRaw = interpolateTemplate(def.left, ctx);
        const left = parseScalar(leftRaw);
        const right = def.right;
        const met = evaluate(def.op, left, right);
        if (!met) {
          throw new Error(
            `条件闸门 ${def.id} 未通过：${leftRaw} ${def.op} ${JSON.stringify(right)}`,
          );
        }
        return withStepOutput(ctx, def.id, { met: true });
      },
    }) as unknown as AnyStep;
  }

  /** 产品动作步骤（CAP-A-12）：按注册表 id 查动作，params 叶子插值后执行 */
  private buildActionStep(def: ActionStepDef): AnyStep {
    return createStep({
      id: def.id,
      inputSchema: CtxSchema,
      outputSchema: CtxSchema,
      execute: async ({ inputData }) => {
        const ctx = inputData as Ctx;
        const action = WORKFLOW_ACTIONS[def.action];
        if (!action) {
          throw new Error(
            `未知产品动作「${def.action}」（步骤 ${def.id}），可选值见 GET /workflows/actions`,
          );
        }
        const params = def.params
          ? (interpolateDeep(def.params, ctx) as Record<string, unknown>)
          : {};
        this.logger.log(
          `[workflow action step=${def.id}] action=${def.action}`,
        );
        const output = await action.execute(this.prisma, params);
        return withStepOutput(ctx, def.id, output);
      },
    }) as unknown as AnyStep;
  }
}

/** 插值产物默认是字符串；数字/布尔语义比较时还原字面量 */
function parseScalar(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && Number.isFinite(Number(value))) return Number(value);
  return value;
}

function evaluate(
  op: ConditionStepDef['op'],
  left: unknown,
  right: unknown,
): boolean {
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

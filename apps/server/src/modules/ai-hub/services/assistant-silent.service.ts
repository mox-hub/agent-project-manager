import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { UsagePricingService } from './usage-pricing.service';

/**
 * 统一后台静默 AI 机制 —— 各页面「预留 AI 接口」的单一接入协议。
 *
 * 协议：POST /ai/assistant/silent { scenario, projectId?, context? } → { scenario, data }
 * 场景在 SCENARIOS 注册表登记（instructions 构建器 + 响应约定），页面各自传入
 * 上下文拿到结构化 JSON 建议；无流式、不落消息，AIUsageLog 记账。
 * 新页面需求 = 在 SCENARIOS 加一个场景 + 前端传 scenario 名，不再各起端点。
 */

interface SilentScenario {
  /** 场景说明（目录/文档用） */
  description: string;
  /** 由页面上下文构建系统指令 */
  buildInstructions: (context: Record<string, unknown>) => string;
  /**
   * 可选的服务端侦查钩子：在构建指令前按上下文加载权威事实（精确 grounding）。
   * 锚点问答等"先侦查再开口"场景用；前端传来的上下文只有指针（kind+id），
   * 事实一律以数据库为准。
   */
  prepareContext?: (
    context: Record<string, unknown>,
    deps: { prisma: PrismaService },
  ) => Promise<Record<string, unknown>>;
}

export const SILENT_SCENARIOS: Record<string, SilentScenario> = {
  'quick-prompts': {
    description:
      '助理面板快捷问法：按项目上下文生成 3~4 条适合当下提问的短问题',
    buildInstructions: (context) => `你是项目管理系统的主 AI 助理「小周」。
请根据当前上下文，为用户生成 3~4 条「现在最值得问你的问题」，作为输入框上方的快捷问法 chips。
要求：每条不超过 20 个字；口语化、可直接点击发送；结合项目/工作区的实际状态（如风险、待决、进度）。
${context.projectName ? `当前项目：${String(context.projectName)}。` : '当前处于工作区全局视图（无项目上下文）。'}
${context.viewing ? `用户正在查看：${JSON.stringify(context.viewing)}。` : ''}
只输出 JSON：{"prompts": ["问题1", "问题2", "问题3"]}`,
  },
  'create-suggestions': {
    description: '统一创建面板建议：按表单草稿字段生成可回填的建议 chips',
    buildInstructions: (
      context,
    ) => `你是项目管理系统的小助理。用户正在创建面板填写${String(context.type ?? '条目')}表单，已填内容：
${JSON.stringify(context.fields ?? {})}
请生成 3~5 条补全建议（优先级、标签、负责人提示、截止日期、验收要点等），每条给出展示文案与可回填字段。
field 只能是：title、priority(low|medium|high|critical)、labels(逗号分隔字符串)、dueDate(YYYY-MM-DD)。
只输出 JSON：{"suggestions": [{"label": "展示文案", "field": "priority", "value": "high"}]}`,
  },
  'project-score': {
    description: '项目 AI 洞察：在规则健康分之上给出评分与文字分析',
    buildInstructions: (
      context,
    ) => `你是项目管理系统的 AI 分析师。请基于以下项目数据做一次快速健康评估：
${JSON.stringify(context)}
规则健康分仅供参考（0-100）。请输出 0-100 的 AI 评分、一段 2~3 句的中文总结、最多 3 条风险、最多 3 条建议。
只输出 JSON：{"score": 82, "summary": "...", "risks": ["..."], "suggestions": ["..."]}`,
  },
  'anchor-qa': {
    description:
      '行内锚点问答：用户在实体页就地点名提问（锚点=显式上下文），服务端加载实体事实做精确 grounding，答案附可就地落库的动作建议',
    prepareContext: async (context, { prisma }) => ({
      ...context,
      task: await loadTaskAnchorFacts(prisma, context.anchor),
    }),
    buildInstructions: (context) => {
      const question = String(context.question ?? '').trim();
      if (!question) {
        throw new BadRequestException('行内问答缺少问题（question）');
      }
      return `你是项目管理系统的主 AI 助理「小周」。用户在任务页就地提问，必须基于下面给定的任务事实回答，不要编造事实里没有的内容。
任务事实（权威，来自数据库）：
${JSON.stringify(context.task ?? {})}

用户问题：${question}

回答要求：直接、简洁（3~5 句内）、先给结论；涉及"现在什么状态"必须引用事实；事实不足以回答时明确说"我查一下/这一点我没有数据"，绝不猜。
如果回答自然引出一步就能落库的操作，附最多 2 条动作建议（用户点击后由前端走既有任务接口落库）。action 只能是：
- "task.update_status"：params {"status": "状态 key"}
- "task.update_priority"：params {"priority": "low|medium|high|critical"}
- "task.update_due_date"：params {"dueDate": "YYYY-MM-DD"}
不确定的操作就不要给，宁缺毋滥。
只输出 JSON：{"answer": "...", "actions": [{"label": "按钮文案", "action": "task.update_status", "params": {"status": "done"}}]}`;
    },
  },
};

/**
 * 任务锚点事实加载：只取回答相关的权威字段（含负责人/验收/依赖/近期动态），
 * 供行内问答精确 grounding。任务不存在抛 400（不静默——锚点是用户显式点的）。
 */
async function loadTaskAnchorFacts(
  prisma: PrismaService,
  anchor: unknown,
): Promise<Record<string, unknown>> {
  const value = (
    typeof anchor === 'object' && anchor !== null ? anchor : {}
  ) as { kind?: unknown; id?: unknown };
  const id = typeof value.id === 'string' ? value.id : '';
  const kind = typeof value.kind === 'string' ? value.kind : 'task';
  if (!id) {
    throw new BadRequestException('锚点缺少实体 id');
  }
  if (kind !== 'task') {
    throw new BadRequestException(`行内问答暂只支持任务锚点，收到：${kind}`);
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { displayName: true } },
    },
  });
  if (!task) {
    throw new BadRequestException('锚点任务不存在');
  }

  const [assigneeRows, acceptance, dependencies, activities] =
    await Promise.all([
      prisma.taskAssignee.findMany({ where: { taskId: id } }),
      prisma.acceptance.findFirst({
        where: { taskId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          status: true,
          title: true,
          description: true,
          criteria: { select: { content: true, status: true } },
        },
      }),
      prisma.taskDependency.count({ where: { taskId: id } }),
      prisma.taskActivity.findMany({
        where: { taskId: id },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: { type: true, detail: true, timestamp: true },
      }),
    ]);

  // TaskAssignee 与 Member 无 Prisma 关系（memberId 手动关联），二次取成员名
  const assigneeMemberIds = [
    ...new Set(assigneeRows.map((row) => row.memberId)),
  ];
  const assigneeMembers = assigneeMemberIds.length
    ? await prisma.member.findMany({
        where: { id: { in: assigneeMemberIds } },
        select: { id: true, displayName: true, type: true },
      })
    : [];
  const memberById = new Map(assigneeMembers.map((m) => [m.id, m]));

  return {
    id: task.id,
    shortId: task.shortId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    severity: task.severity,
    dueDate: task.dueDate,
    project: task.project
      ? { id: task.project.id, name: task.project.name }
      : null,
    assignees: assigneeRows.map((row) => ({
      name: memberById.get(row.memberId)?.displayName ?? null,
      type: memberById.get(row.memberId)?.type ?? null,
    })),
    legacyAssignee: task.assignee?.displayName ?? null,
    acceptance: acceptance ?? null,
    dependencyCount: dependencies,
    recentActivities: activities,
  };
}

export interface SilentRunResult {
  scenario: string;
  data: Record<string, unknown>;
}

/** 从模型输出中提取 JSON（容忍 markdown code fence 与前后杂文） */
export function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new BadRequestException('AI 返回内容无法解析为结构化建议');
  }
  try {
    const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new BadRequestException('AI 返回内容无法解析为结构化建议');
  }
}

@Injectable()
export class AssistantSilentService {
  private readonly logger = new Logger(AssistantSilentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: AdapterRegistryService,
    private readonly usagePricing: UsagePricingService,
  ) {}

  /** 场景目录（可暴露给前端/文档） */
  listScenarios(): Array<{ scenario: string; description: string }> {
    return Object.entries(SILENT_SCENARIOS).map(([scenario, def]) => ({
      scenario,
      description: def.description,
    }));
  }

  /**
   * 执行一次静默生成：非流式 generateText → 结构化 JSON → { scenario, data }
   */
  async run(
    scenario: string,
    context: Record<string, unknown> | undefined,
    projectId: string | null,
    userId: string,
  ): Promise<SilentRunResult> {
    const def = SILENT_SCENARIOS[scenario];
    if (!def) {
      throw new BadRequestException(
        `未知静默场景：${scenario}（可用：${Object.keys(SILENT_SCENARIOS).join('、')}）`,
      );
    }

    const adapters = this.adapterRegistry.listAdapters();
    if (adapters.length === 0) {
      throw new BadRequestException(
        '当前没有可用的 LLM provider，请先在设置中配置并启用',
      );
    }
    const adapter = this.adapterRegistry.getAdapter(adapters[0].provider);
    if (!adapter) {
      throw new BadRequestException('LLM 适配器不可用，请重新加载 provider');
    }

    const rawContext = context ?? {};
    // 先侦查再开口：有侦查钩子的场景先按数据库加载权威事实
    const effectiveContext = def.prepareContext
      ? await def.prepareContext(rawContext, { prisma: this.prisma })
      : rawContext;

    const instructions = def.buildInstructions(effectiveContext);
    const result = await adapter.chat(
      [{ role: 'user', content: '请按系统指令输出 JSON。' }],
      { instructions, temperature: 0.4 },
    );

    const data = extractJsonObject(result.content ?? '');

    // 用量记账（复用 AIUsageLog；静默调用无会话/消息实体）
    try {
      const estimatedCost = await this.usagePricing.estimateCostUsd({
        modelName: result.model ?? adapters[0].model,
        provider: adapter.getProvider(),
        promptTokens: result.tokens?.prompt ?? 0,
        completionTokens: result.tokens?.completion ?? 0,
      });
      await this.prisma.aIUsageLog.create({
        data: {
          userId,
          projectId: projectId ?? null,
          taskId: null,
          conversationId: null,
          modelName: result.model ?? adapters[0].model,
          provider: adapter.getProvider(),
          promptTokens: result.tokens?.prompt ?? 0,
          completionTokens: result.tokens?.completion ?? 0,
          totalTokens: result.tokens?.total ?? 0,
          estimatedCost,
          responseMetadata: { kind: 'silent', scenario },
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write silent AI usage log: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { scenario, data };
  }
}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { UsagePricingService } from './usage-pricing.service';
import { listWorkflowActions } from '../../workflow/workflow-actions';

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
  'card-explain': {
    description:
      '局部侵入问答：用户 Ctrl/Cmd+左键实体卡片就地解释（无显式问题时解释卡片上最值得知道的事），服务端加载实体事实做精确 grounding',
    prepareContext: async (context, { prisma }) => ({
      ...context,
      entityFacts: await loadCardEntityFacts(prisma, context.entity),
    }),
    buildInstructions: (context) => {
      const question = String(context.question ?? '').trim();
      return `你是项目管理系统的主 AI 助理「小周」。用户对界面上的一张卡片按下了「就地解释」（Ctrl/Cmd+左键），默认读者是不熟悉工程与项目管理的新手。请只基于下面给定的实体事实，用大白话解释这张卡片。
实体事实（权威，来自数据库）：
${JSON.stringify(context.entityFacts ?? {})}
${question ? `用户带着具体问题，优先回答它：${question}` : '用户没有具体问题——解释这张卡片上「最值得知道的事」。'}

输出要求：
- summary：2~3 句大白话说清「这是什么、现在什么状态」
- details：2~4 条逐项解释（label 用短语，text 用大白话），覆盖此卡片最关键的面（状态/负责人/验收/风险等）
- nextStep：一句话建议用户下一步该看什么或做什么；实在没有就给空字符串
绝不编造事实里没有的内容；事实不足以回答的部分明确说「这一点我暂时没有数据」。
契约绑定卡要顺带用大白话解释绑定模式（managed=系统托管生成、synced=观察文件手改、detached=已解绑不管）与冲突态。
验收卡要顺带解释审计风险级别含义（red=有强阻断项不能交付、yellow=有建议补全项、green=无缺失），并点出验收标准里最关键的一条。
只输出 JSON：{"title": "卡片标题（任务名/决策名/成员名/文档名，契约绑定行用文件类型名）", "summary": "...", "details": [{"label": "...", "text": "..."}], "nextStep": "..."}`;
    },
  },
  'memory-digest': {
    description:
      '记忆消化器：会话静默后离线沉淀纪要/偏好/结论原子（写入 Store B，必带溯源）',
    buildInstructions: (context) => {
      const messages = Array.isArray(context.messages) ? context.messages : [];
      if (messages.length === 0) {
        throw new BadRequestException('无可消化的会话内容');
      }
      return `你是 APM 系统的记忆消化器。下面是用户与主 AI「小周」的一段对话记录，请提炼值得长期记住的记忆原子。只提炼"数据库查不到的偏好与结论"，绝不重复存能实时查到的状态（健康分/在途执行/任务状态一律不要）。
对话记录：
${JSON.stringify(context.messages)}

要求：
- summary：1 条会话纪要（最近状态与约定，供下次交接续接），不超过 120 字；无可提炼给空字符串
- preferences：0~2 条用户偏好（表达方式/工作习惯/关注点）
- conclusions：0~2 条结论或约定（讨论后达成的决定）
拿不准的宁可不写；整体没有可提炼的输出空字段。
只输出 JSON：{"summary": "...", "preferences": [{"content": "...", "confidence": 0.8}], "conclusions": [{"content": "...", "confidence": 0.8}]}`;
    },
  },
  'grill-next': {
    description:
      'grill 需求拷问（创建面板 AI 代理模式）：无状态多轮——服务端加载 grilling 技能指令，按已问答历史出下一问（含猜测选项）或在收敛时输出结构化需求摘要',
    prepareContext: async (context, { prisma }) => ({
      ...context,
      skillContent: await loadGrillingInstruction(prisma, context),
    }),
    buildInstructions: (context) => {
      const history = Array.isArray(context.history) ? context.history : [];
      const draft = String(context.draft ?? '').trim();
      if (!draft && history.length === 0) {
        throw new BadRequestException(
          'grill 缺少输入：需求草稿（draft）与问答历史（history）至少一项',
        );
      }
      if (!context.skillContent) {
        throw new BadRequestException(
          'grilling 技能不可用：请在 设置 → Agent 管理 → Skills 中启用或导入',
        );
      }
      return `${String(context.skillContent)}

——以下为本次会话数据——
用户最初的想法：${draft || '（未提供，以问答历史为准）'}
已完成的问答（按序）：
${history.length ? JSON.stringify(history) : '（还没有，这是第一问）'}

按技能指令决定：未收敛时输出 {"done": false, "question": "...", "choices": [...]}；已能诚实写出摘要时输出 {"done": true, "summary": {...}}。只输出 JSON。`;
    },
  },
  'interview-prefill': {
    description:
      '剧本访谈预填（CAP-P-01）：按用户一句话需求（或 grill 摘要）为当前阶段每个访谈问题生成答案候选，人修改后走既有 submitInterview',
    buildInstructions: (context) => {
      const questions = Array.isArray(context.questions)
        ? context.questions
        : [];
      if (questions.length === 0) {
        throw new BadRequestException('访谈预填缺少问题组（questions）');
      }
      const requirement = String(context.requirement ?? '').trim();
      return `你是项目管理系统的需求访谈助手。用户对下面这份访谈表单里的每个问题，按其需求描述预填一份答案候选；用户会在此基础上修改，所以候选要具体、可执行、说人话，绝不编造需求里没有的承诺（拿不准就写「待确认：…」）。
用户的需求描述：
${requirement || '（未提供，按问题自身语境给出常见合理候选）'}
访谈问题组：
${JSON.stringify(questions)}
只输出 JSON：{"answers": [{"questionId": "问题 id", "answer": "答案候选"}]}，answers 必须覆盖每一个问题。`;
    },
  },
  'intake-composite': {
    description:
      '组合件提案生成（CAP-P-01 二期）：读需求承接剧本的「任务拆解」与「验收草案」两份工件，AI 代写「任务族 + 每任务验收标准」的组合件 plan 卡 payload，人批卡后事务化落库',
    prepareContext: async (context, { prisma }) => {
      const ids = [
        context.breakdownDocumentId,
        context.acceptanceDocumentId,
      ].filter((v): v is string => typeof v === 'string' && !!v);
      if (ids.length === 0) {
        throw new BadRequestException(
          '组合件生成缺少工件：breakdownDocumentId / acceptanceDocumentId 至少一项',
        );
      }
      const docs = await prisma.document.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, content: true },
      });
      if (docs.length === 0) {
        throw new BadRequestException('工件文档不存在');
      }
      return { ...context, documents: docs };
    },
    buildInstructions: (context) => {
      const docs = Array.isArray(context.documents) ? context.documents : [];
      if (docs.length === 0) {
        throw new BadRequestException('组合件生成缺少工件文档');
      }
      return `你是项目管理系统的需求拆解助手。下面是需求承接访谈产出的工件（任务拆解 / 验收草案），请把它们转成一份「任务族 + 验收清单」组合件提案 payload，供人在决策收件箱一次批卡落库。
工件：
${JSON.stringify(docs)}

要求：
- tasks：把拆解清单的每一块转成一个任务；title 短句动词开头；description 一句话补充；estimate 是小时数（拿不准给 8）。
- 每个任务带 acceptance.criteria（1~4 条），从验收草案中挑选与该任务相关的可检查标准；草案不足以支撑的任务给空 criteria 数组，绝不编造。
- 宁缺毋假：工件里没有的信息留空，不要发明需求。
只输出 JSON：{"tasks": [{"title": "...", "description": "...", "estimate": 8, "acceptance": {"criteria": [{"criteriaType": "functional", "content": "...", "category": "..."}]}}]}`;
    },
  },
  'interview-dynamic': {
    description:
      '剧本访谈动态追问（CAP-P-01 三期）：无状态多轮——基于当前阶段问题组、已答历史与阶段工件深挖澄清（每轮一问 + 猜测选项），收敛时一次性给出问题组完整答案集，人审改后走既有 submitInterview',
    prepareContext: async (context, { prisma }) => {
      const ids = Array.isArray(context.artifactDocumentIds)
        ? (context.artifactDocumentIds as unknown[]).filter(
            (v): v is string => typeof v === 'string' && !!v,
          )
        : [];
      if (ids.length === 0) return context;
      const docs = await prisma.document.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, content: true },
      });
      return { ...context, documents: docs };
    },
    buildInstructions: (context) => {
      const questions = Array.isArray(context.questions)
        ? context.questions
        : [];
      if (questions.length === 0) {
        throw new BadRequestException('访谈动态追问缺少问题组（questions）');
      }
      const history = Array.isArray(context.history) ? context.history : [];
      const purpose = String(context.stagePurpose ?? '').trim();
      const docs = Array.isArray(context.documents) ? context.documents : [];
      return `你是项目管理系统的需求访谈员，正在与一位对工程术语不熟的用户对话澄清需求。本阶段目的：${purpose || '（见问题组）'}
本阶段的访谈问题组（最终要为每一问产出答案）：
${JSON.stringify(questions)}
${docs.length ? `本阶段已有的工件材料（优先依据，绝不与之矛盾）：\n${JSON.stringify(docs)}\n` : ''}已完成的对话（按序）：
${history.length ? JSON.stringify(history) : '（还没有，请开始第一问）'}

规则：
- 每轮只问一个问题：优先追问对话与工件中「模糊、缺失或自相矛盾」之处；问题组里已有固定问题不必逐条问用户，它们由最终答案集承载。
- 说人话，不甩术语；给 2~4 个猜测选项降低思考负担（选项只是提示，用户可自由回答）；没有合适的猜测就给空数组。
- 当对话已足够支撑问题组每一问的答案时收敛。收敛时输出覆盖问题组全部 id 的 answers：答案要具体、可执行、说人话，绝不编造用户没说的承诺（拿不准就写「待确认：…」）。
- 未收敛只输出 JSON：{"done": false, "question": "...", "choices": ["...", "..."]}
- 收敛只输出 JSON：{"done": true, "answers": [{"questionId": "问题 id", "answer": "答案"}]}`;
    },
  },
  'workflow-draft': {
    description:
      '工作流草拟（CAP-A-12）：用户描述想要的流程，AI 按文法生成 workflow definition 草稿（名称+描述+步骤链），进画布编辑器人工修改后保存',
    buildInstructions: (context) => {
      const description = String(context.description ?? '').trim();
      if (!description) {
        throw new BadRequestException('草拟工作流缺少流程描述（description）');
      }
      const actions = listWorkflowActions();
      return `你是项目管理系统的流程编排助手。用户会用自然语言描述想要的自动化流程，请把它写成 workflow definition 草稿。

可用的步骤类型（线性链，按顺序执行）：
- llm：AI 生成文本。字段：id、title、system?、prompt（必填）。输出落在 steps.<id>.value
- http：外部 HTTP 请求。字段：id、title、url（必填）、method?、body?
- human-confirm：暂停等人拍板。字段：id、title、message（必填）。批准结果落在 steps.<id>.approved / .note
- condition：条件闸门，不满足则整个流程失败。字段：id、title、left（插值）、op（eq/ne/gt/gte/lt/lte/contains）、right
- action：产品动作（落库写数据）。字段：id、title、action（必填）、params。可用动作：
${JSON.stringify(actions)}

插值语法：{input.x} 引用触发入参，{steps.<stepId>.y} 引用上游输出。步骤 id 用 kebab-case。
规则：涉及写数据的环节前必须放 human-confirm 让人拍板；params 里只能填用户描述中明确的信息，拿不准的留必填缺失让用户在画布里补；不要发明不存在的动作。
只输出 JSON：{"name": "流程名", "description": "一句话说明", "steps": [ ...步骤数组... ]}

用户想要的流程：
${description}`;
    },
  },
};

/**
 * grill 驱动指令加载：读启用中的 grilling 技能 content；
 * 技能缺失/未启用/无正文时返回 null（buildInstructions 层转可读 400）。
 */
async function loadGrillingInstruction(
  prisma: PrismaService,
  context: Record<string, unknown>,
): Promise<string | null> {
  if (typeof context.skillContent === 'string' && context.skillContent.trim()) {
    return context.skillContent;
  }
  const skill = await prisma.skillConfig.findUnique({
    where: { key: 'grilling' },
  });
  if (!skill || !skill.enabled || !skill.content?.trim()) {
    return null;
  }
  return skill.content;
}

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

  const task = await prisma.issue.findUnique({
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
      prisma.issueAssignee.findMany({ where: { issueId: id } }),
      prisma.acceptance.findFirst({
        where: { issueId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          status: true,
          title: true,
          description: true,
          criteria: { select: { content: true, status: true } },
        },
      }),
      prisma.issueDependency.count({ where: { issueId: id } }),
      prisma.issueActivity.findMany({
        where: { issueId: id },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: { type: true, detail: true, timestamp: true },
      }),
    ]);

  // IssueAssignee 与 Member 无 Prisma 关系（memberId 手动关联），二次取成员名
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
    severity:
      (task.customFields as Record<string, unknown> | null)?.severity ?? null,
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

/**
 * 卡片就地解释事实加载：按实体类型取权威字段（task 复用任务锚点事实；
 * decision/member 取解释所需核心字段）。实体不存在抛 400——卡片是用户
 * 显式点的，不静默吞掉。
 */
async function loadCardEntityFacts(
  prisma: PrismaService,
  entity: unknown,
): Promise<Record<string, unknown>> {
  const value = (
    typeof entity === 'object' && entity !== null ? entity : {}
  ) as { kind?: unknown; id?: unknown };
  const id = typeof value.id === 'string' ? value.id : '';
  const kind = typeof value.kind === 'string' ? value.kind : '';
  if (!id) {
    throw new BadRequestException('卡片缺少实体 id');
  }

  if (kind === 'task') {
    return loadTaskAnchorFacts(prisma, { kind: 'task', id });
  }

  if (kind === 'decision') {
    const proposal = await prisma.decisionProposal.findUnique({
      where: { id },
    });
    if (!proposal) {
      throw new BadRequestException('卡片实体不存在');
    }
    const proposer = proposal.proposerId
      ? await prisma.member.findUnique({
          where: { id: proposal.proposerId },
          select: { displayName: true, type: true },
        })
      : null;
    return {
      entityType: 'decision',
      kind: proposal.kind,
      title: proposal.title,
      detail: proposal.detail,
      status: proposal.status,
      payload: proposal.payload,
      resolution: proposal.resolution,
      proposer: proposer?.displayName ?? null,
      createdAt: proposal.createdAt,
    };
  }

  if (kind === 'member') {
    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        displayName: true,
        handle: true,
        type: true,
        title: true,
        description: true,
        status: true,
        trustScore: true,
        trustLevel: true,
      },
    });
    if (!member) {
      throw new BadRequestException('卡片实体不存在');
    }
    return { entityType: 'member', ...member };
  }

  if (kind === 'acceptance') {
    const acceptance = await prisma.acceptance.findUnique({
      where: { id },
      include: {
        issue: {
          select: { title: true, shortId: true, status: true, type: true },
        },
        criteria: {
          select: {
            criteriaType: true,
            content: true,
            weight: true,
            severity: true,
            status: true,
          },
        },
        auditReport: {
          select: {
            riskLevel: true,
            blockedItems: true,
            suggestedItems: true,
            passedItems: true,
            summary: true,
            auditDate: true,
          },
        },
      },
    });
    if (!acceptance) {
      throw new BadRequestException('卡片实体不存在');
    }
    return {
      entityType: 'acceptance',
      title: acceptance.title,
      status: acceptance.status,
      type: acceptance.type,
      completionType: acceptance.completionType,
      issue: acceptance.issue,
      criteria: acceptance.criteria,
      auditReport: acceptance.auditReport,
    };
  }

  if (kind === 'project') {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        projectCode: true,
        type: true,
        status: true,
        workflowStatus: true,
        healthStatus: true,
        riskLevel: true,
        targetDate: true,
        owner: { select: { displayName: true, username: true } },
      },
    });
    if (!project) {
      throw new BadRequestException('卡片实体不存在');
    }
    const { owner, ...projectFields } = project;
    return {
      entityType: 'project',
      ...projectFields,
      ownerName: owner?.displayName ?? owner?.username ?? null,
    };
  }

  if (kind === 'team') {
    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        status: true,
        teamPrompt: true,
      },
    });
    if (!team) {
      throw new BadRequestException('卡片实体不存在');
    }
    return { entityType: 'team', ...team };
  }

  if (kind === 'contract-binding') {
    const binding = await prisma.contractFileBinding.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!binding) {
      throw new BadRequestException('卡片实体不存在');
    }
    return {
      entityType: 'contract-binding',
      fileType: binding.fileType,
      filePath: binding.filePath,
      syncMode: binding.syncMode,
      conflictState: binding.conflictState,
      truthOwner: binding.truthOwner,
      project: binding.project
        ? { id: binding.project.id, name: binding.project.name }
        : null,
      updatedAt: binding.updatedAt,
    };
  }

  if (kind === 'document') {
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        title: true,
        status: true,
        provenance: true,
        publishedVersionId: true,
        publishedAt: true,
        updatedAt: true,
        project: { select: { id: true, name: true } },
      },
    });
    if (!document) {
      throw new BadRequestException('卡片实体不存在');
    }
    return { entityType: 'document', ...document };
  }

  throw new BadRequestException(
    `就地解释暂不支持该卡片类型：${kind || '未知'}`,
  );
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
          issueId: null,
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

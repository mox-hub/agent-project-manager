/**
 * 主 AI 助手服务 —— 每作用域多条长驻会话（项目级 / 工作区全局）。
 * 会话以 AIConversation.metadata = { mainAssistant: true } 标记
 * （SQLite 无 JSON path 过滤，scope 用 projectId 列匹配 + JS 侧过滤标记）；
 * 「当前会话」= 该作用域 updatedAt 最新的一条（新建/收发消息都会刷新 updatedAt），
 * 支持显式 conversationId 切换历史会话；消息复用 AiHubService.chat 的
 * 持久化/上下文/流式发布，仅注入 PM 人格系统前缀。
 * 模型路由：model ∈ cli | cli:<providerId> | llm:<provider> | <model name>；
 * CLI 模型走「ExecutionRun + dispatch + AssistantRuntimeBridge 回流」的对话桥，
 * LLM 模型走既有 chat 通道；选择记忆在会话 metadata.model。
 * 执行桥：dispatchExecution 把消息建为 ExecutionRun 派发在线 CLI 守护进程。
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AiHubService } from './ai-hub.service';
import { SYSTEM_ASSISTANT_HANDLE } from '../team/member.service';
import { RuntimeService } from '../runtime/runtime.service';
import { ExecutionService } from '../execution/execution.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { aiChatLog } from '../../core/logger/ai-chat-file.logger';
import type { AssistantViewingDto } from './dto/assistant.dto';
import {
  extractMessagePlainText,
  isUiMessageRunning,
  isUiMessageRow,
} from './utils/ui-message-text';

/** metadata 中的长驻会话标记（与 scope 由 projectId 列共同定位） */
const MAIN_ASSISTANT_FLAG = 'mainAssistant';

/** PM 人格系统前缀：主 AI 以 PM 搭档视角陪伴，操作类请求给建议而非直接执行 */
const PERSONA_INSTRUCTION = [
  '你是「小周」，本项目的主 AI 项目管理搭档（PM persona）。',
  '职责：以 PM 视角陪伴用户推进项目——汇报现状、识别风险、给出可执行的建议。',
  '涉及操作类请求（排期、分派、预算、任务状态变更）时，先给出结构化建议方案而不是直接执行。',
  '回复简洁、结论先行，使用用户的语言（默认中文）。',
].join('\n');

/** 执行桥的超时：短平快的 PM 任务，默认 5 分钟；运行主体=小周 Member（V3 身份口径） */
const DISPATCH_TIMEOUT_MS = 300_000;

/** CLI 对话模式的会话回灌条数上限 */
const CLI_CHAT_HISTORY_LIMIT = 16;

interface MainConversation {
  id: string;
  projectId: string | null;
  title: string | null;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

type ModelChoice =
  | { kind: 'llm'; preference?: string }
  | { kind: 'cli'; provider?: string };

const VIEWING_TYPE_LABELS: Record<AssistantViewingDto['type'], string> = {
  task: '任务',
  bug: '缺陷',
  document: '文档',
  repository: '仓库',
  member: '成员',
  project: '项目',
};

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiHubService: AiHubService,
    private readonly runtimeService: RuntimeService,
    private readonly executionService: ExecutionService,
    private readonly adapterRegistry: AdapterRegistryService,
    private readonly assistantTools: AssistantToolsService,
  ) {}

  /** 当前作用域的全部长驻会话（updatedAt 新→旧，JS 侧过滤 metadata 标记） */
  private async findConversations(
    projectId: string | null,
    userId: string,
    limit = 50,
  ): Promise<MainConversation[]> {
    const candidates = await this.prisma.aIConversation.findMany({
      where: { createdBy: userId, projectId: projectId ?? null },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return candidates.filter(
      (c) =>
        (c.metadata as Record<string, unknown> | null)?.[
          MAIN_ASSISTANT_FLAG
        ] === true,
    );
  }

  /** 执行主体统一解析为平台助理「小周」的 Member.id（执行中心按 subjectId 回填执行者名） */
  private async resolveAssistantSubjectId(): Promise<string> {
    const member = await this.prisma.member.findUnique({
      where: { handle: SYSTEM_ASSISTANT_HANDLE },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException('平台助理成员（小周）尚未初始化');
    }
    return member.id;
  }

  private isMainConversation(
    conversation: MainConversation & { metadata?: unknown },
  ): boolean {
    return (
      (conversation.metadata as Record<string, unknown> | null)?.[
        MAIN_ASSISTANT_FLAG
      ] === true
    );
  }

  /** find-or-create 当前会话（updatedAt 最新的长驻会话） */
  private async findOrCreateConversation(
    projectId: string | null,
    userId: string,
  ) {
    const [existing] = await this.findConversations(projectId, userId, 1);
    if (existing) return existing;

    return this.prisma.aIConversation.create({
      data: {
        projectId: projectId ?? null,
        createdBy: userId,
        title: 'Main AI Assistant',
        metadata: { [MAIN_ASSISTANT_FLAG]: true },
      },
    });
  }

  private async loadMessages(conversationId: string) {
    return this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }

  /** 校验「属于本人 + 是长驻会话 + scope 匹配」，失败抛 400 */
  private async assertAccessibleConversation(
    conversationId: string,
    projectId: string | null,
    userId: string,
  ) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.createdBy !== userId) {
      throw new BadRequestException('Conversation not found');
    }
    if (!this.isMainConversation(conversation)) {
      throw new BadRequestException('Not a main assistant conversation');
    }
    if ((conversation.projectId ?? null) !== (projectId ?? null)) {
      throw new BadRequestException('Conversation scope mismatch');
    }
    return conversation;
  }

  /** 历史会话列表（含消息数，供切换菜单展示） */
  async listConversations(projectId: string | null, userId: string) {
    const conversations = await this.findConversations(projectId, userId);
    const ids = conversations.map((c) => c.id);
    const counts = ids.length
      ? await this.prisma.aIMessage.groupBy({
          by: ['conversationId'],
          where: { conversationId: { in: ids } },
          _count: { conversationId: true },
        })
      : [];
    const countMap = new Map(
      counts.map((c) => [c.conversationId, c._count.conversationId]),
    );
    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      projectId: c.projectId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: countMap.get(c.id) ?? 0,
    }));
  }

  /** 新建对话（成为该作用域 updatedAt 最新的「当前会话」） */
  async createConversation(projectId: string | null, userId: string) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        projectId: projectId ?? null,
        createdBy: userId,
        title: 'Main AI Assistant',
        metadata: { [MAIN_ASSISTANT_FLAG]: true },
      },
    });
    return {
      conversationId: conversation.id,
      projectId: conversation.projectId,
      messages: [],
    };
  }

  /** 当前会话 + 最近消息；传 conversationId 时切换到指定历史会话 */
  async getCurrentConversation(
    projectId: string | null,
    userId: string,
    conversationId?: string,
  ) {
    if (conversationId) {
      const conversation = await this.assertAccessibleConversation(
        conversationId,
        projectId,
        userId,
      );
      return {
        conversationId: conversation.id,
        projectId: conversation.projectId,
        model:
          (conversation.metadata as Record<string, unknown> | null)?.[
            'model'
          ] ?? null,
        messages: await this.loadMessages(conversation.id),
      };
    }
    const conversation = await this.findOrCreateConversation(projectId, userId);
    return {
      conversationId: conversation.id,
      projectId: conversation.projectId,
      model:
        (conversation.metadata as Record<string, unknown> | null)?.[
          'model'
        ] ?? null,
      messages: await this.loadMessages(conversation.id),
    };
  }

  /**
   * 模型选择解析：显式 model 参数优先，否则读会话记忆；
   * cli / cli:<providerId> → CLI 对话桥；llm:<provider> / 模型名 → chat 通道。
   */
  private resolveModelChoice(
    model: string | undefined,
    metadata: unknown,
  ): ModelChoice {
    const raw =
      model ??
      ((metadata as Record<string, unknown> | null | undefined)?.['model'] as
        | string
        | undefined);
    if (!raw) return { kind: 'llm' };
    if (raw === 'cli') return { kind: 'cli' };
    if (raw.startsWith('cli:')) {
      return { kind: 'cli', provider: raw.slice(4) || undefined };
    }
    if (raw.startsWith('llm:')) return { kind: 'llm', preference: raw.slice(4) };
    return { kind: 'llm', preference: raw };
  }

  /** 模型选择写入会话记忆（保留 mainAssistant 标记） */
  private async rememberModelChoice(
    conversationId: string,
    metadata: unknown,
    model: string,
  ) {
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        metadata: {
          ...((metadata as Record<string, unknown> | null) ?? {}),
          model,
        } as Prisma.InputJsonValue,
      },
    });
  }

  /** viewing 上下文的文本行注入（task/project 走结构化 context，其余类型给摘要行） */
  private formatViewingInstruction(viewing?: AssistantViewingDto): string {
    if (!viewing || viewing.type === 'task' || viewing.type === 'project') {
      return '';
    }
    const label = VIEWING_TYPE_LABELS[viewing.type];
    const title = viewing.title?.trim();
    return `用户当前正在浏览：${label}${title ? `「${title}」` : ''}（id: ${viewing.id}）。回答时主动结合该上下文。`;
  }

  /** 发送消息：人格注入后走统一 chat 通道（持久化 + ai.stream 流式） */
  async sendMessage(
    content: string,
    projectId: string | null,
    userId: string,
    conversationId?: string,
    model?: string,
    viewing?: AssistantViewingDto,
  ) {
    const conversation = conversationId
      ? await this.assertAccessibleConversation(
          conversationId,
          projectId,
          userId,
        )
      : await this.findOrCreateConversation(projectId, userId);

    const choice = this.resolveModelChoice(model, conversation.metadata);
    if (model) {
      await this.rememberModelChoice(conversation.id, conversation.metadata, model);
    }

    if (choice.kind === 'cli') {
      return this.sendViaRuntime(
        conversation,
        content,
        projectId,
        userId,
        choice.provider,
        viewing,
      );
    }

    const systemInstruction = [
      PERSONA_INSTRUCTION,
      this.formatViewingInstruction(viewing),
    ]
      .filter(Boolean)
      .join('\n');
    const result = await this.aiHubService.chat(
      {
        conversationId: conversation.id,
        projectId: projectId ?? undefined,
        taskId: viewing?.type === 'task' ? viewing.id : undefined,
        message: { role: 'user', content },
        systemInstruction,
        contextHints: {
          includeProjectSummary:
            projectId != null || viewing?.type === 'project',
          includeRecentActivities: true,
          includeTaskDetails: viewing?.type === 'task',
        },
        enableTools: true,
        ...(choice.preference ? { modelPreference: choice.preference } : {}),
      },
      userId,
    );
    return { ...result, mode: 'sync' as const };
  }

  /**
   * CLI 对话桥：用户消息 → ExecutionRun（input 带 conversationId/messageId）
   * → createDispatch 给在线守护进程；AssistantRuntimeBridge 监听执行事件，
   * 把 token/终态回流成 ai.stream UIMessageChunk 并落库 UIMessage JSON。
   */
  private async sendViaRuntime(
    conversation: MainConversation,
    content: string,
    projectId: string | null,
    userId: string,
    provider: string | undefined,
    viewing?: AssistantViewingDto,
  ) {
    if (!projectId) {
      throw new BadRequestException(
        'CLI 执行通道需要项目上下文：请在项目内使用 CLI 模型，或改用 LLM 模型',
      );
    }
    const registrations = await this.runtimeService.listRegistrations();
    const online = registrations.filter((r) => r.status === 'online');
    const target = provider
      ? online.find((r) => (r.cliProviders ?? []).includes(provider))
      : online[0];
    if (!target) {
      throw new BadRequestException(
        provider
          ? `没有支持 ${provider} 的在线 CLI 执行通道：请先启动对应守护进程（apm daemon start）`
          : '没有在线的 CLI 执行通道：请先在本机启动守护进程（apm daemon start）',
      );
    }

    await this.prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: 'user', content },
    });

    // 预建 running 占位（UIMessage JSON），桥接完成后原位替换
    const messageId = randomUUID();
    const placeholder = {
      id: messageId,
      role: 'assistant',
      parts: [] as unknown[],
    };
    await this.prisma.aIMessage.create({
      data: {
        id: messageId,
        conversationId: conversation.id,
        role: 'assistant',
        content: JSON.stringify(placeholder),
        modelName: provider ? `cli:${provider}` : 'cli',
        metadata: {
          format: 'ui-message',
          status: 'running',
          source: 'assistant-chat',
        },
      },
    });

    const run = await this.executionService.createExecutionRun({
      projectId,
      subjectType: 'platform_ai_member',
      subjectId: await this.resolveAssistantSubjectId(),
      identitySource: 'cli',
      goal: content,
      createdBy: userId,
      input: {
        source: 'assistant-chat',
        conversationId: conversation.id,
        messageId,
        userId,
      },
    });
    // 回填 runId：桥接兜底查询与面板跳转执行中心都依赖它
    await this.prisma.aIMessage.update({
      where: { id: messageId },
      data: {
        metadata: {
          format: 'ui-message',
          status: 'running',
          source: 'assistant-chat',
          executionRunId: run.id,
        },
      },
    });

    const prompt = await this.buildCliChatPrompt(
      conversation.id,
      content,
      projectId,
      viewing,
    );
    aiChatLog({
      phase: 'request',
      source: 'cli',
      conversationId: conversation.id,
      messageId,
      userId,
      executionRunId: run.id,
      provider: provider ? `cli:${provider}` : 'cli',
      instructions: prompt,
    });
    await this.runtimeService.createDispatch(target.runtimeId, {
      executionRunId: run.id,
      projectId,
      subjectType: 'platform_ai_member',
      subjectId: await this.resolveAssistantSubjectId(),
      prompt,
      workspaceRoot: target.workspaceRoots?.[0],
      timeout: DISPATCH_TIMEOUT_MS,
      status: 'pending',
    });

    await this.prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conversation.id,
      mode: 'runtime' as const,
      executionRunId: run.id,
      runtimeId: target.runtimeId,
      status: 'pending' as const,
      message: {
        id: messageId,
        role: 'assistant',
        content: '',
        modelName: provider ? `cli:${provider}` : 'cli',
      },
    };
  }

  /** CLI 对话 prompt：人格 + viewing 摘要 + 会话 transcript + 回写指引 */
  private async buildCliChatPrompt(
    conversationId: string,
    content: string,
    projectId: string,
    viewing?: AssistantViewingDto,
  ) {
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: CLI_CHAT_HISTORY_LIMIT,
    });
    const transcript = history
      .filter((m) => !isUiMessageRunning(m))
      .map((m) => {
        const text = isUiMessageRow(m)
          ? extractMessagePlainText(m)
          : m.content;
        if (!text) return null;
        return `${m.role === 'user' ? '用户' : '小周'}：${text}`;
      })
      .filter(Boolean)
      .join('\n');

    return [
      PERSONA_INSTRUCTION,
      `项目 ID：${projectId}`,
      this.formatViewingInstruction(viewing),
      `对话记录（最新在最后）：\n${transcript}`,
      '请以「小周」的身份直接回复用户最新一条消息，输出纯文本。',
      this.assistantTools.renderCatalogForPrompt(projectId),
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  /** 系统接口目录（GET /ai/assistant/tools） */
  async listTools() {
    return this.assistantTools.describeTools();
  }

  /**
   * 可选模型清单：在线守护进程的 CLI 通道 + 已启用 LLM provider。
   * CLI 项：cli（自动选通道）+ cli:<providerId>（按 provider 定向）。
   */
  async listModels() {
    const registrations = await this.runtimeService.listRegistrations();
    const online = registrations.filter((r) => r.status === 'online');

    const cliEntries: Array<Record<string, unknown>> = [];
    const seenProviders = new Set<string>();
    for (const registration of online) {
      cliEntries.push({
        id: 'cli',
        type: 'runtime',
        runtimeId: registration.runtimeId,
        label: 'CLI · 自动选择',
        providers: registration.cliProviders ?? [],
        online: true,
      });
      for (const provider of registration.cliProviders ?? []) {
        if (seenProviders.has(provider)) continue;
        seenProviders.add(provider);
        cliEntries.push({
          id: `cli:${provider}`,
          type: 'runtime-provider',
          runtimeId: registration.runtimeId,
          provider,
          label: `CLI · ${provider}`,
          online: true,
        });
      }
      break; // 「自动选择」项只挂第一个在线通道，provider 项跨通道去重
    }

    const llmEntries = this.adapterRegistry.listAdapters().map((a) => ({
      id: `llm:${a.provider}`,
      type: 'llm',
      provider: a.provider,
      label: `LLM · ${a.provider}`,
      model: a.model,
    }));

    return { models: [...cliEntries, ...llmEntries] };
  }

  /**
   * 执行桥：消息转执行——建 ExecutionRun 并派发在线 CLI 守护进程。
   * 异步自由离场：用户关掉面板执行照跑，结果经建议卡（DecisionProposal）回流；
   * CLI 侧若配置了访问 Token 可直接回写提案，否则建议落在最终输出。
   */
  async dispatchExecution(content: string, projectId: string, userId: string) {
    const registrations = await this.runtimeService.listRegistrations();
    const online = registrations.find((r) => r.status === 'online');
    if (!online) {
      throw new BadRequestException(
        '没有在线的 CLI 执行通道：请先在本机启动守护进程（apm daemon start）',
      );
    }

    const run = await this.executionService.createExecutionRun({
      projectId,
      subjectType: 'platform_ai_member',
      subjectId: await this.resolveAssistantSubjectId(),
      identitySource: 'cli',
      goal: content,
      createdBy: userId,
      input: { source: 'assistant' },
    });

    const prompt = [
      '你是「小周」，主 AI 项目管理搭档。以下是用户交给你的执行任务，请以 PM 视角完成。',
      `项目 ID：${projectId}`,
      `任务指令：\n${content}`,
      this.assistantTools.renderCatalogForPrompt(projectId),
    ].join('\n\n');
    aiChatLog({
      phase: 'request',
      source: 'cli',
      userId,
      executionRunId: run.id,
      provider: 'cli:dispatch',
      instructions: prompt,
    });

    await this.runtimeService.createDispatch(online.runtimeId, {
      executionRunId: run.id,
      projectId,
      subjectType: 'platform_ai_member',
      subjectId: await this.resolveAssistantSubjectId(),
      prompt,
      workspaceRoot: online.workspaceRoots?.[0],
      timeout: DISPATCH_TIMEOUT_MS,
      status: 'pending',
    });

    return {
      executionRunId: run.id,
      runtimeId: online.runtimeId,
      status: 'pending' as const,
    };
  }
}

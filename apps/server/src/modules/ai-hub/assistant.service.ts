/**
 * 主 AI 助手服务 —— 每作用域一条长驻会话（项目级 / 工作区全局），不做线程管理。
 * 会话以 AIConversation.metadata = { mainAssistant: true } 标记做 find-or-create
 * （SQLite 无 JSON path 过滤，scope 用 projectId 列匹配 + JS 侧过滤标记）；
 * 消息复用 AiHubService.chat 的持久化/上下文/流式发布，仅注入 PM 人格系统前缀。
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AiHubService } from './ai-hub.service';
import { RuntimeService } from '../runtime/runtime.service';
import { ExecutionService } from '../execution/execution.service';

/** metadata 中的长驻会话标记（与 scope 由 projectId 列共同定位） */
const MAIN_ASSISTANT_FLAG = 'mainAssistant';

/** PM 人格系统前缀：主 AI 以 PM 搭档视角陪伴，操作类请求给建议而非直接执行 */
const PERSONA_INSTRUCTION = [
  '你是「小周」，本项目的主 AI 项目管理搭档（PM persona）。',
  '职责：以 PM 视角陪伴用户推进项目——汇报现状、识别风险、给出可执行的建议。',
  '涉及操作类请求（排期、分派、预算、任务状态变更）时，先给出结构化建议方案而不是直接执行。',
  '回复简洁、结论先行，使用用户的语言（默认中文）。',
].join('\n');

/** 执行桥的运行主体与超时：短平快的 PM 任务，默认 5 分钟 */
const ASSISTANT_SUBJECT_ID = 'main-assistant';
const DISPATCH_TIMEOUT_MS = 300_000;

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiHubService: AiHubService,
    private readonly runtimeService: RuntimeService,
    private readonly executionService: ExecutionService,
  ) {}

  /** find-or-create 当前作用域的长驻主 AI 会话 */
  private async findOrCreateConversation(
    projectId: string | null,
    userId: string,
  ) {
    const candidates = await this.prisma.aIConversation.findMany({
      where: { createdBy: userId, projectId: projectId ?? null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const existing = candidates.find(
      (c) =>
        (c.metadata as Record<string, unknown> | null)?.[
          MAIN_ASSISTANT_FLAG
        ] === true,
    );
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

  /** 当前会话 + 最近消息（抽屉首屏数据源） */
  async getCurrentConversation(projectId: string | null, userId: string) {
    const conversation = await this.findOrCreateConversation(projectId, userId);
    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return {
      conversationId: conversation.id,
      projectId: conversation.projectId,
      messages,
    };
  }

  /** 发送消息：人格注入后走统一 chat 通道（持久化 + ai.stream 流式） */
  async sendMessage(content: string, projectId: string | null, userId: string) {
    const conversation = await this.findOrCreateConversation(projectId, userId);
    return this.aiHubService.chat(
      {
        conversationId: conversation.id,
        projectId: projectId ?? undefined,
        message: { role: 'user', content },
        systemInstruction: PERSONA_INSTRUCTION,
        contextHints: {
          includeProjectSummary: true,
          includeRecentActivities: true,
        },
      },
      userId,
    );
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
      subjectId: ASSISTANT_SUBJECT_ID,
      identitySource: 'cli',
      goal: content,
      createdBy: userId,
      input: { source: 'assistant' },
    });

    const prompt = [
      '你是「小周」，主 AI 项目管理搭档。以下是用户交给你的执行任务，请以 PM 视角完成。',
      `项目 ID：${projectId}`,
      `任务指令：\n${content}`,
      '完成后如需给人留下建议（计划/分派/预算/完成建议/澄清），调用 APM 服务 POST /_api/decisions/proposals（请求头带 x-workspace-id 与 Bearer 访问 Token，body: kind/title/payload/detail/projectId）；未配置访问 Token 时把建议写进最终输出即可。',
    ].join('\n\n');

    await this.runtimeService.createDispatch(online.runtimeId, {
      executionRunId: run.id,
      projectId,
      subjectType: 'platform_ai_member',
      subjectId: ASSISTANT_SUBJECT_ID,
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

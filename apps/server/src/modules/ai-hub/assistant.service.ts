/**
 * 主 AI 助手服务 —— 每作用域一条长驻会话（项目级 / 工作区全局），不做线程管理。
 * 会话以 AIConversation.metadata = { mainAssistant: true } 标记做 find-or-create
 * （SQLite 无 JSON path 过滤，scope 用 projectId 列匹配 + JS 侧过滤标记）；
 * 消息复用 AiHubService.chat 的持久化/上下文/流式发布，仅注入 PM 人格系统前缀。
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AiHubService } from './ai-hub.service';

/** metadata 中的长驻会话标记（与 scope 由 projectId 列共同定位） */
const MAIN_ASSISTANT_FLAG = 'mainAssistant';

/** PM 人格系统前缀：主 AI 以 PM 搭档视角陪伴，操作类请求给建议而非直接执行 */
const PERSONA_INSTRUCTION = [
  '你是「小周」，本项目的主 AI 项目管理搭档（PM persona）。',
  '职责：以 PM 视角陪伴用户推进项目——汇报现状、识别风险、给出可执行的建议。',
  '涉及操作类请求（排期、分派、预算、任务状态变更）时，先给出结构化建议方案而不是直接执行。',
  '回复简洁、结论先行，使用用户的语言（默认中文）。',
].join('\n');

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiHubService: AiHubService,
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
}

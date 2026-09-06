/**
 * 主 AI 助手的系统工具集 —— 双路径共用一份目录定义：
 * - LLM 路径：AI SDK tools（zod schema + 服务端 execute），写路径复用各领域
 *   service（继承校验/活动记录/事件发布），读路径直查库；执行均在请求的
 *   workspace ALS 上下文内。
 * - CLI 路径：目录渲染成文本注入 dispatch prompt，由守护进程 CLI 凭 PAT 调
 *   等价 HTTP API 回环。
 * 覆盖范围（核心实体 CRUD）：任务/缺陷、项目、文档、成员、团队、迭代、
 * 里程碑、标签、状态/角色（读）、验收（读）、仓库（读）、决策提案。
 * 破坏性操作（删除/停用/归档）要求 confirm=true——prompt 指引 AI 必须先向用户确认。
 */
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../../core/database/prisma.service';
import { TaskService } from '../../task/task.service';
import { DocumentService } from '../../document/document.service';
import { MemberService } from '../../team/member.service';
import { TeamService } from '../../team/team.service';
import { ProjectService } from '../../project/project.service';
import { AcceptanceService } from '../../acceptance/acceptance.service';
import { TaskAssigneeService } from '../../team/task-assignee.service';
import { MemoryService } from '../../memory/memory.service';
import { CollaborationService } from '../../collaboration/collaboration.service';
import { SYSTEM_ASSISTANT_HANDLE } from '../../team/member.service';

export interface AssistantToolCatalogEntry {
  name: string;
  description: string;
  http: {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    path: string;
    params: Record<string, string>;
  };
}

/** 系统接口目录（CLI prompt 注入与 GET /ai/assistant/tools 同源） */
export const ASSISTANT_TOOL_CATALOG: AssistantToolCatalogEntry[] = [
  // 任务 / 缺陷
  {
    name: 'get_task',
    description: '查询单个任务/缺陷详情（标题/状态/优先级/负责人/截止日期）',
    http: {
      method: 'GET',
      path: '/_api/tasks/:taskId',
      params: { taskId: '任务 ID' },
    },
  },
  {
    name: 'list_project_tasks',
    description: '列出项目近期任务/缺陷（可按 type/status 过滤）',
    http: {
      method: 'GET',
      path: '/_api/projects/:projectId/tasks?type=task|bug&status=xx',
      params: { projectId: '项目 ID' },
    },
  },
  {
    name: 'create_task',
    description: '创建任务或缺陷（type: task|bug，缺陷可带 severity 等）',
    http: {
      method: 'POST',
      path: '/_api/tasks',
      params: { title: '标题', projectId: '项目 ID', type: 'task|bug' },
    },
  },
  {
    name: 'update_task',
    description: '更新任务/缺陷（标题/描述/状态/优先级/截止日期等）',
    http: {
      method: 'PATCH',
      path: '/_api/tasks/:taskId',
      params: { taskId: '任务 ID' },
    },
  },
  {
    name: 'delete_task',
    description: '删除任务/缺陷（不可恢复，必须先向用户确认）',
    http: {
      method: 'DELETE',
      path: '/_api/tasks/:taskId',
      params: { taskId: '任务 ID' },
    },
  },
  // 项目
  {
    name: 'list_projects',
    description: '列出工作区项目',
    http: { method: 'GET', path: '/_api/projects', params: {} },
  },
  {
    name: 'get_project_overview',
    description: '项目概览 + 任务状态分布统计',
    http: {
      method: 'GET',
      path: '/_api/projects/:projectId',
      params: { projectId: '项目 ID' },
    },
  },
  {
    name: 'create_project',
    description: '创建项目（默认 team/internal）',
    http: { method: 'POST', path: '/_api/projects', params: { name: '名称' } },
  },
  {
    name: 'update_project',
    description: '更新项目信息（名称/描述/优先级/健康状态）',
    http: {
      method: 'PATCH',
      path: '/_api/projects/:projectId',
      params: { projectId: '项目 ID' },
    },
  },
  {
    name: 'archive_project',
    description: '归档项目（必须先向用户确认）',
    http: {
      method: 'POST',
      path: '/_api/projects/:projectId/archive',
      params: { projectId: '项目 ID' },
    },
  },
  // 文档
  {
    name: 'list_documents',
    description: '列出/搜索项目文档（标题/摘要）',
    http: {
      method: 'GET',
      path: '/_api/documents?search=:query',
      params: { query: '关键字' },
    },
  },
  {
    name: 'get_document',
    description: '读取文档全文（Markdown）',
    http: {
      method: 'GET',
      path: '/_api/documents/:documentId',
      params: { documentId: '文档 ID' },
    },
  },
  {
    name: 'create_document',
    description: '创建文档（Markdown 内容）',
    http: {
      method: 'POST',
      path: '/_api/documents',
      params: { title: '标题', content: '内容' },
    },
  },
  {
    name: 'update_document',
    description: '更新文档标题/内容',
    http: {
      method: 'PUT',
      path: '/_api/documents/:documentId',
      params: { documentId: '文档 ID' },
    },
  },
  {
    name: 'delete_document',
    description: '删除文档（软删，必须先向用户确认）',
    http: {
      method: 'DELETE',
      path: '/_api/documents/:documentId',
      params: { documentId: '文档 ID' },
    },
  },
  // 成员
  {
    name: 'list_members',
    description: '列出成员（可按 type: human|ai_agent 过滤）',
    http: {
      method: 'GET',
      path: '/_api/members?type=human|ai_agent',
      params: {},
    },
  },
  {
    name: 'get_member',
    description: '查询成员详情',
    http: {
      method: 'GET',
      path: '/_api/members/:memberId',
      params: { memberId: '成员 ID' },
    },
  },
  {
    name: 'create_member',
    description: '创建 AI 成员（需要 aiModelConfigId）',
    http: {
      method: 'POST',
      path: '/_api/members',
      params: { displayName: '名称', type: 'ai_agent' },
    },
  },
  {
    name: 'update_member',
    description: '更新成员资料（名称/职务/描述/个人提示词）',
    http: {
      method: 'PATCH',
      path: '/_api/members/:memberId',
      params: { memberId: '成员 ID' },
    },
  },
  {
    name: 'deactivate_member',
    description: '停用成员（必须先向用户确认；系统内置 AI 助理不可停用）',
    http: {
      method: 'POST',
      path: '/_api/members/:memberId/deactivate',
      params: { memberId: '成员 ID' },
    },
  },
  // 团队
  {
    name: 'list_teams',
    description: '列出团队',
    http: { method: 'GET', path: '/_api/teams', params: {} },
  },
  {
    name: 'create_team',
    description: '创建团队',
    http: { method: 'POST', path: '/_api/teams', params: { name: '名称' } },
  },
  {
    name: 'update_team',
    description: '更新团队名称/描述',
    http: {
      method: 'PATCH',
      path: '/_api/teams/:teamId',
      params: { teamId: '团队 ID' },
    },
  },
  {
    name: 'archive_team',
    description: '归档团队（必须先向用户确认）',
    http: {
      method: 'POST',
      path: '/_api/teams/:teamId/archive',
      params: { teamId: '团队 ID' },
    },
  },
  // 迭代 / 里程碑
  {
    name: 'list_iterations',
    description: '列出项目迭代',
    http: {
      method: 'GET',
      path: '/_api/projects/:projectId/iterations',
      params: { projectId: '项目 ID' },
    },
  },
  {
    name: 'create_iteration',
    description: '创建迭代（名称 + 起止日期）',
    http: {
      method: 'POST',
      path: '/_api/projects/:projectId/iterations',
      params: {
        projectId: '项目 ID',
        name: '名称',
        startDate: 'YYYY-MM-DD',
        endDate: 'YYYY-MM-DD',
      },
    },
  },
  {
    name: 'update_iteration',
    description: '更新迭代状态/目标',
    http: {
      method: 'PATCH',
      path: '/_api/iterations/:iterationId',
      params: { iterationId: '迭代 ID' },
    },
  },
  {
    name: 'list_milestones',
    description: '列出项目里程碑',
    http: {
      method: 'GET',
      path: '/_api/projects/:projectId/milestones',
      params: { projectId: '项目 ID' },
    },
  },
  {
    name: 'create_milestone',
    description: '创建里程碑',
    http: {
      method: 'POST',
      path: '/_api/projects/:projectId/milestones',
      params: { projectId: '项目 ID', name: '名称' },
    },
  },
  // 标签 / 状态 / 角色
  {
    name: 'list_labels',
    description: '列出标签',
    http: {
      method: 'GET',
      path: '/_api/metadata/tags?projectId=',
      params: { projectId: '项目 ID' },
    },
  },
  {
    name: 'create_label',
    description: '创建标签',
    http: {
      method: 'POST',
      path: '/_api/metadata/tags',
      params: { name: '名称', color: '颜色' },
    },
  },
  {
    name: 'list_project_statuses',
    description: '列出状态定义（创建/更新任务时的合法 status key 由此查询）',
    http: {
      method: 'GET',
      path: '/_api/metadata/statuses?projectId=',
      params: { projectId: '项目 ID' },
    },
  },
  {
    name: 'list_project_roles',
    description: '列出项目角色定义',
    http: {
      method: 'GET',
      path: '/_api/projects/:projectId/roles',
      params: { projectId: '项目 ID' },
    },
  },
  // 绑定关系（成员↔任务/项目/团队、团队↔项目）
  {
    name: 'assign_member_to_task',
    description:
      '把成员（人类或 AI）指派到任务：写 TaskAssignee 并同步任务主负责人；指派 AI 成员会自动触发 CLI 派发',
    http: {
      method: 'POST',
      path: '/_api/task-assignees',
      params: { taskId: '任务 ID', memberId: '成员 ID' },
    },
  },
  {
    name: 'bind_member_to_project',
    description: '把成员绑定到项目（role: owner|maintainer|member|guest）',
    http: {
      method: 'POST',
      path: '/_api/members/:memberId/projects',
      params: { memberId: '成员 ID', projectId: '项目 ID' },
    },
  },
  {
    name: 'add_member_to_team',
    description: '把成员加入团队（同时向团队已绑定的项目传播绑定）',
    http: {
      method: 'POST',
      path: '/_api/teams/:teamId/members',
      params: { teamId: '团队 ID', memberId: '成员 ID' },
    },
  },
  {
    name: 'bind_team_to_project',
    description: '把团队绑定到项目（全体团队成员自动获得项目成员身份）',
    http: {
      method: 'POST',
      path: '/_api/teams/:teamId/projects',
      params: { teamId: '团队 ID', projectId: '项目 ID' },
    },
  },
  // 验收 / 决策
  {
    name: 'list_task_acceptances',
    description:
      '列出任务的验收单及状态（draft|pending|in_review|passed|failed|waived）',
    http: {
      method: 'GET',
      path: '/_api/acceptance/task/:taskId',
      params: { taskId: '任务 ID' },
    },
  },
  {
    name: 'create_acceptance',
    description:
      '为任务创建验收契约（draft 起，可带验收标准 criteriaType: functional|technical）',
    http: {
      method: 'POST',
      path: '/_api/acceptance',
      params: { taskId: '任务 ID', title: '标题', criteria: '验收标准数组' },
    },
  },
  {
    name: 'update_acceptance',
    description:
      '更新验收契约元数据/流转（status 仅 draft|pending|in_review；终态走 resolve_acceptance）',
    http: {
      method: 'PATCH',
      path: '/_api/acceptance/:acceptanceId',
      params: { acceptanceId: '验收 ID' },
    },
  },
  {
    name: 'resolve_acceptance',
    description:
      '验收终态裁决（三端点：accept-completion=通过、reject-completion 打回需 reason、waive 豁免需 reason；body 传 {action: accept|reject|waive} + reason）；影响任务完成门禁，必须先向用户确认',
    http: {
      method: 'POST',
      path: '/_api/acceptance/:acceptanceId/accept-completion',
      params: { acceptanceId: '验收 ID', reason: 'reject/waive 时必填' },
    },
  },
  {
    name: 'list_pending_decisions',
    description: '当前工作区待人类决策的提案（最多 10 条）',
    http: {
      method: 'GET',
      path: '/_api/decisions/pending?limit=10',
      params: {},
    },
  },
  {
    name: 'propose_decision',
    description:
      '向人提交决策建议卡（kind: plan|assignment|resolution|spend|clarify），人在决策面板采纳后才会执行',
    http: {
      method: 'POST',
      path: '/_api/decisions/proposals',
      params: {
        kind: 'plan|assignment|resolution|spend|clarify',
        title: '标题',
        payload: '结构化载荷',
        detail: '补充说明',
        projectId: '项目 ID',
      },
    },
  },
  // ── 记忆 Store B（模型只读事实、写原子必带溯源）──
  {
    name: 'recall_memory',
    description: '召回活跃记忆（用户偏好/项目结论/纪要）；查无结果如实说没有',
    http: {
      method: 'GET',
      path: '/_api/memory/recall?query=关键词&limit=8',
      params: { query: '关键词（可省略）' },
    },
  },
  {
    name: 'note_memory',
    description:
      '记录一条值得长期记住的记忆原子（type: preference|conclusion|summary|relationship）',
    http: {
      method: 'POST',
      path: '/_api/memory',
      params: {
        type: 'preference|conclusion|summary|relationship',
        content: '记忆正文',
        projectId: '项目 ID（可省略，缺省全局）',
      },
    },
  },
  {
    name: 'what_do_you_know',
    description: '查看当前作用域的交接摘要（钉住优先+最新记忆+计数）',
    http: {
      method: 'GET',
      path: '/_api/memory/brief',
      params: {},
    },
  },
  // ── 接口协作卡（交接试点）：请求方提案、提供方拥有 spec、请求方消费验证 ──
  {
    name: 'request_collaboration',
    description: '发起接口协作卡（结构化负载：endpoint 形状/出处/验收口径，不是小作文）',
    http: {
      method: 'POST',
      path: '/_api/collaboration',
      params: {
        projectId: '项目 ID',
        title: '协作标题',
        providerMemberId: '提供方成员 ID',
        requesterMemberId: '请求方成员 ID',
        payload: '结构化负载',
      },
    },
  },
  {
    name: 'check_feasibility',
    description: '可行性侦察：在途执行容量 + CLI 工具授权（提供方承诺前先查）',
    http: {
      method: 'GET',
      path: '/_api/office/summary',
      params: {},
    },
  },
  {
    name: 'respond_collaboration',
    description: '答复协作卡：committed 承诺 / rejected 拒绝+理由 / clarify 需澄清',
    http: {
      method: 'PATCH',
      path: '/_api/collaboration/:id/respond',
      params: { decision: 'committed|rejected|clarify', note: '说明' },
    },
  },
  {
    name: 'verify_collaboration',
    description: '验证交付：verified 契约绿关闭 / changes_requested 打回',
    http: {
      method: 'PATCH',
      path: '/_api/collaboration/:id/verify',
      params: { verdict: 'verified|changes_requested', note: '说明' },
    },
  },
];

const PROPOSAL_KINDS = [
  'plan',
  'assignment',
  'resolution',
  'spend',
  'clarify',
] as const;

/**
 * 工具输出 JSON 安全化：Prisma 行里的 Date 等非 JSON 可序列化值会导致
 * SDK 在多步工具循环里拼装的 tool 消息过不了 ToolResultOutput 校验
 * （AI_InvalidPromptError），统一转成纯 JSON 再返回。
 */
function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 领域 service 抛的是 Nest HttpException，取其可读 message 给模型 */
function errText(err: unknown): string {
  if (err && typeof err === 'object' && 'getResponse' in err) {
    try {
      const res = (err as { getResponse: () => unknown }).getResponse();
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'message' in res) {
        return String((res as { message: unknown }).message);
      }
    } catch {
      // fallthrough
    }
  }
  return err instanceof Error ? err.message : String(err);
}

@Injectable()
export class AssistantToolsService {
  private readonly logger = new Logger(AssistantToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
    private readonly documentService: DocumentService,
    private readonly memberService: MemberService,
    private readonly teamService: TeamService,
    private readonly projectService: ProjectService,
    private readonly acceptanceService: AcceptanceService,
    private readonly taskAssigneeService: TaskAssigneeService,
    private readonly memoryService: MemoryService,
    private readonly collaborationService: CollaborationService,
  ) {}

  /** 目录（GET /ai/assistant/tools 用） */
  describeTools() {
    return {
      tools: ASSISTANT_TOOL_CATALOG.map((entry) => ({
        name: entry.name,
        description: entry.description,
        http: entry.http,
      })),
    };
  }

  /** CLI dispatch prompt 注入的目录文本（PAT 回环指引） */
  renderCatalogForPrompt(projectId: string | null): string {
    const lines = ASSISTANT_TOOL_CATALOG.map(
      (entry) =>
        `- ${entry.name}：${entry.description}（HTTP: ${entry.http.method} ${entry.http.path}）`,
    );
    return [
      '你可以调用 APM 系统接口查询与操作项目数据（请求头带 x-workspace-id 与 Bearer 访问 Token；未配置 Token 时把结果写进最终输出即可）：',
      ...lines,
      '注意：删除/停用/归档等不可恢复操作必须先向用户确认后再执行。',
      ...(projectId ? [`当前项目 ID：${projectId}`] : []),
    ].join('\n');
  }

  /**
   * LLM 路径工具集：写路径走领域 service（继承校验/活动/事件），读路径直查库。
   * context：projectId 为会话作用域缺省项目；userId 为发起对话的用户（写操作执行者）。
   */
  buildTools(context: {
    projectId?: string | null;
    userId?: string | null;
  }): Record<string, Tool> {
    const defaultProjectId = context.projectId ?? undefined;
    const userId = context.userId ?? undefined;
    const requireUser = (): string => {
      if (!userId) throw new Error('缺少执行者身份（userId），无法执行写操作');
      return userId;
    };
    const compact = (record: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(record).filter(([, v]) => v !== undefined),
      );

    return {
      // ============ 任务 / 缺陷 ============
      get_task: tool({
        description:
          '查询单个任务/缺陷详情（标题/类型/状态/优先级/负责人/截止日期）',
        inputSchema: z.object({ taskId: z.string().describe('任务 ID') }),
        execute: async ({ taskId }) => {
          const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              priority: true,
              severity: true,
              assigneeId: true,
              assigneeType: true,
              dueDate: true,
              estimate: true,
              description: true,
              projectId: true,
            },
          });
          return jsonSafe(task) ?? { error: `任务 ${taskId} 不存在` };
        },
      }),

      list_project_tasks: tool({
        description: '列出项目近期任务/缺陷（updatedAt 降序，默认 10 条）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          type: z.enum(['task', 'bug']).optional().describe('过滤类型'),
          status: z.string().optional().describe('状态关键字过滤'),
        }),
        execute: async ({ projectId, type, status }) => {
          const target = projectId ?? defaultProjectId;
          if (!target) return { error: '缺少项目上下文：请提供 projectId' };
          const tasks = await this.prisma.task.findMany({
            where: {
              projectId: target,
              ...(type ? { type } : {}),
              ...(status ? { status: { contains: status } } : {}),
            },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              priority: true,
              assigneeType: true,
              dueDate: true,
            },
          });
          return jsonSafe({ tasks });
        },
      }),

      create_task: tool({
        description:
          '创建任务或缺陷。type=bug 时可带 severity。创建前应与用户确认标题与要点。',
        inputSchema: z.object({
          title: z.string().describe('标题'),
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          type: z.enum(['task', 'bug']).optional().describe('类型，默认 task'),
          description: z.string().optional().describe('描述（Markdown）'),
          status: z.string().optional().describe('状态 key（缺省用项目默认）'),
          priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
          severity: z
            .enum(['critical', 'high', 'medium', 'low'])
            .optional()
            .describe('缺陷严重级'),
          dueDate: z.string().optional().describe('截止日期（ISO 日期字符串）'),
          parentTaskId: z
            .string()
            .optional()
            .describe('父任务 ID（创建子任务）'),
          iterationId: z.string().optional().describe('迭代 ID'),
          milestoneId: z.string().optional().describe('里程碑 ID'),
          tags: z.array(z.string()).optional().describe('标签名列表'),
        }),
        execute: async (input) => {
          try {
            const task = await this.taskService.create(
              { ...input, projectId: input.projectId ?? defaultProjectId },
              requireUser(),
            );
            return jsonSafe({
              taskId: task.id,
              shortId: task.shortId,
              title: task.title,
              status: task.status,
              type: task.type,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      update_task: tool({
        description:
          '更新任务/缺陷（标题/描述/状态/优先级/截止日期/迭代/里程碑）',
        inputSchema: z.object({
          taskId: z.string().describe('任务 ID'),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.string().optional().describe('状态 key'),
          priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
          dueDate: z.string().optional(),
          iterationId: z.string().optional(),
          milestoneId: z.string().optional(),
        }),
        execute: async ({ taskId, ...patch }) => {
          try {
            const task = await this.taskService.update(
              taskId,
              compact(patch),
              requireUser(),
            );
            return jsonSafe({
              taskId: task.id,
              title: task.title,
              status: task.status,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      delete_task: tool({
        description:
          '删除任务/缺陷，不可恢复。调用前必须先向用户确认（confirm=true 表示用户已同意）。',
        inputSchema: z.object({
          taskId: z.string().describe('任务 ID'),
          confirm: z.boolean().describe('必须为 true，且仅在用户明确同意后'),
        }),
        execute: async ({ taskId, confirm }) => {
          if (!confirm)
            return { error: '缺少用户确认：请先向用户确认后再删除' };
          try {
            await this.taskService.delete(taskId, requireUser());
            return { deleted: true, taskId };
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      // ============ 项目 ============
      list_projects: tool({
        description: '列出工作区全部项目（名称/状态/健康度）',
        inputSchema: z.object({}),
        execute: async () => {
          const projects = await this.prisma.project.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 20,
            select: {
              id: true,
              name: true,
              status: true,
              healthStatus: true,
              workflowStatus: true,
              priority: true,
            },
          });
          return jsonSafe({ projects });
        },
      }),

      get_project_overview: tool({
        description: '项目概览 + 任务状态分布统计',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ projectId }) => {
          const target = projectId ?? defaultProjectId;
          if (!target) return { error: '缺少项目上下文：请提供 projectId' };
          const project = await this.prisma.project.findUnique({
            where: { id: target },
            select: {
              id: true,
              name: true,
              status: true,
              healthStatus: true,
              workflowStatus: true,
              riskLevel: true,
              description: true,
            },
          });
          if (!project) return { error: `项目 ${target} 不存在` };
          const grouped = await this.prisma.task.groupBy({
            by: ['status'],
            where: { projectId: target },
            _count: { status: true },
          });
          return jsonSafe({
            project,
            taskCountsByStatus: grouped.map((g) => ({
              status: g.status,
              count: g._count.status,
            })),
          });
        },
      }),

      create_project: tool({
        description: '创建项目（默认 team 类型 / internal 可见性）',
        inputSchema: z.object({
          name: z.string().describe('项目名称'),
          description: z.string().optional(),
          type: z
            .enum(['personal', 'team', 'experiment', 'enterprise'])
            .optional(),
          visibility: z.enum(['private', 'internal', 'public']).optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        }),
        execute: async ({ name, description, type, visibility, priority }) => {
          try {
            const project = await this.projectService.create(
              {
                name,
                description,
                type: type ?? 'team',
                visibility: visibility ?? 'internal',
                priority,
              },
              requireUser(),
            );
            return jsonSafe({ projectId: project.id, name: project.name });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      update_project: tool({
        description: '更新项目信息（名称/描述/优先级/健康状态/风险等级）',
        inputSchema: z.object({
          projectId: z.string().describe('项目 ID'),
          name: z.string().optional(),
          description: z.string().optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
          healthStatus: z.enum(['on_track', 'at_risk', 'off_track']).optional(),
          riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        }),
        execute: async ({ projectId, ...patch }) => {
          try {
            const project = await this.projectService.update(
              projectId,
              compact(patch),
              requireUser(),
            );
            return jsonSafe({
              projectId: project.id,
              name: project.name,
              healthStatus: project.healthStatus,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      archive_project: tool({
        description: '归档项目（必须先向用户确认）',
        inputSchema: z.object({
          projectId: z.string().describe('项目 ID'),
          confirm: z.boolean().describe('必须为 true，且仅在用户明确同意后'),
        }),
        execute: async ({ projectId, confirm }) => {
          if (!confirm)
            return { error: '缺少用户确认：请先向用户确认后再归档' };
          try {
            await this.projectService.archive(projectId, requireUser());
            return { archived: true, projectId };
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      // ============ 文档 ============
      list_documents: tool({
        description: '列出/搜索文档（标题/摘要，最多 8 条）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          query: z.string().optional().describe('关键字'),
        }),
        execute: async ({ projectId, query }) => {
          const target = projectId ?? defaultProjectId;
          const documents = await this.prisma.document.findMany({
            where: {
              isDeleted: false,
              ...(target ? { projectId: target } : {}),
              ...(query
                ? {
                    OR: [
                      { title: { contains: query } },
                      { summary: { contains: query } },
                    ],
                  }
                : {}),
            },
            take: 8,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              title: true,
              summary: true,
              status: true,
              category: true,
            },
          });
          return jsonSafe({ documents });
        },
      }),

      get_document: tool({
        description: '读取文档全文（Markdown）',
        inputSchema: z.object({ documentId: z.string().describe('文档 ID') }),
        execute: async ({ documentId }) => {
          const document = await this.prisma.document.findFirst({
            where: { id: documentId, isDeleted: false },
            select: {
              id: true,
              title: true,
              content: true,
              summary: true,
              status: true,
              category: true,
            },
          });
          return jsonSafe(document) ?? { error: `文档 ${documentId} 不存在` };
        },
      }),

      create_document: tool({
        description:
          '创建文档（Markdown 内容；category: requirement|design|api|testing|guide|custom）',
        inputSchema: z.object({
          title: z.string().describe('标题'),
          content: z.string().optional().describe('Markdown 内容'),
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          category: z
            .enum([
              'requirement',
              'design',
              'api',
              'testing',
              'guide',
              'custom',
            ])
            .optional(),
        }),
        execute: async ({ title, content, projectId, category }) => {
          try {
            const document = await this.documentService.create(
              {
                title,
                content,
                category,
                projectId: projectId ?? defaultProjectId,
              },
              requireUser(),
            );
            return jsonSafe({ documentId: document.id, title: document.title });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      update_document: tool({
        description: '更新文档标题/内容/摘要',
        inputSchema: z.object({
          documentId: z.string().describe('文档 ID'),
          title: z.string().optional(),
          content: z.string().optional().describe('Markdown 全量内容'),
          summary: z.string().optional(),
        }),
        execute: async ({ documentId, ...patch }) => {
          try {
            const document = await this.documentService.update(
              documentId,
              compact(patch),
            );
            return jsonSafe({ documentId: document.id, title: document.title });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      delete_document: tool({
        description: '删除文档（软删除，可恢复；必须先向用户确认）',
        inputSchema: z.object({
          documentId: z.string().describe('文档 ID'),
          confirm: z.boolean().describe('必须为 true，且仅在用户明确同意后'),
        }),
        execute: async ({ documentId, confirm }) => {
          if (!confirm)
            return { error: '缺少用户确认：请先向用户确认后再删除' };
          try {
            await this.documentService.remove(documentId);
            return { deleted: true, documentId };
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      // ============ 成员 ============
      list_members: tool({
        description: '列出成员（可按 type: human|ai_agent 过滤，最多 20 条）',
        inputSchema: z.object({
          type: z.enum(['human', 'ai_agent']).optional(),
        }),
        execute: async ({ type }) => {
          const members = await this.prisma.member.findMany({
            where: type ? { type } : undefined,
            orderBy: { displayName: 'asc' },
            take: 20,
            select: {
              id: true,
              displayName: true,
              type: true,
              status: true,
              title: true,
              handle: true,
            },
          });
          return jsonSafe({ members });
        },
      }),

      get_member: tool({
        description: '查询成员详情（含个人提示词/状态/标题）',
        inputSchema: z.object({ memberId: z.string().describe('成员 ID') }),
        execute: async ({ memberId }) => {
          const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: {
              id: true,
              displayName: true,
              type: true,
              status: true,
              title: true,
              description: true,
              personalPrompt: true,
              handle: true,
              email: true,
            },
          });
          return jsonSafe(member) ?? { error: `成员 ${memberId} 不存在` };
        },
      }),

      create_member: tool({
        description: '创建 AI 成员（人类成员需绑定登录账号，不在此工具范围）',
        inputSchema: z.object({
          displayName: z.string().describe('名称'),
          title: z.string().optional().describe('职务/角色标题'),
          description: z.string().optional().describe('职责描述'),
          aiModelConfigId: z
            .string()
            .optional()
            .describe('AI 模型配置 ID（创建 AI 成员必填）'),
          personalPrompt: z.string().optional().describe('个人提示词'),
        }),
        execute: async ({
          displayName,
          title,
          description,
          aiModelConfigId,
          personalPrompt,
        }) => {
          try {
            const member = await this.memberService.create(
              {
                type: 'ai_agent',
                displayName,
                title,
                description,
                aiModelConfigId,
                personalPrompt,
              },
              requireUser(),
            );
            return jsonSafe({
              memberId: member.id,
              displayName: member.displayName,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      update_member: tool({
        description:
          '更新成员资料（名称/职务/描述/个人提示词；系统内置 AI 助理也可改这些）',
        inputSchema: z.object({
          memberId: z.string().describe('成员 ID'),
          displayName: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          personalPrompt: z.string().optional(),
        }),
        execute: async ({ memberId, ...patch }) => {
          try {
            const member = await this.memberService.update(
              memberId,
              compact(patch),
            );
            return jsonSafe({
              memberId: member.id,
              displayName: member.displayName,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      deactivate_member: tool({
        description:
          '停用成员（软删除；必须先向用户确认。系统内置 AI 助理不可停用）',
        inputSchema: z.object({
          memberId: z.string().describe('成员 ID'),
          confirm: z.boolean().describe('必须为 true，且仅在用户明确同意后'),
        }),
        execute: async ({ memberId, confirm }) => {
          if (!confirm)
            return { error: '缺少用户确认：请先向用户确认后再停用' };
          try {
            const member = await this.memberService.update(memberId, {
              status: 'inactive',
            });
            return jsonSafe({ memberId: member.id, status: member.status });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      // ============ 团队 ============
      list_teams: tool({
        description: '列出团队（名称/状态）',
        inputSchema: z.object({}),
        execute: async () => {
          const teams = await this.prisma.team.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { id: true, name: true, description: true, status: true },
          });
          return jsonSafe({ teams });
        },
      }),

      create_team: tool({
        description: '创建团队',
        inputSchema: z.object({
          name: z.string().describe('团队名称'),
          description: z.string().optional(),
        }),
        execute: async ({ name, description }) => {
          try {
            const team = await this.teamService.create(
              { name, description, slug: `ai-${randomUUID().slice(0, 8)}` },
              requireUser(),
            );
            return jsonSafe({ teamId: team.id, name: team.name });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      update_team: tool({
        description: '更新团队名称/描述',
        inputSchema: z.object({
          teamId: z.string().describe('团队 ID'),
          name: z.string().optional(),
          description: z.string().optional(),
        }),
        execute: async ({ teamId, ...patch }) => {
          try {
            const team = await this.teamService.update(teamId, compact(patch));
            return jsonSafe({ teamId: team.id, name: team.name });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      archive_team: tool({
        description: '归档团队（必须先向用户确认）',
        inputSchema: z.object({
          teamId: z.string().describe('团队 ID'),
          confirm: z.boolean().describe('必须为 true，且仅在用户明确同意后'),
        }),
        execute: async ({ teamId, confirm }) => {
          if (!confirm)
            return { error: '缺少用户确认：请先向用户确认后再归档' };
          try {
            await this.teamService.archive(teamId);
            return { archived: true, teamId };
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      // ============ 迭代 / 里程碑 ============
      list_iterations: tool({
        description: '列出项目迭代（名称/起止/状态）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ projectId }) => {
          const target = projectId ?? defaultProjectId;
          if (!target) return { error: '缺少项目上下文：请提供 projectId' };
          const iterations = await this.prisma.iteration.findMany({
            where: { projectId: target },
            orderBy: { startDate: 'desc' },
            take: 10,
            select: {
              id: true,
              name: true,
              goal: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          });
          return jsonSafe({ iterations });
        },
      }),

      create_iteration: tool({
        description:
          '创建迭代（名称 + 起止日期必填；status: planned|active|completed|cancelled）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          name: z.string().describe('迭代名称'),
          startDate: z.string().describe('开始日期（YYYY-MM-DD）'),
          endDate: z.string().describe('结束日期（YYYY-MM-DD）'),
          goal: z.string().optional().describe('迭代目标'),
          status: z
            .enum(['planned', 'active', 'completed', 'cancelled'])
            .default('planned')
            .describe('状态，默认 planned'),
        }),
        execute: async ({
          projectId,
          name,
          startDate,
          endDate,
          goal,
          status,
        }) => {
          const target = projectId ?? defaultProjectId;
          if (!target) return { error: '缺少项目上下文：请提供 projectId' };
          const data: Prisma.IterationUncheckedCreateInput = {
            projectId: target,
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status,
            ...(goal ? { goal } : {}),
          };
          const iteration = await this.prisma.iteration.create({ data });
          return jsonSafe({ iterationId: iteration.id, name: iteration.name });
        },
      }),

      update_iteration: tool({
        description: '更新迭代状态/目标',
        inputSchema: z.object({
          iterationId: z.string().describe('迭代 ID'),
          status: z
            .enum(['planned', 'active', 'completed', 'cancelled'])
            .optional(),
          goal: z.string().optional(),
        }),
        execute: async ({ iterationId, ...patch }) => {
          try {
            const iteration = await this.prisma.iteration.update({
              where: { id: iterationId },
              data: compact(patch),
            });
            return jsonSafe({
              iterationId: iteration.id,
              status: iteration.status,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      list_milestones: tool({
        description: '列出项目里程碑',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ projectId }) => {
          const target = projectId ?? defaultProjectId;
          const milestones = await this.prisma.milestone.findMany({
            where: target ? { projectId: target } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, name: true, targetDate: true, status: true },
          });
          return jsonSafe({ milestones });
        },
      }),

      create_milestone: tool({
        description:
          '创建里程碑（status: planned|in_progress|reached|missed|cancelled）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          name: z.string().describe('里程碑名称'),
          targetDate: z.string().optional().describe('目标日期（YYYY-MM-DD）'),
          status: z
            .enum(['planned', 'in_progress', 'reached', 'missed', 'cancelled'])
            .default('planned')
            .describe('状态，默认 planned'),
        }),
        execute: async ({ projectId, name, targetDate, status }) => {
          const target = projectId ?? defaultProjectId;
          const data: Prisma.MilestoneUncheckedCreateInput = {
            name,
            status,
            ...(target ? { projectId: target } : {}),
            ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
          };
          const milestone = await this.prisma.milestone.create({ data });
          return jsonSafe({ milestoneId: milestone.id, name: milestone.name });
        },
      }),

      update_milestone: tool({
        description: '更新里程碑状态/名称',
        inputSchema: z.object({
          milestoneId: z.string().describe('里程碑 ID'),
          name: z.string().optional(),
          status: z
            .enum(['planned', 'in_progress', 'reached', 'missed', 'cancelled'])
            .optional(),
        }),
        execute: async ({ milestoneId, ...patch }) => {
          try {
            const milestone = await this.prisma.milestone.update({
              where: { id: milestoneId },
              data: compact(patch),
            });
            return jsonSafe({
              milestoneId: milestone.id,
              status: milestone.status,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      // ============ 标签 / 状态 / 角色 ============
      list_labels: tool({
        description: '列出标签（可按项目过滤）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ projectId }) => {
          const target = projectId ?? defaultProjectId;
          const labels = await this.prisma.tag.findMany({
            where: target ? { projectId: target } : undefined,
            take: 30,
            select: { id: true, name: true, color: true, resourceType: true },
          });
          return jsonSafe({ labels });
        },
      }),

      create_label: tool({
        description: '创建标签（resourceType: project|task|bug|document）',
        inputSchema: z.object({
          name: z.string().describe('标签名'),
          color: z.string().optional().describe('颜色（如 #5E6AD2）'),
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          resourceType: z
            .enum(['project', 'task', 'bug', 'document'])
            .optional(),
        }),
        execute: async ({ name, color, projectId, resourceType }) => {
          const label = await this.prisma.tag.create({
            data: {
              name,
              color,
              projectId: projectId ?? defaultProjectId,
              resourceType,
              createdBy: userId,
            },
          });
          return jsonSafe({ labelId: label.id, name: label.name });
        },
      }),

      list_project_statuses: tool({
        description:
          '列出状态定义（创建/更新任务时的合法 status key 由此查询）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ projectId }) => {
          const target = projectId ?? defaultProjectId;
          const statuses = await this.prisma.statusDefinition.findMany({
            where: target ? { projectId: target } : undefined,
            orderBy: { order: 'asc' },
            take: 30,
            select: {
              id: true,
              key: true,
              name: true,
              type: true,
              isFinal: true,
            },
          });
          return jsonSafe({ statuses });
        },
      }),

      list_project_roles: tool({
        description: '列出项目角色定义（executionRole/promptHint）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ projectId }) => {
          const target = projectId ?? defaultProjectId;
          const roles = await this.prisma.projectRoleDefinition.findMany({
            where: target ? { projectId: target } : undefined,
            take: 20,
            select: {
              id: true,
              key: true,
              name: true,
              executionRole: true,
              promptHint: true,
            },
          });
          return jsonSafe({ roles });
        },
      }),

      // ============ 绑定关系 ============
      assign_member_to_task: tool({
        description:
          '把成员（人类或 AI）指派到任务：写 TaskAssignee 多对多并同步任务主负责人字段；' +
          '指派 AI 成员会自动触发 CLI 派发执行。执行前与用户确认人选。',
        inputSchema: z.object({
          taskId: z.string().describe('任务 ID'),
          memberId: z.string().describe('成员 ID（list_members 可查）'),
        }),
        execute: async ({ taskId, memberId }) => {
          try {
            const result = await this.taskAssigneeService.add(
              { taskId, memberId },
              requireUser(),
            );
            return jsonSafe({
              taskId,
              memberId,
              ...(result as Record<string, unknown>),
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      bind_member_to_project: tool({
        description:
          '把成员绑定到项目（role: owner|maintainer|member|guest，默认 member）。' +
          '人类成员绑定后获得项目权限；AI 成员绑定后方可被派发/指派。',
        inputSchema: z.object({
          memberId: z.string().describe('成员 ID'),
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
          role: z
            .enum(['owner', 'maintainer', 'member', 'guest'])
            .optional()
            .describe('项目角色，默认 member'),
        }),
        execute: async ({ memberId, projectId, role }) => {
          const target = projectId ?? defaultProjectId;
          if (!target) return { error: '缺少项目上下文：请提供 projectId' };
          try {
            const binding = await this.memberService.bindProject(memberId, {
              projectId: target,
              ...(role ? { role } : {}),
            });
            return jsonSafe({
              bindingId: binding.id,
              memberId,
              projectId: binding.projectId,
              role: binding.role,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      add_member_to_team: tool({
        description:
          '把成员加入团队（同时向团队已绑定的全部项目传播项目成员身份）',
        inputSchema: z.object({
          teamId: z.string().describe('团队 ID'),
          memberId: z.string().describe('成员 ID'),
          role: z
            .enum(['owner', 'maintainer', 'member', 'guest'])
            .optional()
            .describe('团队角色，默认 member'),
        }),
        execute: async ({ teamId, memberId, role }) => {
          try {
            const teamMember = await this.teamService.addMember(teamId, {
              memberId,
              ...(role ? { role } : {}),
            });
            return jsonSafe({
              teamMemberId: teamMember.id,
              teamId,
              memberId,
              role: teamMember.role,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      bind_team_to_project: tool({
        description:
          '把团队绑定到项目：全体团队成员自动获得该项目成员身份（可指派/可派发）',
        inputSchema: z.object({
          teamId: z.string().describe('团队 ID'),
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ teamId, projectId }) => {
          const target = projectId ?? defaultProjectId;
          if (!target) return { error: '缺少项目上下文：请提供 projectId' };
          try {
            const teamProject = await this.teamService.bindProject(teamId, {
              projectId: target,
            });
            return jsonSafe({
              teamProjectId: teamProject.id,
              teamId,
              projectId: teamProject.projectId,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      // ============ 验收 / 仓库 / 决策 ============
      list_task_acceptances: tool({
        description:
          '列出任务的验收单及状态（draft|pending|in_review|passed|failed|waived）',
        inputSchema: z.object({ taskId: z.string().describe('任务 ID') }),
        execute: async ({ taskId }) => {
          const acceptances = await this.prisma.acceptance.findMany({
            where: { taskId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              title: true,
              status: true,
              completionType: true,
              totalTokens: true,
              totalCost: true,
            },
          });
          return jsonSafe({ acceptances });
        },
      }),

      create_acceptance: tool({
        description:
          '为任务创建验收契约（draft 起步；completionType 留空按任务类型/标签推断；' +
          'criteria 为验收标准数组，criteriaType: functional|technical）',
        inputSchema: z.object({
          taskId: z.string().describe('任务 ID'),
          title: z
            .string()
            .optional()
            .describe('标题（缺省为「验收 - 任务标题」）'),
          description: z.string().optional(),
          completionType: z
            .enum(['pr', 'test_report', 'document', 'artifact'])
            .optional()
            .describe('完成契约类型，留空自动推断'),
          priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
          criteria: z
            .array(
              z.object({
                criteriaType: z.enum(['functional', 'technical']),
                content: z.string().describe('标准内容描述'),
                category: z
                  .string()
                  .optional()
                  .describe('功能/性能/安全等分类'),
                weight: z.number().int().optional().describe('权重，默认 1'),
                severity: z
                  .enum(['critical', 'high', 'medium', 'low'])
                  .optional(),
              }),
            )
            .optional()
            .describe('验收标准列表'),
        }),
        execute: async ({
          taskId,
          title,
          description,
          completionType,
          priority,
          criteria,
        }) => {
          try {
            const acceptance = await this.acceptanceService.create(
              {
                taskId,
                title,
                description,
                completionType,
                priority,
                ...(criteria && criteria.length > 0
                  ? {
                      criteria: criteria.map((c, index) => ({
                        ...c,
                        source: 'manual',
                        order: index,
                      })),
                    }
                  : {}),
              },
              requireUser(),
            );
            return jsonSafe({
              acceptanceId: acceptance.id,
              status: acceptance.status,
              title: acceptance.title,
              criteriaCount: acceptance.criteria?.length ?? 0,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      update_acceptance: tool({
        description:
          '更新验收契约：元数据（标题/描述/优先级/完成契约类型）与' +
          ' draft|pending|in_review 间状态流转（in_review=提交验收待人类接收）；' +
          '终态（passed/failed/waived）走 resolve_acceptance',
        inputSchema: z.object({
          acceptanceId: z.string().describe('验收 ID'),
          title: z.string().optional(),
          description: z.string().optional(),
          priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
          completionType: z
            .enum(['pr', 'test_report', 'document', 'artifact'])
            .optional(),
          status: z
            .enum(['draft', 'pending', 'in_review'])
            .optional()
            .describe('状态流转'),
        }),
        execute: async ({ acceptanceId, ...patch }) => {
          try {
            const acceptance = await this.acceptanceService.update(
              acceptanceId,
              compact(patch),
            );
            return jsonSafe({
              acceptanceId: acceptance.id,
              status: acceptance.status,
              title: acceptance.title,
            });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      resolve_acceptance: tool({
        description:
          '验收终态裁决：action=accept 通过（仅 in_review 可接收，且须满足验收标准聚合校验）/ ' +
          'reject 打回（reason 必填）/ waive 豁免（reason 必填）。' +
          '影响任务完成门禁——调用前必须先向用户确认（confirm=true）。',
        inputSchema: z.object({
          acceptanceId: z.string().describe('验收 ID'),
          action: z.enum(['accept', 'reject', 'waive']).describe('裁决动作'),
          confirm: z.boolean().describe('必须为 true，且仅在用户明确同意后'),
          reason: z.string().optional().describe('reject/waive 时必填：原因'),
          evidence: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('accept 时可附完成证据'),
        }),
        execute: async ({
          acceptanceId,
          action,
          confirm,
          reason,
          evidence,
        }) => {
          if (!confirm) {
            return {
              error: '缺少用户确认：验收终态影响任务完成门禁，请先向用户确认',
            };
          }
          try {
            if (action === 'accept') {
              const acceptance = await this.acceptanceService.acceptCompletion(
                acceptanceId,
                evidence,
                requireUser(),
              );
              return jsonSafe({ acceptanceId, status: acceptance.status });
            }
            if (!reason || !reason.trim()) {
              return {
                error: `${action === 'reject' ? '打回' : '豁免'}必须提供 reason（原因）`,
              };
            }
            if (action === 'reject') {
              const acceptance = await this.acceptanceService.rejectCompletion(
                acceptanceId,
                reason,
                requireUser(),
              );
              return jsonSafe({ acceptanceId, status: acceptance.status });
            }
            const acceptance = await this.acceptanceService.waiveCompletion(
              acceptanceId,
              reason,
              requireUser(),
            );
            return jsonSafe({ acceptanceId, status: acceptance.status });
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      list_repositories: tool({
        description: '列出项目代码仓库（名称/分支/提供方）',
        inputSchema: z.object({
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async ({ projectId }) => {
          const target = projectId ?? defaultProjectId;
          if (!target) return { error: '缺少项目上下文：请提供 projectId' };
          const repositories = await this.prisma.repository.findMany({
            where: { projectId: target },
            select: {
              id: true,
              name: true,
              defaultBranch: true,
              provider: true,
              role: true,
            },
          });
          return jsonSafe({ repositories });
        },
      }),

      list_pending_decisions: tool({
        description: '当前工作区待人类决策的提案（最多 10 条）',
        inputSchema: z.object({}),
        execute: async () => {
          const proposals = await this.prisma.decisionProposal.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              kind: true,
              title: true,
              detail: true,
              projectId: true,
              createdAt: true,
            },
          });
          return jsonSafe({ proposals });
        },
      }),

      propose_decision: tool({
        description:
          '向人提交决策建议卡，人在决策面板采纳后才会执行（不要直接替代人做决定）',
        inputSchema: z.object({
          kind: z.enum(PROPOSAL_KINDS),
          title: z.string().describe('建议标题'),
          payload: z.record(z.string(), z.unknown()).describe('结构化载荷'),
          detail: z.string().optional().describe('补充说明'),
        }),
        execute: async ({ kind, title, payload, detail }) => {
          // assignment 提案在创建时即校验形状，避免采纳时才炸
          if (kind === 'assignment') {
            const assignments = (
              payload as { assignments?: Array<Record<string, unknown>> }
            ).assignments;
            if (
              !Array.isArray(assignments) ||
              assignments.length === 0 ||
              assignments.some(
                (a) =>
                  typeof a?.taskId !== 'string' ||
                  typeof a?.memberId !== 'string',
              )
            ) {
              return {
                error:
                  'assignment 提案的 payload.assignments 必须是非空数组，每项形如 { taskId, memberId }',
              };
            }
          }
          // 提案人归因到平台助理「小周」的真实 Member（V3 身份口径）
          const assistantMember = await this.prisma.member.findUnique({
            where: { handle: SYSTEM_ASSISTANT_HANDLE },
            select: { id: true },
          });
          const proposal = await this.prisma.decisionProposal.create({
            data: {
              kind,
              title,
              detail,
              payload: payload as Prisma.InputJsonValue,
              projectId: defaultProjectId ?? null,
              proposerType: 'ai_agent',
              proposerId: assistantMember?.id ?? null,
              status: 'pending',
            },
          });
          this.logger.log(
            `Assistant proposed ${kind} decision ${proposal.id}: ${title}`,
          );
          // 全量字段回传：前端消息流据此内联渲染决策卡（无需二次拉取）
          return jsonSafe({
            proposalId: proposal.id,
            status: proposal.status,
            kind,
            title,
            detail,
            payload,
            projectId: defaultProjectId ?? null,
            createdAt: proposal.createdAt,
          });
        },
      }),

      // ── 记忆 Store B（recall / note / whatDoYouKnow）：模型只读事实、写原子带溯源 ──

      recall_memory: tool({
        description:
          '召回活跃记忆（用户偏好/项目结论/纪要）。回答"之前怎么决定/用户喜欢什么"类问题先查这里再作答；查无结果如实说没有，绝不编造。',
        inputSchema: z.object({
          query: z.string().optional().describe('关键词（正文中包含匹配）'),
          type: z
            .enum([
              'preference',
              'conclusion',
              'summary',
              'relationship',
              'capability',
            ])
            .optional()
            .describe('记忆类型过滤'),
          limit: z.number().optional().describe('最多返回条数，默认 8'),
        }),
        execute: async ({ query, type, limit }) => {
          const items = await this.memoryService.recall({
            projectId: defaultProjectId,
            query: query ?? undefined,
            type: type ?? undefined,
            limit: limit ?? undefined,
          });
          return jsonSafe({
            items,
            note: items.length
              ? undefined
              : '没有匹配的记忆——请如实告诉用户你不知道。',
          });
        },
      }),

      note_memory: tool({
        description:
          '记录一条值得长期记住的记忆原子（用户偏好/结论/约定）。不存数据库能实时查到的状态；重复记录会提升置信度而非重复插入。',
        inputSchema: z.object({
          type: z.enum(['preference', 'conclusion', 'summary', 'relationship']),
          content: z
            .string()
            .min(4)
            .describe('记忆正文（原子：一条一个事实/偏好/结论）'),
          confidence: z.number().min(0).max(1).optional(),
        }),
        execute: async ({ type, content, confidence }) => {
          const atom = await this.memoryService.note({
            projectId: defaultProjectId,
            type,
            content,
            confidence: confidence ?? 0.8,
            sourceType: 'tool',
            createdBy: userId ? `user:${userId}` : undefined,
          });
          return jsonSafe(atom);
        },
      }),

      what_do_you_know: tool({
        description:
          '查看你对当前作用域（项目/全局）知道些什么：交接摘要（钉住优先+最新记忆+计数）。',
        inputSchema: z.object({}),
        execute: async () => {
          const brief = await this.memoryService.brief(defaultProjectId);
          return jsonSafe(brief);
        },
      }),

      // ── 接口协作卡（交接试点）：请求方提案、提供方拥有 spec、请求方消费验证 ──

      request_collaboration: tool({
        description:
          '发起接口协作卡：需要后端 AI 提供新端点/接口时使用。负载是结构化契约（endpoint 形状/出处流程/相关代码/验收口径），不是小作文。',
        inputSchema: z.object({
          providerMemberId: z.string().describe('提供方成员 ID（后端 AI）'),
          title: z.string().describe('协作标题'),
          payload: z
            .record(z.string(), z.unknown())
            .describe('结构化负载：endpointShape/sourceFlow/targetSpec/relatedCode/acceptance'),
          relatedTaskId: z.string().optional().describe('关联任务 ID'),
          projectId: z.string().optional().describe('项目 ID，缺省为当前项目'),
        }),
        execute: async (input) => {
          try {
            const target = input.projectId ?? defaultProjectId;
            if (!target) return { error: '缺少项目上下文：请提供 projectId' };
            const requester = await this.resolveAssistantMemberId();
            const card = await this.collaborationService.create({
              projectId: target,
              title: input.title,
              requesterMemberId: requester,
              providerMemberId: input.providerMemberId,
              relatedTaskId: input.relatedTaskId,
              payload: input.payload,
            });
            return jsonSafe(card);
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      check_feasibility: tool({
        description:
          '可行性侦察（提供方答复前调用）：看自己在该项目在途执行是否满载、有无 CLI 工具授权——技术可行 + 容量可行都过关才承诺。',
        inputSchema: z.object({
          providerMemberId: z.string().optional().describe('提供方成员 ID，缺省为当前执行身份'),
        }),
        execute: async ({ providerMemberId }) => {
          const member = await this.resolveAssistantMemberId();
          const subjectId = providerMemberId ?? member;
          const [activeRuns, grants] = await Promise.all([
            this.prisma.executionRun.count({
              where: {
                subjectId,
                status: { in: ['planned', 'in_progress', 'pending_approval'] },
              },
            }),
            this.prisma.memberToolGrant.findMany({
              where: { memberId: subjectId, granted: true },
              select: { scope: true, refKey: true },
            }),
          ]);
          const capacityLimit = 5;
          return jsonSafe({
            activeRuns,
            capacityLimit,
            capacityAvailable: activeRuns < capacityLimit,
            grantedTools: grants.map((g) => g.refKey),
            note:
              activeRuns >= capacityLimit
                ? '在途执行已满载：建议排队或拒绝并说明容量原因'
                : '容量可接：评估技术可行性后给出承诺/拒绝/需澄清',
          });
        },
      }),

      respond_collaboration: tool({
        description:
          '答复收到的协作卡（提供方身份）：committed=承诺（落库即承诺）/ rejected=拒绝+理由 / clarify=需澄清（轮次超 2 自动升级人类拍板）。',
        inputSchema: z.object({
          cardId: z.string().describe('协作卡 ID'),
          decision: z.enum(['committed', 'rejected', 'clarify']),
          note: z.string().optional().describe('承诺口径/拒绝理由/澄清问题'),
        }),
        execute: async ({ cardId, decision, note }) => {
          try {
            const card = await this.collaborationService.respond(cardId, {
              decision,
              note,
            });
            return jsonSafe(card);
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),

      verify_collaboration: tool({
        description:
          '验证交付（请求方身份）：消费 client/mock 联调、跑契约测试，契约绿才 verified；不绿 changes_requested 打回。',
        inputSchema: z.object({
          cardId: z.string().describe('协作卡 ID'),
          verdict: z.enum(['verified', 'changes_requested']),
          note: z.string().optional().describe('联调结果/打回原因'),
        }),
        execute: async ({ cardId, verdict, note }) => {
          try {
            const card = await this.collaborationService.verify(cardId, {
              verdict,
              note,
            });
            return jsonSafe(card);
          } catch (err) {
            return { error: errText(err) };
          }
        },
      }),
    };
  }

  /**
   * 平台助理「小周」的 Member ID：协作卡/提案的发起方归因（V3 身份口径）。
   * 助手工具以小周身份发起协作，验证以小周代表请求方消费。
   */
  private async resolveAssistantMemberId(): Promise<string> {
    const assistant = await this.prisma.member.findUnique({
      where: { handle: SYSTEM_ASSISTANT_HANDLE },
      select: { id: true },
    });
    if (!assistant) throw new Error('系统助理成员不存在（xiaozhou）');
    return assistant.id;
  }
}

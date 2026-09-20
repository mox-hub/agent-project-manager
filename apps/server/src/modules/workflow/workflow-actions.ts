/**
 * Workflow 产品动作注册表（CAP-A-12 文法 v2）——「项目暴露的功能做成节点」。
 *
 * 单一真相：server 注册表 → GET /workflows/actions 目录供前端节点库/下拉；
 * action 步骤执行时按 id 查表。新增动作 = 在此登记一个 def（含必填参数与
 * 执行函数），文法/画布/AI 代写目录自动获得该节点。
 *
 * 边界：动作执行直接走 prisma（对齐 proposal 组合件 applier 先例——不反向
 * 依赖 issue/document 模块 service，防模块环）；参数叶子在编译期已完成插值。
 */
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '@/core/database/prisma.service';

export interface WorkflowActionDef {
  /** 注册表 id（definition 步骤的 action 字段取值，kebab-case） */
  id: string;
  title: string;
  description: string;
  /** 必填参数（缺失在执行期可读报错） */
  requiredParams: string[];
  /** 参数说明（前端属性面板 + AI 代写目录共用） */
  inputHint: Record<string, string>;
  /** 返回写入步骤输出（{steps.<id>.…} 供下游插值） */
  execute(
    prisma: PrismaService,
    params: Record<string, unknown>,
  ): Promise<unknown>;
}

function requireParams(
  action: WorkflowActionDef,
  params: Record<string, unknown>,
): void {
  const missing = action.requiredParams.filter(
    (key) =>
      params[key] === undefined ||
      params[key] === null ||
      String(params[key]).trim() === '',
  );
  if (missing.length > 0) {
    throw new BadRequestException(
      `动作 ${action.id} 缺少必填参数：${missing.join('、')}`,
    );
  }
}

export const WORKFLOW_ACTIONS: Record<string, WorkflowActionDef> = {
  'issue.create': {
    id: 'issue.create',
    title: '创建工单',
    description: '在指定项目下创建一条任务（issue）',
    requiredParams: ['projectId', 'title'],
    inputHint: {
      projectId: '目标项目 ID',
      title: '工单标题',
      description: '工单描述（可选）',
      estimate: '预估小时数（可选，数字）',
    },
    execute: async (prisma, params) => {
      const def = WORKFLOW_ACTIONS['issue.create'];
      requireParams(def, params);
      const issue = await prisma.issue.create({
        data: {
          projectId: String(params.projectId),
          title: String(params.title),
          description:
            params.description !== undefined
              ? String(params.description)
              : undefined,
          estimate:
            params.estimate !== undefined && params.estimate !== ''
              ? Number(params.estimate)
              : undefined,
          status: 'todo',
          priority: 'medium',
          type: 'task',
        },
      });
      return { issueId: issue.id, title: issue.title };
    },
  },
  'document.create': {
    id: 'document.create',
    title: '创建文档',
    description: '在指定项目下落一篇文档（内容可来自上游 AI 步骤输出）',
    requiredParams: ['projectId', 'title', 'content'],
    inputHint: {
      projectId: '目标项目 ID',
      title: '文档标题',
      content: '文档正文（支持 {steps.x.value} 引用上游 AI 输出）',
      category: '文档分类（可选，默认 custom）',
    },
    execute: async (prisma, params) => {
      const def = WORKFLOW_ACTIONS['document.create'];
      requireParams(def, params);
      const document = await prisma.document.create({
        data: {
          projectId: String(params.projectId),
          title: String(params.title),
          content: String(params.content),
          category:
            params.category !== undefined ? String(params.category) : 'custom',
          authorId: 'workflow-action',
        },
      });
      return { documentId: document.id, title: document.title };
    },
  },

  'release.create': {
    id: 'release.create',
    title: '创建发版草案',
    description:
      '在指定项目下创建一条发版草案（status=draft，走门禁/审批后发布）',
    requiredParams: ['projectId', 'version'],
    inputHint: {
      projectId: '目标项目 ID',
      version: '版本号（semver，如 1.2.0）',
      name: '发版名称（可选）',
      notes: '发版说明 markdown（可选）',
    },
    execute: async (prisma, params) => {
      const def = WORKFLOW_ACTIONS['release.create'];
      requireParams(def, params);
      const release = await prisma.release.create({
        data: {
          projectId: String(params.projectId),
          version: String(params.version),
          name: params.name !== undefined ? String(params.name) : undefined,
          notes: params.notes !== undefined ? String(params.notes) : undefined,
          createdBy: 'workflow-action',
        },
      });
      return { releaseId: release.id, version: release.version };
    },
  },

  'release.latest': {
    id: 'release.latest',
    title: '读取最新发版',
    description: '读取指定项目最新一条发版（供下游步骤插值发布信息）',
    requiredParams: ['projectId'],
    inputHint: {
      projectId: '目标项目 ID',
    },
    execute: async (prisma, params) => {
      const def = WORKFLOW_ACTIONS['release.latest'];
      requireParams(def, params);
      const release = await prisma.release.findFirst({
        where: { projectId: String(params.projectId) },
        orderBy: [{ releasedAt: 'desc' }, { createdAt: 'desc' }],
      });
      if (!release) {
        throw new BadRequestException(`项目 ${params.projectId} 尚无发版记录`);
      }
      return {
        releaseId: release.id,
        version: release.version,
        status: release.status,
        gitTag: release.gitTag,
        releasedAt: release.releasedAt?.toISOString() ?? null,
      };
    },
  },
};

/** 目录（GET /workflows/actions）：不含执行函数，供前端节点库与 AI 代写 */
export function listWorkflowActions(): Array<
  Omit<WorkflowActionDef, 'execute'>
> {
  return Object.values(WORKFLOW_ACTIONS).map(
    ({ execute: _execute, ...rest }) => rest,
  );
}

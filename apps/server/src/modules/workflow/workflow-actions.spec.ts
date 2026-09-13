/**
 * Workflow 产品动作注册表测试（GAP-T-14 清偿）——
 * WORKFLOW_ACTIONS（issue.create / document.create）的 requireParams 校验与
 * prisma 落库载荷，以及 listWorkflowActions 目录（GET /workflows/actions 契约：
 * 不含 execute，前端节点库与 AI 代写共用）。
 * prisma 用手写假对象注入（动作执行直接走 prisma，不反向依赖模块 service）。
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { listWorkflowActions, WORKFLOW_ACTIONS } from './workflow-actions';

/** 手写假 prisma：仅动作执行涉及的 issue/document create */
function makePrisma() {
  return {
    issue: {
      create: vi.fn().mockResolvedValue({ id: 'iss_1', title: '标题' }),
    },
    document: {
      create: vi.fn().mockResolvedValue({ id: 'doc_1', title: '文档' }),
    },
  };
}

describe('注册表与目录（GET /workflows/actions 单一真相）', () => {
  it('注册表含 issue.create 与 document.create，必填参数口径正确', () => {
    expect(Object.keys(WORKFLOW_ACTIONS)).toEqual(
      expect.arrayContaining(['issue.create', 'document.create']),
    );
    expect(WORKFLOW_ACTIONS['issue.create'].requiredParams).toEqual([
      'projectId',
      'title',
    ]);
    expect(WORKFLOW_ACTIONS['document.create'].requiredParams).toEqual([
      'projectId',
      'title',
      'content',
    ]);
  });

  it('listWorkflowActions 不外泄 execute，字段清单完整', () => {
    const actions = listWorkflowActions();
    expect(actions).toHaveLength(Object.keys(WORKFLOW_ACTIONS).length);
    for (const action of actions) {
      expect(action).not.toHaveProperty('execute');
      expect(Object.keys(action).sort()).toEqual(
        ['description', 'id', 'inputHint', 'requiredParams', 'title'].sort(),
      );
    }
    // 动作 id 与 inputHint 供前端节点库/AI 代写直读
    const issueCreate = actions.find((a) => a.id === 'issue.create');
    expect(issueCreate?.title).toBe('创建工单');
    expect(issueCreate?.inputHint).toHaveProperty('projectId');
  });
});

describe('issue.create execute', () => {
  it('全参数：落库载荷正确（todo/medium/task 默认值，estimate 数字化），返回 issueId', async () => {
    const prisma = makePrisma();
    const output = await WORKFLOW_ACTIONS['issue.create'].execute(
      prisma as never,
      {
        projectId: 'proj_1',
        title: '报销看板',
        description: '说明',
        estimate: '3',
      },
    );

    expect(prisma.issue.create).toHaveBeenCalledWith({
      data: {
        projectId: 'proj_1',
        title: '报销看板',
        description: '说明',
        estimate: 3,
        status: 'todo',
        priority: 'medium',
        type: 'task',
      },
    });
    expect(output).toEqual({ issueId: 'iss_1', title: '标题' });
  });

  it('可选参数缺省：description/estimate 不落 undefined 字段', async () => {
    const prisma = makePrisma();
    await WORKFLOW_ACTIONS['issue.create'].execute(prisma as never, {
      projectId: 'proj_1',
      title: '只填必填',
    });

    expect(prisma.issue.create).toHaveBeenCalledWith({
      data: {
        projectId: 'proj_1',
        title: '只填必填',
        description: undefined,
        estimate: undefined,
        status: 'todo',
        priority: 'medium',
        type: 'task',
      },
    });
  });

  it('缺 projectId / 缺 title / title 空串 → BadRequestException 且不落库', async () => {
    const prisma = makePrisma();
    await expect(
      WORKFLOW_ACTIONS['issue.create'].execute(prisma as never, {
        title: '缺项目',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      WORKFLOW_ACTIONS['issue.create'].execute(prisma as never, {
        projectId: 'proj_1',
      }),
    ).rejects.toThrow(/动作 issue\.create 缺少必填参数：title/);
    await expect(
      WORKFLOW_ACTIONS['issue.create'].execute(prisma as never, {
        projectId: 'proj_1',
        title: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
    // 校验前置：不产生半截数据
    expect(prisma.issue.create).not.toHaveBeenCalled();
  });
});

describe('document.create execute', () => {
  it('全参数：落库载荷正确（category 显式传入、authorId=workflow-action），返回 documentId', async () => {
    const prisma = makePrisma();
    const output = await WORKFLOW_ACTIONS['document.create'].execute(
      prisma as never,
      {
        projectId: 'proj_1',
        title: '周报',
        content: '正文内容',
        category: 'report',
      },
    );

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        projectId: 'proj_1',
        title: '周报',
        content: '正文内容',
        category: 'report',
        authorId: 'workflow-action',
      },
    });
    expect(output).toEqual({ documentId: 'doc_1', title: '文档' });
  });

  it('category 缺省默认 custom', async () => {
    const prisma = makePrisma();
    await WORKFLOW_ACTIONS['document.create'].execute(prisma as never, {
      projectId: 'proj_1',
      title: '周报',
      content: '正文',
    });

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ category: 'custom' }),
    });
  });

  it('缺 content / content 为 null → BadRequestException 且不落库', async () => {
    const prisma = makePrisma();
    await expect(
      WORKFLOW_ACTIONS['document.create'].execute(prisma as never, {
        projectId: 'proj_1',
        title: '缺正文',
      }),
    ).rejects.toThrow(/动作 document\.create 缺少必填参数：content/);
    await expect(
      WORKFLOW_ACTIONS['document.create'].execute(prisma as never, {
        projectId: 'proj_1',
        title: '正文为 null',
        content: null,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.document.create).not.toHaveBeenCalled();
  });
});

/**
 * WorkflowService 单元测试（GAP-T-14 清偿）——
 * ① onModuleInit 模板库 upsert（CAP-A-12）：遍历 BUILTIN_WORKFLOW_TEMPLATES
 *   逐个 upsert 产品侧定义账（create 载荷完整 / update 幂等空对象 / where 按 key），
 *   demo 定义同时经 compiler 注册进 Mastra 引擎注册表。
 * ② 编辑回写 server 语义：createDefinition / updateDefinition 的文法校验拒绝、
 *   key 冲突、version 自增与 stepsSummary 返回。
 * @mastra/libsql 与 @mastra/core 整体 mock（避免真实 LibSQL 落盘），
 * compiler/messageBus/prisma 用手写假对象直接构造（不依赖 Nest 容器）。
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Mastra } from '@mastra/core';
import {
  BUILTIN_WORKFLOW_TEMPLATES,
  DEMO_WORKFLOW_DEFINITION,
  DEMO_WORKFLOW_KEY,
} from './workflow-builtin';
import { WorkflowService } from './workflow.service';
import type { WorkflowDefinitionDoc } from './workflow.definition';

// 注意：service 内是真实 new 构造，mock 实现必须是 function 形式（箭头函数不可 new）
vi.mock('@mastra/libsql', () => ({
  LibSQLStore: vi.fn(function LibSQLStoreMock() {
    return {
      init: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('@mastra/core', () => ({
  Mastra: vi.fn(function MastraMock() {
    return {
      getWorkflow: vi.fn().mockReturnValue({ marker: 'demo-engine-workflow' }),
    };
  }),
}));

/** 编译产物标记对象（断言 demo 注册链路时校验同一引用） */
const COMPILED_DEMO = { compiled: 'demo' };

function makeDeps() {
  const prisma = {
    aIWorkflowDefinition: {
      upsert: vi.fn().mockResolvedValue({ id: 'wf-up', key: 'k', version: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'wf-new', key: data.key, version: 1 }),
        ),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'wf-1',
          key: 'k1',
          // 真实 prisma update 返回整行：未改 definition 时回原值
          version: data.version ?? 5,
          definition: data.definition ?? goodDefinition(),
        }),
      ),
    },
  };
  const messageBus = { publish: vi.fn() };
  const compiler = { compile: vi.fn().mockReturnValue(COMPILED_DEMO) };
  return {
    prisma,
    messageBus,
    compiler,
    service: new WorkflowService(
      prisma as never,
      messageBus as never,
      compiler as never,
    ),
  };
}

/** 合法的新 definition（编辑回写用例的保存载荷） */
function goodDefinition(): WorkflowDefinitionDoc {
  return {
    version: 1,
    steps: [
      { id: 'draft', type: 'llm', title: '起草', prompt: '写 {input.topic}' },
    ],
  };
}

beforeEach(() => {
  vi.mocked(Mastra).mockClear();
});

describe('onModuleInit：内置模板库 upsert（CAP-A-12）', () => {
  it('每个内置模板恰好 upsert 一次，where 按模板 key', async () => {
    const { service, prisma } = makeDeps();
    await service.onModuleInit();

    expect(prisma.aIWorkflowDefinition.upsert).toHaveBeenCalledTimes(
      BUILTIN_WORKFLOW_TEMPLATES.length,
    );
    BUILTIN_WORKFLOW_TEMPLATES.forEach((template, i) => {
      expect(prisma.aIWorkflowDefinition.upsert).toHaveBeenNthCalledWith(
        i + 1,
        {
          where: { key: template.key },
          create: expect.any(Object),
          update: expect.any(Object),
        },
      );
    });
  });

  it('create 载荷完整：key/name/description/definition 原样、createdBy=null', async () => {
    const { service, prisma } = makeDeps();
    await service.onModuleInit();

    BUILTIN_WORKFLOW_TEMPLATES.forEach((template, i) => {
      const call = prisma.aIWorkflowDefinition.upsert.mock.calls[i][0] as {
        create: Record<string, unknown>;
      };
      expect(call.create).toEqual({
        key: template.key,
        name: template.name,
        description: template.description,
        definition: template.definition,
        createdBy: null,
      });
    });
  });

  it('幂等语义：update 载荷为空对象（重复启动不覆盖用户对模板的改动）', async () => {
    const { service, prisma } = makeDeps();
    await service.onModuleInit();

    for (const call of prisma.aIWorkflowDefinition.upsert.mock.calls) {
      expect((call[0] as { update: Record<string, unknown> }).update).toEqual(
        {},
      );
    }
  });

  it('demo 定义经 compiler 编译后注册进 Mastra 引擎注册表', async () => {
    const { service, compiler } = makeDeps();
    await service.onModuleInit();

    expect(compiler.compile).toHaveBeenCalledWith(
      DEMO_WORKFLOW_KEY,
      DEMO_WORKFLOW_DEFINITION,
    );
    expect(Mastra).toHaveBeenCalledTimes(1);
    const mastraArgs = vi.mocked(Mastra).mock.calls[0][0] as {
      workflows: Record<string, unknown>;
    };
    expect(mastraArgs.workflows[DEMO_WORKFLOW_KEY]).toBe(COMPILED_DEMO);
  });
});

describe('createDefinition（画布另存/创建）', () => {
  it('definition 文法非法 → BadRequestException（前缀「definition 文法非法」）', async () => {
    const { service } = makeDeps();
    await expect(
      service.createDefinition(
        { key: 'k1', name: 'n', definition: { version: 1, steps: [] } },
        'user_1',
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createDefinition(
        {
          key: 'k1',
          name: 'n',
          definition: { version: 1, steps: [{ id: 'a', type: 'action' }] },
        },
        'user_1',
      ),
    ).rejects.toThrow(/definition 文法非法/);
  });

  it('key 已存在 → BadRequestException 并带出既有版本号', async () => {
    const { service, prisma } = makeDeps();
    prisma.aIWorkflowDefinition.findUnique.mockResolvedValue({
      id: 'wf-old',
      key: 'k1',
      version: 7,
    });

    await expect(
      service.createDefinition(
        { key: 'k1', name: 'n', definition: goodDefinition() },
        'user_1',
      ),
    ).rejects.toThrow(/workflow key k1 已存在（v7）/);
    expect(prisma.aIWorkflowDefinition.create).not.toHaveBeenCalled();
  });

  it('成功创建：create 载荷含 createdBy=userId 与原样 definition', async () => {
    const { service, prisma } = makeDeps();
    const definition = goodDefinition();
    const created = await service.createDefinition(
      { key: 'k1', name: '名称', description: '描述', definition },
      'user_1',
    );

    expect(prisma.aIWorkflowDefinition.create).toHaveBeenCalledWith({
      data: {
        key: 'k1',
        name: '名称',
        description: '描述',
        definition,
        createdBy: 'user_1',
      },
    });
    expect(created).toMatchObject({ key: 'k1', version: 1 });
  });
});

describe('updateDefinition（编辑回写 server 语义）', () => {
  it('id 不存在 → NotFoundException 且不落 update', async () => {
    const { service, prisma } = makeDeps();
    prisma.aIWorkflowDefinition.findUnique.mockResolvedValue(null);

    await expect(
      service.updateDefinition('wf-missing', { name: '新名' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.aIWorkflowDefinition.update).not.toHaveBeenCalled();
  });

  it('definition 文法非法 → BadRequestException 且不落 update', async () => {
    const { service, prisma } = makeDeps();
    prisma.aIWorkflowDefinition.findUnique.mockResolvedValue({
      id: 'wf-1',
      key: 'k1',
      version: 3,
      definition: goodDefinition(),
    });

    await expect(
      service.updateDefinition('wf-1', {
        definition: { version: 1, steps: [{ id: '坏id', type: 'llm' }] },
      }),
    ).rejects.toThrow(/definition 文法非法/);
    expect(prisma.aIWorkflowDefinition.update).not.toHaveBeenCalled();
  });

  it('合法 definition：version 自增（旧 version+1），返回含 stepsSummary', async () => {
    const { service, prisma } = makeDeps();
    const next = goodDefinition();
    prisma.aIWorkflowDefinition.findUnique.mockResolvedValue({
      id: 'wf-1',
      key: 'k1',
      version: 3,
      definition: {
        version: 1,
        steps: [{ id: 'old', type: 'llm', prompt: '旧' }],
      },
    });

    const result = await service.updateDefinition('wf-1', { definition: next });

    expect(prisma.aIWorkflowDefinition.update).toHaveBeenCalledWith({
      where: { id: 'wf-1' },
      data: { definition: next, version: 4 },
    });
    expect(result.version).toBe(4);
    // stepsSummary 供前端保存后直读（id/type/title 摘要）
    expect(result.stepsSummary).toEqual([
      { id: 'draft', type: 'llm', title: '起草' },
    ]);
  });

  it('仅改 name/description：不触碰 definition 与 version', async () => {
    const { service, prisma } = makeDeps();
    prisma.aIWorkflowDefinition.findUnique.mockResolvedValue({
      id: 'wf-1',
      key: 'k1',
      version: 5,
      definition: goodDefinition(),
    });

    await service.updateDefinition('wf-1', {
      name: '新名',
      description: '新描述',
    });

    expect(prisma.aIWorkflowDefinition.update).toHaveBeenCalledWith({
      where: { id: 'wf-1' },
      data: { name: '新名', description: '新描述' },
    });
  });
});

describe('getDefinition：stepsSummary 读路径', () => {
  it('合法 definition 返回步骤摘要（id/type/title）', async () => {
    const { service, prisma } = makeDeps();
    prisma.aIWorkflowDefinition.findFirst.mockResolvedValue({
      id: 'wf-1',
      key: 'k1',
      name: 'n',
      version: 1,
      definition: goodDefinition(),
    });

    const detail = await service.getDefinition('wf-1');
    expect(detail.stepsSummary).toEqual([
      { id: 'draft', type: 'llm', title: '起草' },
    ]);
  });

  it('脏数据（文法非法）不炸接口：stepsSummary 降级为空数组', async () => {
    const { service, prisma } = makeDeps();
    prisma.aIWorkflowDefinition.findFirst.mockResolvedValue({
      id: 'wf-1',
      key: 'dirty',
      name: 'n',
      version: 1,
      definition: { version: 9, steps: 'broken' },
    });

    const detail = await service.getDefinition('wf-1');
    expect(detail.stepsSummary).toEqual([]);
  });

  it('id 或 key 均可命中（findFirst OR 查询）；未命中 → NotFoundException', async () => {
    const { service, prisma } = makeDeps();
    prisma.aIWorkflowDefinition.findFirst.mockResolvedValue(null);
    await expect(service.getDefinition('nope')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.aIWorkflowDefinition.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: 'nope' }, { key: 'nope' }] },
    });
  });
});

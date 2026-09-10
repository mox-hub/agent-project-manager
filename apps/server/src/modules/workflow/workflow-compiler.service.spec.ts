/**
 * WorkflowCompilerService 引擎语义测试（GAP-T-13）——
 * 用真实 Mastra 执行引擎跑编译产物：四类步骤执行/插值/human-confirm
 * suspend→resume 全链/condition 闸门失败回落。
 * suspend/resume 依赖 storage 快照（无快照 resume 报 No snapshot found），
 * 故统一挂 LibSQLStore（本地临时 db，afterAll 清理）。
 */
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
  beforeEach,
} from 'vitest';
import { randomUUID } from 'crypto';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import type { AnyWorkflow } from '@mastra/core/workflows';
import { generateText } from 'ai';
import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { WorkflowCompilerService } from './workflow-compiler.service';
import type { WorkflowDefinitionDoc } from './workflow.definition';

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: '模拟生成文本' }),
}));

const TEST_DB = `file:./data/wf-spec-${randomUUID()}.db`;
let storage: LibSQLStore;

beforeAll(async () => {
  // LibSQL file: 相对 cwd（apps/server），目录不存在时打开连接报 SQLITE_CANTOPEN(14)
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  storage = new LibSQLStore({ id: 'wf-spec', url: TEST_DB });
  await storage.init();
});

afterAll(async () => {
  await storage?.close?.();
  // Windows 下句柄释放存在竞态（EPERM），清理失败不阻塞测试（文件名含 uuid 不复用）
  const file = join(process.cwd(), TEST_DB.replace('file:./', ''));
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try {
      rmSync(`${file}${suffix}`, { force: true });
    } catch {
      /* ignore */
    }
  }
});

function makeCompiler() {
  const registry = {
    listAdapters: vi
      .fn()
      .mockReturnValue([{ provider: 'openai', model: 'gpt-test' }]),
    getAdapter: vi.fn().mockReturnValue({ getModel: () => ({}) }),
  };
  const prisma = {
    issue: {
      create: vi.fn().mockResolvedValue({ id: 'iss_1', title: '任务' }),
    },
    document: {
      create: vi.fn().mockResolvedValue({ id: 'doc_1', title: '文档' }),
    },
  };
  return {
    compiler: new WorkflowCompilerService(registry as never, prisma as never),
    registry,
    prisma,
  };
}

/** 经 Mastra 注册后执行（storage 快照注入），suspend/resume 才有持久化语义 */
async function runWorkflow(wf: AnyWorkflow, input: Record<string, unknown>) {
  const mastra = new Mastra({ storage, workflows: { wf } as never });
  const registered = mastra.getWorkflow(
    'wf' as never,
  ) as unknown as AnyWorkflow;
  const run = await registered.createRun();
  const result = await run.start({ inputData: { input, steps: {} } });
  return { run, result };
}

describe('parseWorkflowDefinition（经编译触发）', () => {
  it('非法结构/不支持类型/重复 id/缺失字段编译报错', () => {
    const { compiler } = makeCompiler();
    const bad: unknown[] = [
      null,
      { version: 2, steps: [{ id: 'a', type: 'llm', prompt: 'x' }] },
      { version: 1, steps: [] },
      {
        version: 1,
        steps: [
          { id: 'a', type: 'llm', prompt: 'x' },
          { id: 'a', type: 'llm', prompt: 'y' },
        ],
      },
      { version: 1, steps: [{ id: 'a', type: 'code', code: '1+1' }] },
      { version: 1, steps: [{ id: 'a', type: 'llm' }] },
    ];
    for (const definition of bad) {
      expect(() => compiler.compile('wf-test', definition)).toThrow();
    }
  });
});

describe('Mastra 编译产物执行语义', () => {
  beforeEach(() => {
    vi.mocked(generateText).mockClear();
  });

  it('llm 步骤：prompt 插值上下文并落 steps[id].value', async () => {
    const { compiler } = makeCompiler();
    const doc: WorkflowDefinitionDoc = {
      version: 1,
      steps: [
        {
          id: 'draft',
          type: 'llm',
          prompt: '主题是 {input.topic}，参考 {steps.prev.value}',
        },
      ],
    };
    const { result } = await runWorkflow(compiler.compile('wf-llm', doc), {
      topic: '看板',
    });

    expect(result.status).toBe('success');
    const ctx = (result as { result: { steps: Record<string, unknown> } })
      .result;
    expect(ctx.steps.draft).toEqual({ value: '模拟生成文本' });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: '主题是 看板，参考 ' }),
    );
  });

  it('http 步骤：URL/Body 插值、JSON 解析、状态码落 steps[id]', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '{"ok":true}',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { compiler } = makeCompiler();
    const doc: WorkflowDefinitionDoc = {
      version: 1,
      steps: [
        {
          id: 'call',
          type: 'http',
          url: 'https://example.test/api/{input.id}',
          method: 'POST',
          body: { from: '{input.topic}' },
        },
      ],
    };
    const { result } = await runWorkflow(compiler.compile('wf-http', doc), {
      id: '42',
      topic: '需求',
    });

    expect(result.status).toBe('success');
    const ctx = (result as { result: { steps: Record<string, unknown> } })
      .result;
    expect(ctx.steps.call).toEqual({ status: 200, body: { ok: true } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/42',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetchMock.mock.calls[0][1] as { body: string };
    expect(JSON.parse(init.body)).toEqual({ from: '需求' });
    vi.unstubAllGlobals();
  });

  it('human-confirm：先 suspend 带出确认信息，resume 后确认结果落账并继续', async () => {
    const { compiler } = makeCompiler();
    const doc: WorkflowDefinitionDoc = {
      version: 1,
      steps: [
        { id: 'draft', type: 'llm', prompt: '起草 {input.topic}' },
        {
          id: 'review',
          type: 'human-confirm',
          message: '请审核：{steps.draft.value}',
        },
      ],
    };
    const mastra = new Mastra({
      storage,
      workflows: { wf: compiler.compile('wf-confirm', doc) } as never,
    });
    const registered = mastra.getWorkflow(
      'wf' as never,
    ) as unknown as AnyWorkflow;
    const run = await registered.createRun();
    const first = await run.start({
      inputData: { input: { topic: 'XX' }, steps: {} },
    });

    expect(first.status).toBe('suspended');
    const suspended = first as unknown as {
      suspendPayload: Record<string, { stepId: string; message: string }>;
      suspended: string[][];
    };
    const payload = suspended.suspendPayload.review;
    expect(payload.stepId).toBe('review');
    expect(payload.message).toContain('模拟生成文本');

    const resumed = await run.resume({
      resumeData: { approved: true, note: '通过' },
      step: 'review',
    });
    expect(resumed.status).toBe('success');
    const ctx = (resumed as { result: { steps: Record<string, unknown> } })
      .result;
    expect(ctx.steps.review).toEqual({ approved: true, note: '通过' });
  });

  it('condition 闸门：met=true 放行，met=false 整个 run failed', async () => {
    const { compiler } = makeCompiler();
    const doc: WorkflowDefinitionDoc = {
      version: 1,
      steps: [
        {
          id: 'gate',
          type: 'condition',
          left: '{input.approved}',
          op: 'eq',
          right: true,
        },
      ],
    };
    const wf = compiler.compile('wf-gate', doc);

    const ok = await runWorkflow(wf, { approved: true });
    expect(ok.result.status).toBe('success');

    const bad = await runWorkflow(wf, { approved: false });
    expect(bad.result.status).toBe('failed');
  });

  it('action 步骤：params 插值后落库建 issue，输出进 steps[id]', async () => {
    const { compiler, prisma } = makeCompiler();
    const doc: WorkflowDefinitionDoc = {
      version: 1,
      steps: [
        {
          id: 'create',
          type: 'action',
          action: 'issue.create',
          params: {
            projectId: 'proj_1',
            title: '需求：{input.requirement}',
          },
        },
      ],
    };
    const wf = compiler.compile('wf-action', doc);
    const { result } = await runWorkflow(wf, { requirement: '报销看板' });

    expect(result.status).toBe('success');
    expect(prisma.issue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: 'proj_1',
        title: '需求：报销看板',
      }),
    });
    const ctx = (result.result as { steps: Record<string, unknown> }).steps;
    expect(ctx.create).toMatchObject({ issueId: 'iss_1' });
  });

  it('action 步骤：未知 action / 缺必填参数 → run failed（可读错误）', async () => {
    const { compiler } = makeCompiler();
    const unknown: WorkflowDefinitionDoc = {
      version: 1,
      steps: [{ id: 'a', type: 'action', action: 'nope.missing' }],
    };
    const unknownRun = await runWorkflow(compiler.compile('wf-u', unknown), {});
    expect(unknownRun.result.status).toBe('failed');

    const missing: WorkflowDefinitionDoc = {
      version: 1,
      steps: [
        {
          id: 'a',
          type: 'action',
          action: 'issue.create',
          params: { title: '缺 projectId' },
        },
      ],
    };
    const missingRun = await runWorkflow(compiler.compile('wf-m', missing), {});
    expect(missingRun.result.status).toBe('failed');
  });
});

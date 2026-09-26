import { NotFoundException } from '@nestjs/common';
import { PromptService } from './prompt.service';
import {
  DEFAULT_PROMPT_INJECTION,
  PROMPT_INJECTION_CONFIG_KEY,
  PROJECT_PROMPT_CONFIG_KEY,
  buildSystemPromptSection,
  buildTaskPromptFacts,
  collectPromptVariables,
  extractTaskPrompt,
  interpolatePromptTemplate,
  normalizePromptInjection,
  parsePromptSections,
  readProjectPrompt,
  readPromptInjectionToggles,
  writeProjectPrompt,
  writePromptInjectionToggles,
} from './prompt-shared';
import {
  BUILTIN_PROMPT_TEMPLATES,
  SYSTEM_PROMPT_TEMPLATES,
} from './prompt-templates';

/** appConfig 桩：行存内存 Map，覆盖读/写/删全路径；promptTemplate/execution 附带内存桩 */
function makePrisma(
  initial: Array<{
    scope: string;
    key: string;
    projectId?: string | null;
    value: unknown;
    id?: string;
  }> = [],
) {
  let seq = 0;
  const rows = initial.map((r, i) => ({ id: r.id ?? `row-${i}`, ...r }));
  const calls = {
    update: [] as unknown[],
    create: [] as unknown[],
    delete: [] as string[],
  };
  const templates: Array<Record<string, unknown>> = [];
  const executions: Array<{ input: unknown }> = [];
  return {
    calls,
    appConfig: {
      findFirst: async (args: {
        where: { scope: string; key: string; projectId?: string };
      }) => {
        const w = args.where;
        return (
          rows.find(
            (r) =>
              r.scope === w.scope &&
              r.key === w.key &&
              (w.projectId === undefined || r.projectId === w.projectId),
          ) ?? null
        );
      },
      update: async (args: {
        where: { id: string };
        data: { value: unknown };
      }) => {
        calls.update.push(args.data.value);
        const row = rows.find((r) => r.id === args.where.id);
        if (row) row.value = args.data.value;
        return row;
      },
      create: async (args: {
        data: {
          scope: string;
          key: string;
          projectId?: string;
          value: unknown;
        };
      }) => {
        calls.create.push(args.data);
        const row = { id: `row-new-${seq++}`, ...args.data };
        rows.push(row);
        return row;
      },
      delete: async (args: { where: { id: string } }) => {
        calls.delete.push(args.where.id);
        const idx = rows.findIndex((r) => r.id === args.where.id);
        if (idx >= 0) rows.splice(idx, 1);
        return null;
      },
    },
    promptTemplate: {
      findMany: async (args?: { where?: Record<string, unknown> }) => {
        let result = [...templates];
        const w = args?.where ?? {};
        if (typeof w.target === 'string') {
          result = result.filter((t) => t.target === w.target);
        }
        if (typeof w.scope === 'string') {
          result = result.filter(
            (t) =>
              t.scope === w.scope &&
              (w.projectId === undefined || t.projectId === w.projectId),
          );
        }
        return result;
      },
      findUnique: async (args: { where: { id: string } }) =>
        templates.find((t) => t.id === args.where.id) ?? null,
      create: async (args: { data: Record<string, unknown> }) => {
        const row = {
          id: `tpl-${seq++}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          ...args.data,
        };
        templates.push(row);
        return row;
      },
      update: async (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = templates.find((t) => t.id === args.where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, args.data);
        return row;
      },
      delete: async (args: { where: { id: string } }) => {
        const idx = templates.findIndex((t) => t.id === args.where.id);
        if (idx >= 0) templates.splice(idx, 1);
        return null;
      },
    },
    issue: {
      findUnique: async (args: { where: { id: string } }) =>
        ([
          {
            id: 'issue-1',
            title: '修复登录超时',
            description: '会话 30 分钟无操作被踢出',
            type: 'bug',
            priority: 'high',
            status: 'todo',
            project: { name: 'APM', projectCode: 'APM' },
          },
        ].find((i) => i.id === args.where.id) as unknown) ?? null,
    },
    acceptanceCriteria: {
      findMany: async () => [
        { content: '登录态 24 小时内有效' },
        { content: '回归用例锁定缺陷' },
      ],
    },
    execution: {
      findMany: async () => executions,
    },
    rows,
    templates,
    executions,
  };
}

/** AGENTS.md 物化服务桩（读写路径在独立 spec 覆盖，此处只断言接线） */
function makeAgentsSync() {
  return {
    readBlock: async () => ({ fileExists: false, blockContent: null }),
    materialize: async () => ({ synced: true, reason: null, root: null }),
  };
}

describe('prompt-templates（CAP-A-24 系统提示词内置资产）', () => {
  it('内置模板非空且键唯一，正文带一级标题', () => {
    const keys = SYSTEM_PROMPT_TEMPLATES.map((t) => t.key);
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of SYSTEM_PROMPT_TEMPLATES) {
      expect(t.content.trim().startsWith('# ')).toBe(true);
      expect(t.content.length).toBeGreaterThan(0);
    }
  });

  it('buildSystemPromptSection 按序拼接全部模板；无内容返回 null', () => {
    const section = buildSystemPromptSection();
    expect(section).toContain('# APM 协作基线');
    expect(section).toContain('# 执行结果汇报规范');
    expect(buildSystemPromptSection([])).toBeNull();
  });

  it('内置提示词模板（增强 A）：target 全为 task 且正文含变量或为纯模板', () => {
    expect(BUILTIN_PROMPT_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const t of BUILTIN_PROMPT_TEMPLATES) {
      expect(t.key.startsWith('builtin:')).toBe(true);
      expect(t.target).toBe('task');
      expect(t.body.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('prompt-shared（注入开关与项目/任务级提示词）', () => {
  it('normalizePromptInjection：空值回落默认全开，部分键合并，非布尔忽略', () => {
    expect(normalizePromptInjection(null)).toEqual(DEFAULT_PROMPT_INJECTION);
    expect(
      normalizePromptInjection({ system: false, bogus: 'x', skills: 'no' }),
    ).toEqual({
      ...DEFAULT_PROMPT_INJECTION,
      system: false,
    });
  });

  it('normalizePromptInjection（增强 C）：旧 8 键配置映射 executor（任一关则关）', () => {
    expect(normalizePromptInjection({ role: false, member: true })).toEqual({
      ...DEFAULT_PROMPT_INJECTION,
      executor: false,
    });
    expect(normalizePromptInjection({ role: true, member: false })).toEqual({
      ...DEFAULT_PROMPT_INJECTION,
      executor: false,
    });
    expect(normalizePromptInjection({ role: true, member: true })).toEqual(
      DEFAULT_PROMPT_INJECTION,
    );
    // 新键显式配置优先于旧键
    expect(
      normalizePromptInjection({ executor: true, role: false, member: false }),
    ).toEqual(DEFAULT_PROMPT_INJECTION);
  });

  it('readPromptInjectionToggles：无行默认全开；读失败 fail-open 不抛', async () => {
    const empty = makePrisma();
    expect(await readPromptInjectionToggles(empty as never)).toEqual(
      DEFAULT_PROMPT_INJECTION,
    );

    const broken = {
      appConfig: {
        findFirst: async () => {
          throw new Error('db down');
        },
      },
    };
    expect(await readPromptInjectionToggles(broken as never)).toEqual(
      DEFAULT_PROMPT_INJECTION,
    );
  });

  it('writePromptInjectionToggles：读-改-写合并落行；无行时 create', async () => {
    const db = makePrisma([
      {
        scope: 'workspace',
        key: PROMPT_INJECTION_CONFIG_KEY,
        value: { system: false },
      },
    ]);
    const next = await writePromptInjectionToggles(db as never, {
      skills: false,
    });
    expect(next).toEqual({
      ...DEFAULT_PROMPT_INJECTION,
      system: false,
      skills: false,
    });
    expect(db.calls.update.length).toBe(1);

    const fresh = makePrisma();
    await writePromptInjectionToggles(fresh as never, { system: false });
    expect(fresh.calls.create.length).toBe(1);
  });

  it('readProjectPrompt：无配置/空串返回 null，有配置返回全文；读失败 null', async () => {
    const db = makePrisma([
      {
        scope: 'project',
        projectId: 'p1',
        key: PROJECT_PROMPT_CONFIG_KEY,
        value: '项目约定',
      },
      {
        scope: 'project',
        projectId: 'p2',
        key: PROJECT_PROMPT_CONFIG_KEY,
        value: '   ',
      },
    ]);
    expect(await readProjectPrompt(db as never, 'p1')).toBe('项目约定');
    expect(await readProjectPrompt(db as never, 'p2')).toBeNull();
    expect(await readProjectPrompt(db as never, 'p3')).toBeNull();

    const broken = {
      appConfig: {
        findFirst: async () => {
          throw new Error('db down');
        },
      },
    };
    expect(await readProjectPrompt(broken as never, 'p1')).toBeNull();
  });

  it('writeProjectPrompt：写入/更新/空串清空（删行）三路径', async () => {
    const db = makePrisma();
    expect(await writeProjectPrompt(db as never, 'p1', '第一版')).toBe(
      '第一版',
    );
    expect(await writeProjectPrompt(db as never, 'p1', '第二版')).toBe(
      '第二版',
    );
    expect(db.rows.find((r) => r.projectId === 'p1')?.value).toBe('第二版');
    expect(await writeProjectPrompt(db as never, 'p1', '   ')).toBeNull();
    expect(db.calls.delete.length).toBe(1);
    expect(db.rows.find((r) => r.projectId === 'p1')).toBeUndefined();
  });

  it('extractTaskPrompt：metadata.taskPrompt 非字符串/缺失返回 null', () => {
    expect(extractTaskPrompt({ taskPrompt: '要求' })).toBe('要求');
    expect(extractTaskPrompt({ taskPrompt: 42 })).toBeNull();
    expect(extractTaskPrompt(null)).toBeNull();
    expect(extractTaskPrompt('string')).toBeNull();
  });
});

describe('prompt-shared（增强 A 插值引擎）', () => {
  it('collectPromptVariables：提取去重保序；无变量返回空', () => {
    expect(
      collectPromptVariables(
        '修复 {{issue.title}}，标准：{{issue.acceptanceItems}}，再次 {{issue.title}}，今天是 {{today}}',
      ),
    ).toEqual(['issue.title', 'issue.acceptanceItems', 'today']);
    expect(collectPromptVariables('无变量正文')).toEqual([]);
  });

  it('interpolatePromptTemplate：已知变量替换、未知保留占位并记录、多行事实保形', () => {
    const { text, missingVars } = interpolatePromptTemplate(
      '处理 {{issue.title}}（{{issue.priority}}），标准：\n{{issue.acceptanceItems}}\n负责人 {{member.name}}',
      buildTaskPromptFacts({
        issue: {
          title: '修复登录超时',
          priority: 'high',
          acceptanceItems: ['登录态 24h 有效', '回归用例锁定'],
        },
      }),
    );
    expect(text).toContain('处理 修复登录超时（high）');
    expect(text).toContain('1. 登录态 24h 有效');
    expect(text).toContain('2. 回归用例锁定');
    expect(text).toContain('{{member.name}}');
    expect(missingVars).toEqual(['member.name']);
  });

  it('interpolatePromptTemplate：无变量正文零变化', () => {
    const body = '# 保持原样\n- 条目一\n- 条目二';
    expect(interpolatePromptTemplate(body, {}).text).toBe(body);
    expect(interpolatePromptTemplate(body, {}).missingVars).toEqual([]);
  });
});

describe('prompt-shared（增强 C 注入率段解析）', () => {
  it('parsePromptSections：按 marker 切片统计字符；缺失段不出现', () => {
    const sections = parsePromptSections(
      '# APM 协作基线\n规范内容\n\n## Your Role\n执行者约定\n\n## Project Instructions\n项目约定\n\n# Task\n标题',
    );
    expect(Object.keys(sections)).toEqual([
      'system',
      'executor',
      'project',
      'taskBody',
    ]);
    expect(sections.system).toBeGreaterThan(0);
    expect(sections.executor).toBeGreaterThan(0);
    expect(sections.project).toBeGreaterThan(0);
    expect(sections.taskBody).toBeGreaterThan(0);
    expect(sections.team).toBeUndefined();
    expect(parsePromptSections('任意无 marker 文本')).toEqual({});
  });
});

describe('PromptService（REST 面）', () => {
  it('listSystemPrompts 返回只读元数据（不含正文）', () => {
    const service = new PromptService(
      makePrisma() as never,
      makeAgentsSync() as never,
    );
    const items = service.listSystemPrompts();
    expect(items.length).toBe(SYSTEM_PROMPT_TEMPLATES.length);
    for (const item of items) {
      expect(item).not.toHaveProperty('content');
      expect(item.charCount).toBeGreaterThan(0);
    }
  });

  it('getSystemPrompt：已知键返回全文，未知键 404', () => {
    const service = new PromptService(
      makePrisma() as never,
      makeAgentsSync() as never,
    );
    const detail = service.getSystemPrompt(SYSTEM_PROMPT_TEMPLATES[0].key);
    expect(detail.content).toBe(SYSTEM_PROMPT_TEMPLATES[0].content);
    expect(() => service.getSystemPrompt('no-such-key')).toThrow(
      NotFoundException,
    );
  });

  it('getConfig：开关 + 项目提示词 + AGENTS.md 状态（无 projectId 时后两者为 null）', async () => {
    const db = makePrisma([
      {
        scope: 'project',
        projectId: 'p1',
        key: PROJECT_PROMPT_CONFIG_KEY,
        value: '项目约定',
      },
    ]);
    const agentsSync = makeAgentsSync();
    const service = new PromptService(db as never, agentsSync as never);
    const withProject = await service.getConfig('p1');
    expect(withProject.toggles).toEqual(DEFAULT_PROMPT_INJECTION);
    expect(withProject.projectPrompt).toBe('项目约定');
    expect(withProject.agentsFile).toEqual({
      fileExists: false,
      blockContent: null,
      drifted: false,
    });

    const withoutProject = await service.getConfig();
    expect(withoutProject.projectPrompt).toBeNull();
    expect(withoutProject.agentsFile).toBeNull();
  });

  it('getConfig（增强 D）：文件侧内容与配置不一致时 drifted=true', async () => {
    const db = makePrisma([
      {
        scope: 'project',
        projectId: 'p1',
        key: PROJECT_PROMPT_CONFIG_KEY,
        value: 'APM 侧约定',
      },
    ]);
    const agentsSync = {
      readBlock: async () => ({
        fileExists: true,
        blockContent: '文件侧被外部改过',
      }),
      materialize: async () => ({ synced: true, reason: null, root: null }),
    };
    const service = new PromptService(db as never, agentsSync as never);
    const result = await service.getConfig('p1');
    expect(result.agentsFile?.drifted).toBe(true);
  });

  it('updateConfig：开关部分更新 + 项目提示词保存并触发 AGENTS.md 物化', async () => {
    const db = makePrisma();
    const agentsSync = makeAgentsSync();
    const service = new PromptService(db as never, agentsSync as never);
    const result = await service.updateConfig({
      toggles: { system: false },
      projectId: 'p1',
      projectPrompt: '项目约定',
    });
    expect(result.toggles.system).toBe(false);
    expect(result.toggles.context).toBe(true);
    expect(result.projectPrompt).toBe('项目约定');
    expect(result.agentsSync).toEqual({ synced: true, reason: null });
  });

  it('updateConfig（增强 D）：物化失败降级为未同步，不阻断保存', async () => {
    const db = makePrisma();
    const agentsSync = {
      readBlock: async () => ({ fileExists: false, blockContent: null }),
      materialize: async () => ({
        synced: false,
        reason: '项目未绑定本地工作区',
        root: null,
      }),
    };
    const service = new PromptService(db as never, agentsSync as never);
    const result = await service.updateConfig({
      projectId: 'p1',
      projectPrompt: '只有 APM 侧',
    });
    expect(result.projectPrompt).toBe('只有 APM 侧');
    expect(result.agentsSync).toEqual({
      synced: false,
      reason: '项目未绑定本地工作区',
    });
  });
});

describe('PromptService（增强 A 模板库）', () => {
  it('listTemplates：内置在前 + 自定义合并；target 过滤；变量清单提取', async () => {
    const db = makePrisma();
    await db.promptTemplate.create({
      data: {
        name: '团队定制',
        description: '',
        target: 'task',
        scope: 'workspace',
        projectId: null,
        body: '按 {{issue.title}} 执行',
      },
    });
    await db.promptTemplate.create({
      data: {
        name: '项目专属',
        description: '',
        target: 'project',
        scope: 'project',
        projectId: 'p1',
        body: '项目约定',
      },
    });
    const service = new PromptService(db as never, makeAgentsSync() as never);

    const all = await service.listTemplates();
    expect(all[0].builtIn).toBe(true);
    expect(all.filter((t) => !t.builtIn).length).toBe(2);

    const taskOnly = await service.listTemplates('task');
    expect(taskOnly.every((t) => t.target === 'task')).toBe(true);
    expect(taskOnly.some((t) => t.name === '团队定制')).toBe(true);
    const custom = taskOnly.find((t) => t.name === '团队定制');
    expect(custom?.variables).toEqual(['issue.title']);
  });

  it('模板 CRUD：创建/更新/删除全链；删除不存在的 id 404', async () => {
    const db = makePrisma();
    const service = new PromptService(db as never, makeAgentsSync() as never);
    const created = await service.createTemplate({
      name: '发版检查',
      description: '发版前逐项核对',
      target: 'task',
      scope: 'workspace',
      body: '核对 {{issue.acceptanceItems}}',
    });
    expect(created.id).toBeTruthy();
    expect(created.variables).toEqual(['issue.acceptanceItems']);

    const updated = await service.updateTemplate(created.id, {
      name: '发版检查单',
    });
    expect(updated.name).toBe('发版检查单');

    await service.deleteTemplate(created.id);
    expect(db.templates.length).toBe(0);
    await expect(service.deleteTemplate('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('previewTemplate：按任务事实插值，缺失变量如实透出', async () => {
    const db = makePrisma();
    const service = new PromptService(db as never, makeAgentsSync() as never);
    const result = await service.previewTemplate({
      body: '处理 {{issue.title}}，标准：\n{{issue.acceptanceItems}}\n负责人：{{member.name}}',
      issueId: 'issue-1',
    });
    expect(result.text).toContain('处理 修复登录超时');
    expect(result.text).toContain('1. 登录态 24 小时内有效');
    expect(result.text).toContain('{{member.name}}');
    expect(result.missingVars).toEqual(['member.name']);
  });
});

describe('PromptService（增强 C 注入率统计）', () => {
  it('getUsageStats：按段头解析注入率与平均字符；空样本诚实空态', async () => {
    const db = makePrisma();
    db.executions.push(
      {
        input: {
          prompt:
            '## Your Role\nabc\n\n## Project Instructions\nabcd\n\n# Task\nx',
        },
      },
      { input: { prompt: '## Your Role\nabcdef\n\n# Task\nx' } },
      { input: { prompt: null } },
      { input: 'not-an-object' },
    );
    const service = new PromptService(db as never, makeAgentsSync() as never);
    const stats = await service.getUsageStats(50);
    expect(stats.promptCount).toBe(2);
    expect(stats.avgPromptChars).toBeGreaterThan(0);
    const executor = stats.sections.find((s) => s.key === 'executor');
    expect(executor?.count).toBe(2);
    expect(executor?.ratio).toBe(1);
    const project = stats.sections.find((s) => s.key === 'project');
    expect(project?.count).toBe(1);
    expect(project?.ratio).toBe(0.5);

    const empty = makePrisma();
    const emptyStats = await new PromptService(
      empty as never,
      makeAgentsSync() as never,
    ).getUsageStats(50);
    expect(emptyStats.promptCount).toBe(0);
    expect(emptyStats.sections.length).toBeGreaterThan(0);
    for (const section of emptyStats.sections) {
      expect(section.count).toBe(0);
    }
  });
});

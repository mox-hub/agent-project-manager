import { NotFoundException } from '@nestjs/common';
import { PromptService } from './prompt.service';
import {
  DEFAULT_PROMPT_INJECTION,
  PROMPT_INJECTION_CONFIG_KEY,
  PROJECT_PROMPT_CONFIG_KEY,
  buildSystemPromptSection,
  extractTaskPrompt,
  normalizePromptInjection,
  readProjectPrompt,
  readPromptInjectionToggles,
  writeProjectPrompt,
  writePromptInjectionToggles,
} from './prompt-shared';
import { SYSTEM_PROMPT_TEMPLATES } from './prompt-templates';

/** appConfig 桩：行存内存 Map，覆盖读/写/删全路径 */
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
    rows,
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
});

describe('prompt-shared（注入开关与项目/任务级提示词）', () => {
  it('normalizePromptInjection：空值回落默认全开，部分键合并，非布尔忽略', () => {
    expect(normalizePromptInjection(null)).toEqual(DEFAULT_PROMPT_INJECTION);
    expect(
      normalizePromptInjection({ system: false, bogus: 'x', role: 'no' }),
    ).toEqual({
      ...DEFAULT_PROMPT_INJECTION,
      system: false,
    });
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

describe('PromptService（REST 面）', () => {
  it('listSystemPrompts 返回只读元数据（不含正文）', () => {
    const service = new PromptService(makePrisma() as never);
    const items = service.listSystemPrompts();
    expect(items.length).toBe(SYSTEM_PROMPT_TEMPLATES.length);
    for (const item of items) {
      expect(item).not.toHaveProperty('content');
      expect(item.charCount).toBeGreaterThan(0);
    }
  });

  it('getSystemPrompt：已知键返回全文，未知键 404', () => {
    const service = new PromptService(makePrisma() as never);
    const detail = service.getSystemPrompt(SYSTEM_PROMPT_TEMPLATES[0].key);
    expect(detail.content).toBe(SYSTEM_PROMPT_TEMPLATES[0].content);
    expect(() => service.getSystemPrompt('no-such-key')).toThrow(
      NotFoundException,
    );
  });

  it('getConfig：开关 + 项目提示词（无 projectId 时项目提示词为 null）', async () => {
    const db = makePrisma([
      {
        scope: 'project',
        projectId: 'p1',
        key: PROJECT_PROMPT_CONFIG_KEY,
        value: '项目约定',
      },
    ]);
    const service = new PromptService(db as never);
    const withProject = await service.getConfig('p1');
    expect(withProject.toggles).toEqual(DEFAULT_PROMPT_INJECTION);
    expect(withProject.projectPrompt).toBe('项目约定');

    const withoutProject = await service.getConfig();
    expect(withoutProject.projectPrompt).toBeNull();
  });

  it('updateConfig：开关部分更新 + 项目提示词一并保存', async () => {
    const db = makePrisma();
    const service = new PromptService(db as never);
    const result = await service.updateConfig({
      toggles: { system: false },
      projectId: 'p1',
      projectPrompt: '项目约定',
    });
    expect(result.toggles.system).toBe(false);
    expect(result.toggles.context).toBe(true);
    expect(result.projectPrompt).toBe('项目约定');
  });
});

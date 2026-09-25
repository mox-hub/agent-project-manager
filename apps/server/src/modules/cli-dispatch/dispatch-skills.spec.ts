import { Logger } from '@nestjs/common';
import { vi } from 'vitest';
import { CliDispatchService } from './dispatch.service';

/**
 * P2-23 技能注入派发 prompt 的单元测试：
 * 有/无技能两态、项目开关、token 预算截断、数据源失败诚实降级。
 * 不改构造器签名（skills 走 prisma.skillConfig 查询），stub prisma 直喂。
 */

type SkillRow = {
  key: string;
  name: string;
  description: string | null;
  content: string | null;
};

function makeService(options: {
  skills?: SkillRow[];
  configValue?: unknown;
  configReadThrows?: boolean;
  skillReadThrows?: boolean;
}) {
  const warnings: string[] = [];
  const service = new CliDispatchService(
    // prisma：只 stub 本路径用到的 appConfig.findFirst / skillConfig.findMany
    {
      appConfig: {
        findFirst: async () => {
          if (options.configReadThrows) throw new Error('config read failed');
          if (options.configValue === undefined) return null;
          return { value: options.configValue };
        },
      },
      skillConfig: {
        findMany: async (): Promise<SkillRow[]> => {
          if (options.skillReadThrows) throw new Error('skill read failed');
          return options.skills ?? [];
        },
      },
    } as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
  // 静音测试输出但保留告警收集
  vi.spyOn(Logger.prototype, 'warn').mockImplementation((msg: string) =>
    warnings.push(String(msg)),
  );
  return { service, warnings };
}

describe('CliDispatchService buildSkillsPromptSection（P2-23 技能注入）', () => {
  it('有启用技能：注入「## Project Skills」段，含名称与内容摘要', async () => {
    const { service } = makeService({
      skills: [
        {
          key: 'code-review',
          name: 'Code Review',
          description: 'Analyze code for quality and bugs',
          content: '审查代码时先看边界条件再看命名。',
        },
      ],
    });
    const section = await (service as any).buildSkillsPromptSection('proj-1');
    expect(section).toContain('## Project Skills');
    expect(section).toContain('### Code Review');
    expect(section).toContain('审查代码时先看边界条件再看命名。');
    expect(section).toContain('以下是已启用的项目技能');
  });

  it('无 content 时回落 description，不注入空正文', async () => {
    const { service } = makeService({
      skills: [
        {
          key: 'doc-gen',
          name: 'Documentation',
          description: 'Generate code documentation',
          content: null,
        },
      ],
    });
    const section = await (service as any).buildSkillsPromptSection('proj-1');
    expect(section).toContain('### Documentation');
    expect(section).toContain('Generate code documentation');
  });

  it('无启用技能：返回 null，不注入空段落', async () => {
    const { service } = makeService({ skills: [] });
    const section = await (service as any).buildSkillsPromptSection('proj-1');
    expect(section).toBeNull();
  });

  it('项目开关关闭（dispatch.skillsEnabled=false）：返回 null', async () => {
    const { service } = makeService({
      skills: [
        {
          key: 'code-review',
          name: 'Code Review',
          description: 'd',
          content: 'c',
        },
      ],
      configValue: false,
    });
    const section = await (service as any).buildSkillsPromptSection('proj-1');
    expect(section).toBeNull();
  });

  it('技能内容超长：按单技能字符上限截断并加省略号', async () => {
    const longContent = 'x'.repeat(3000);
    const { service } = makeService({
      skills: [
        {
          key: 'big',
          name: 'Big Skill',
          description: null,
          content: longContent,
        },
      ],
    });
    const section = await (service as any).buildSkillsPromptSection('proj-1');
    expect(section).toContain('…');
    expect(section).not.toContain(longContent);
  });

  it('技能总量超 token 预算：预算器截断并在段内如实标注', async () => {
    process.env['DISPATCH_SKILLS_BUDGET_TOKENS'] = '20'; // 只够装下一个技能
    process.env['DISPATCH_SKILL_MAX_CHARS'] = '300';
    try {
      const { service } = makeService({
        skills: [
          {
            key: 's1',
            name: 'Skill One',
            description: null,
            content: 'a'.repeat(80),
          },
          {
            key: 's2',
            name: 'Skill Two',
            description: null,
            content: 'b'.repeat(80),
          },
        ],
      });
      const section = await (service as any).buildSkillsPromptSection('proj-1');
      expect(section).toContain('### Skill One');
      expect(section).toContain('已按 token 预算截断');
    } finally {
      delete process.env['DISPATCH_SKILLS_BUDGET_TOKENS'];
      delete process.env['DISPATCH_SKILL_MAX_CHARS'];
    }
  });

  it('技能表读取失败：诚实降级返回 null 并留告警，不炸派发', async () => {
    const { service, warnings } = makeService({ skillReadThrows: true });
    const section = await (service as any).buildSkillsPromptSection('proj-1');
    expect(section).toBeNull();
    expect(
      warnings.some((w: string) => w.includes('Skills section read failed')),
    ).toBe(true);
  });

  it('开关配置读取失败：按缺省开启处理（fail-open，沿用信任门禁口径）', async () => {
    const { service } = makeService({
      skills: [
        {
          key: 'code-review',
          name: 'Code Review',
          description: 'd',
          content: 'c',
        },
      ],
      configReadThrows: true,
    });
    const section = await (service as any).buildSkillsPromptSection('proj-1');
    expect(section).toContain('## Project Skills');
  });
});

describe('CliDispatchService buildPrompt（技能段两态）', () => {
  const task = { title: '实现登录页', description: '按设计稿实现' };

  it('传入技能段：注入在 Task 之前', () => {
    const service = makeService({ skills: [] }).service;
    const prompt = (service as any).buildPrompt(
      task,
      null,
      null,
      null,
      '## Project Skills\n### Code Review\n审查代码。',
    );
    expect(prompt).toContain('## Project Skills');
    expect(prompt).toContain('### Code Review');
    expect(prompt.indexOf('## Project Skills')).toBeLessThan(
      prompt.indexOf('# Task'),
    );
  });

  it('技能段为 null：不含技能标题、无空段落', () => {
    const service = makeService({ skills: [] }).service;
    const prompt = (service as any).buildPrompt(task, null, null, null, null);
    expect(prompt).not.toContain('## Project Skills');
    expect(prompt).toContain('# Task');
  });
});

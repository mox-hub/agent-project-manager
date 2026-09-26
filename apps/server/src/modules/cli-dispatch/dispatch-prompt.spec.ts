import { Logger } from '@nestjs/common';
import { vi } from 'vitest';
import { CliDispatchService } from './dispatch.service';
import {
  DEFAULT_PROMPT_INJECTION,
  type PromptInjectionToggles,
} from '@/modules/prompt/prompt-shared';

describe('CliDispatchService buildPrompt（成员/团队注入）', () => {
  const service = new CliDispatchService(
    undefined as never,
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

  const task = { title: '实现登录页', description: '按设计稿实现' };
  const agentRole = {
    name: 'coder',
    role: 'coder',
    promptHint: '你是编码角色',
  };

  it('基础组装：角色 + 任务 + 上下文', () => {
    const prompt = (service as any).buildPrompt(task, { foo: 1 }, agentRole);
    expect(prompt).toContain('## Your Role\n你是编码角色');
    expect(prompt).toContain('# Task\n实现登录页');
    expect(prompt).toContain('## Context');
  });

  it('注入成员个人提示词与思考强度', () => {
    const prompt = (service as any).buildPrompt(task, null, agentRole, {
      memberName: 'Claude Coder',
      personalPrompt: '偏好简洁实现与充分测试',
      thinkingLevel: 'high',
      teamRules: [],
    });
    expect(prompt).toContain('## Member Instructions (Claude Coder)');
    expect(prompt).toContain('偏好简洁实现与充分测试');
    expect(prompt).toContain('## Reasoning Effort');
    expect(prompt).toContain('high');
  });

  it('注入团队规则（多团队去重拼接）', () => {
    const prompt = (service as any).buildPrompt(task, null, agentRole, {
      memberName: 'A',
      personalPrompt: null,
      thinkingLevel: null,
      teamRules: ['规则一：提交前自测', '规则二：中文注释'],
    });
    expect(prompt).toContain('## Team Rules');
    expect(prompt).toContain('规则一：提交前自测');
    expect(prompt).toContain('规则二：中文注释');
  });

  it('无成员上下文时保持原有格式', () => {
    const withCtx = (service as any).buildPrompt(task, null, agentRole, null);
    expect(withCtx).not.toContain('## Team Rules');
    expect(withCtx).not.toContain('## Member Instructions');
    expect(withCtx).not.toContain('## Reasoning Effort');
  });
});

describe('CliDispatchService buildPrompt（CAP-A-24 提示词治理逐段开关）', () => {
  const service = new CliDispatchService(
    undefined as never,
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

  const task = { title: '实现登录页', description: '按设计稿实现' };
  const agentRole = {
    name: 'coder',
    role: 'coder',
    promptHint: '你是编码角色',
  };
  const memberContext = {
    memberName: 'Claude Coder',
    personalPrompt: '偏好简洁实现',
    thinkingLevel: 'high',
    teamRules: ['提交前自测'],
  };

  const governance = (
    overrides: Partial<PromptInjectionToggles> = {},
    extra: Record<string, unknown> = {},
  ) => ({
    toggles: { ...DEFAULT_PROMPT_INJECTION, ...overrides },
    systemSection: '# APM 协作基线\n不越权、不虚构、可追溯。',
    projectPrompt: '技术栈约定：pnpm + NestJS。',
    taskPrompt: '任务级要求：先写测试再实现。',
    ...extra,
  });

  it('全开：系统段/角色/团队/成员/项目/任务段全部注入', () => {
    const prompt = (service as any).buildPrompt(
      task,
      { foo: 1 },
      agentRole,
      memberContext,
      null,
      governance(),
    );
    expect(prompt).toContain('# APM 协作基线');
    expect(prompt).toContain('## Your Role');
    expect(prompt).toContain('## Team Rules');
    expect(prompt).toContain('## Member Instructions');
    expect(prompt).toContain(
      '## Project Instructions\n技术栈约定：pnpm + NestJS。',
    );
    expect(prompt).toContain(
      '## Task Instructions\n任务级要求：先写测试再实现。',
    );
    expect(prompt).toContain('# Task\n实现登录页');
    expect(prompt).toContain('## Context');
  });

  it('关 system：系统段不注入，其余段不受影响', () => {
    const prompt = (service as any).buildPrompt(
      task,
      null,
      agentRole,
      null,
      null,
      governance({ system: false }),
    );
    expect(prompt).not.toContain('# APM 协作基线');
    expect(prompt).toContain('## Your Role');
    expect(prompt).toContain('## Project Instructions');
  });

  it('关 role / team / member：对应段逐一消失（思考强度随 member 开关）', () => {
    const noRole = (service as any).buildPrompt(
      task,
      null,
      agentRole,
      memberContext,
      null,
      governance({ role: false }),
    );
    expect(noRole).not.toContain('## Your Role');
    expect(noRole).toContain('## Team Rules');

    const noMember = (service as any).buildPrompt(
      task,
      null,
      agentRole,
      memberContext,
      null,
      governance({ member: false }),
    );
    expect(noMember).not.toContain('## Member Instructions');
    expect(noMember).not.toContain('## Reasoning Effort');
    expect(noMember).toContain('## Team Rules');

    const noTeam = (service as any).buildPrompt(
      task,
      null,
      agentRole,
      memberContext,
      null,
      governance({ team: false }),
    );
    expect(noTeam).not.toContain('## Team Rules');
  });

  it('关 task / context：任务级段与上下文段消失，任务本体保留', () => {
    const prompt = (service as any).buildPrompt(
      task,
      { foo: 1 },
      null,
      null,
      null,
      governance({ task: false, context: false }),
    );
    expect(prompt).not.toContain('## Task Instructions');
    expect(prompt).not.toContain('## Context');
    expect(prompt).toContain('# Task\n实现登录页');
    expect(prompt).toContain('## Description\n按设计稿实现');
  });

  it('全关 + 无技能段：回落最小任务提示词（任务标题+描述），派发不失败', () => {
    const allOff = Object.fromEntries(
      Object.keys(DEFAULT_PROMPT_INJECTION).map((k) => [k, false]),
    ) as unknown as PromptInjectionToggles;
    const prompt = (service as any).buildPrompt(
      task,
      { foo: 1 },
      agentRole,
      memberContext,
      null,
      {
        toggles: allOff,
        systemSection: '# APM 协作基线',
        projectPrompt: '项目约定',
        taskPrompt: '任务要求',
      },
    );
    expect(prompt).toContain('# Task\n实现登录页');
    expect(prompt).toContain('## Description\n按设计稿实现');
    expect(prompt).toContain(
      'Please execute this task and report the results.',
    );
    expect(prompt).not.toContain('# APM 协作基线');
    expect(prompt).not.toContain('## Your Role');
    expect(prompt).not.toContain('## Context');
  });

  it('段清单：injected=false 的段保留在清单供预览对照，但不出现在 prompt 中', () => {
    const segments = (service as any).buildPromptSegments(
      task,
      null,
      agentRole,
      null,
      null,
      governance({ system: false }),
    );
    const byKey = Object.fromEntries(
      segments.map((s: { key: string }) => [s.key, s]),
    );
    expect(byKey.system.injected).toBe(false);
    expect(byKey.system.text).toContain('# APM 协作基线');
    expect(byKey.role.injected).toBe(true);
  });

  it('loadPromptGovernance：读取开关与项目/任务级提示词（fail-open 兜底由 prompt-shared 承担）', async () => {
    const warnings: string[] = [];
    vi.spyOn(Logger.prototype, 'warn').mockImplementation((msg: string) =>
      warnings.push(String(msg)),
    );
    const prisma = {
      appConfig: {
        findFirst: async (args: { where: { key: string } }) => {
          if (args.where.key === 'prompt.injection') {
            return { value: { system: false, skills: false } };
          }
          return { value: '项目提示词全文' };
        },
      },
    };
    const service = new CliDispatchService(
      prisma as never,
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
    const gov = await (service as any).loadPromptGovernance('proj-1', {
      taskPrompt: '任务级要求',
    });
    expect(gov.toggles).toEqual({
      ...DEFAULT_PROMPT_INJECTION,
      system: false,
      skills: false,
    });
    expect(gov.projectPrompt).toBe('项目提示词全文');
    expect(gov.taskPrompt).toBe('任务级要求');
    expect(gov.systemSection).toBeTruthy();
  });
});

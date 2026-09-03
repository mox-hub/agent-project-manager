import { CliDispatchService } from './dispatch.service';

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

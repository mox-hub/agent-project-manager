/**
 * CLI 适配器纯函数行为锁：prompt 传递契约（stdinData / positional）与流事件解析
 */
import { describe, expect, it, vi } from 'vitest';
import { ClaudeCodeAdapter } from './claude-code';
import { CodexAdapter } from './codex';
import { ZCodeAdapter } from './zcode';
import type { CliExecutionInput, StreamEmitter } from './interface';

const input = (prompt = '你好'): CliExecutionInput => ({
  workspaceRoot: '/ws',
  prompt,
});

function makeEmit() {
  const token = vi.fn();
  const step = vi.fn();
  const approvalNeeded = vi.fn();
  const usage = vi.fn();
  const emit: StreamEmitter = { token, step, approvalNeeded, usage };
  return { emit, token, step, approvalNeeded, usage };
}

describe('ClaudeCodeAdapter', () => {
  it('buildCommand 经 stdinData 注入 NDJSON user message', () => {
    const built = new ClaudeCodeAdapter().buildCommand(input('实现登录页'));
    expect(built.cmd).toBe('claude');
    expect(built.args).toContain('--input-format');
    const payload = JSON.parse(built.stdinData!) as {
      type: string;
      message: { role: string; content: string };
    };
    expect(payload.type).toBe('user');
    expect(payload.message.content).toBe('实现登录页');
  });

  it('parseStream：assistant 文本、顶层 tool_use、error、pending 审批', () => {
    const a = new ClaudeCodeAdapter();
    const { emit, token, step, approvalNeeded } = makeEmit();

    a.parseStream(
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'hi' }] },
      }),
      emit,
    );
    expect(token).toHaveBeenCalledWith('hi');

    a.parseStream(
      JSON.stringify({ type: 'tool_use', tool: { name: 'Bash', input: {} } }),
      emit,
    );
    expect(step).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'tool_call', name: 'Bash' }),
    );

    a.parseStream(JSON.stringify({ type: 'error', error: 'boom' }), emit);
    expect(step).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'error' }),
    );

    a.parseStream(
      JSON.stringify({ type: 'pending', approval_required: { action: 'rm' } }),
      emit,
    );
    expect(approvalNeeded).toHaveBeenCalledWith(
      expect.objectContaining({ requestedAction: 'rm' }),
    );
  });

  it('parseStream：真实 stream-json——assistant 内 thinking/tool_use 块与 usage', () => {
    const a = new ClaudeCodeAdapter();
    const { emit, step, usage } = makeEmit();

    a.parseStream(
      JSON.stringify({
        type: 'system',
        subtype: 'init',
        model: 'claude-sonnet',
        cwd: '/ws',
        session_id: 's1',
      }),
      emit,
    );
    expect(step).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'observation', name: 'session_init' }),
    );

    a.parseStream(
      JSON.stringify({
        type: 'assistant',
        message: {
          usage: { input_tokens: 100, output_tokens: 50 },
          content: [
            { type: 'thinking', thinking: '先看目录' },
            { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } },
            { type: 'text', text: '马上执行' },
          ],
        },
      }),
      emit,
    );
    expect(step).toHaveBeenCalledWith(
      expect.objectContaining({ stepType: 'thinking', output: { thinking: '先看目录' } }),
    );
    expect(step).toHaveBeenCalledWith(
      expect.objectContaining({
        stepType: 'tool_call',
        name: 'Bash',
        input: { tool: 'Bash', command: 'ls' },
        status: 'running',
      }),
    );
    expect(usage).toHaveBeenCalledWith(
      expect.objectContaining({ promptTokens: 100, completionTokens: 50 }),
    );
  });

  it('parseStream：user 消息内 tool_result → observation（is_error 标 failed）', () => {
    const a = new ClaudeCodeAdapter();
    const { emit, step } = makeEmit();

    a.parseStream(
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 't1', content: 'file list' }],
        },
      }),
      emit,
    );
    expect(step).toHaveBeenCalledWith(
      expect.objectContaining({
        stepType: 'observation',
        name: 't1',
        output: { content: 'file list' },
        status: 'completed',
      }),
    );

    a.parseStream(
      JSON.stringify({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 't2', content: 'boom', is_error: true },
          ],
        },
      }),
      emit,
    );
    expect(step).toHaveBeenCalledWith(
      expect.objectContaining({ name: 't2', status: 'failed' }),
    );
  });

  it('parseStream：result 终事件提取 usage（含顶层 total_cost_usd）', () => {
    const a = new ClaudeCodeAdapter();
    const { emit, usage } = makeEmit();

    a.parseStream(
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'done',
        usage: { input_tokens: 1200, output_tokens: 300 },
        total_cost_usd: 0.42,
      }),
      emit,
    );
    expect(usage).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTokens: 1200,
        completionTokens: 300,
        totalTokens: 1500,
        costUsd: 0.42,
      }),
    );
  });

  it('parseFinalResult：result 行提取 usage 与最终文本', () => {
    const a = new ClaudeCodeAdapter();
    const stdout = JSON.stringify({
      type: 'result',
      subtype: 'success',
      result: '任务完成',
      usage: { input_tokens: 100, output_tokens: 20 },
      total_cost_usd: 0.1,
    });
    const res = a.parseFinalResult(stdout, 0);
    expect(res.status).toBe('completed');
    expect(res.usage?.totalTokens).toBe(120);
    expect(res.usage?.costUsd).toBe(0.1);
    expect(res.artifacts).toContainEqual(
      expect.objectContaining({ name: 'execution_summary', content: '任务完成' }),
    );
  });

  it('parseFinalResult：非零退出码返回 failed', () => {
    const res = new ClaudeCodeAdapter().parseFinalResult('garbage', 1);
    expect(res.status).toBe('failed');
    expect(res.error).toContain('exited with code 1');
  });
});

describe('CodexAdapter', () => {
  it('buildCommand 以 positional arg 传递 prompt（不经 stdin）', () => {
    const built = new CodexAdapter().buildCommand(input('写个爬虫'));
    expect(built.cmd).toBe('codex');
    expect(built.args[built.args.length - 1]).toBe('写个爬虫');
    expect(built.stdinData).toBeUndefined();
  });

  it('parseStream：text_delta token、approval_required 审批', () => {
    const a = new CodexAdapter();
    const { emit, token, approvalNeeded } = makeEmit();

    a.parseStream(
      JSON.stringify({ type: 'text_delta', content: 'ok' }),
      emit,
    );
    expect(token).toHaveBeenCalledWith('ok');

    a.parseStream(
      JSON.stringify({
        type: 'approval_required',
        action: 'npm install',
        risk_level: 'write',
      }),
      emit,
    );
    expect(approvalNeeded).toHaveBeenCalledWith(
      expect.objectContaining({ requestedAction: 'npm install', riskLevel: 'write' }),
    );
  });

  it('parseFinalResult：退出码决定 completed/failed', () => {
    const a = new CodexAdapter();
    expect(a.parseFinalResult('', 0).status).toBe('completed');
    expect(a.parseFinalResult('', 2).status).toBe('failed');
  });
});

describe('ZCodeAdapter（骨架行为锁）', () => {
  it('buildCommand 基础参数；parseStream assistant → token', () => {
    const a = new ZCodeAdapter();
    const built = a.buildCommand(input());
    expect(built.cmd).toBe('zcode');
    expect(built.args).toContain('--no-interactive');

    const { emit, token } = makeEmit();
    a.parseStream(JSON.stringify({ type: 'assistant', content: 'z' }), emit);
    expect(token).toHaveBeenCalledWith('z');
  });
});

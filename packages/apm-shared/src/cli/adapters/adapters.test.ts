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
  const emit: StreamEmitter = { token, step, approvalNeeded };
  return { emit, token, step, approvalNeeded };
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

  it('parseStream：assistant 文本、tool_use、error、pending 审批', () => {
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

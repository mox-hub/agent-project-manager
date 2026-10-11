/**
 * argv 通道 prompt 上限预检单测（2026-10-11 扩容批一已知边界的派发侧守门）：
 * 七家 argv provider 超限结构化 400 + 指引文案；claude-code/zcode 免疫；
 * 限内放行。
 */
import { BadRequestException } from '@nestjs/common';
import {
  ARGV_PROMPT_CHAR_LIMIT,
  ARGV_PROMPT_PROVIDER_IDS,
  assertPromptFitsArgvChannel,
} from './dispatch.service';

describe('assertPromptFitsArgvChannel（Windows argv 上限预检）', () => {
  it('argv 通道七家在册：codex/opencode/cursor-agent/gemini-cli/qwen-code/codebuddy/grok', () => {
    expect([...ARGV_PROMPT_PROVIDER_IDS].sort()).toEqual(
      [
        'codex',
        'opencode',
        'cursor-agent',
        'gemini-cli',
        'qwen-code',
        'codebuddy',
        'grok',
      ].sort(),
    );
  });

  it('argv 通道超限 → 400 且报错含长度/上限/换 provider 指引', () => {
    const long = 'x'.repeat(ARGV_PROMPT_CHAR_LIMIT + 1);
    expect(() => assertPromptFitsArgvChannel('gemini-cli', long)).toThrow(
      BadRequestException,
    );
    try {
      assertPromptFitsArgvChannel('gemini-cli', long);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain(String(long.length));
      expect(msg).toContain('claude-code');
    }
  });

  it('claude-code（stdin）与 zcode（node 直启）免疫：超限也不拦', () => {
    const long = 'x'.repeat(ARGV_PROMPT_CHAR_LIMIT * 3);
    expect(() =>
      assertPromptFitsArgvChannel('claude-code', long),
    ).not.toThrow();
    expect(() => assertPromptFitsArgvChannel('zcode', long)).not.toThrow();
  });

  it('限内放行：argv 家长度恰在上限内不拦', () => {
    expect(() =>
      assertPromptFitsArgvChannel(
        'qwen-code',
        'x'.repeat(ARGV_PROMPT_CHAR_LIMIT),
      ),
    ).not.toThrow();
  });
});

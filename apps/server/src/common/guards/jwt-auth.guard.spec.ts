import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * 回归：全局 JwtAuthGuard 经 APP_GUARD 对 ws 上下文的 @SubscribeMessage
 * 处理器同样触发——旧逻辑把 switchToHttp().getRequest()（Socket 对象，无
 * headers）递给 passport-jwt，读 authorization 抛 TypeError（守护进程每次
 * runtime:heartbeat 心跳必炸一次，2026-09-12 经桌面日志面板实机暴露）。
 * 修法：非 http 上下文直接放行（EventsGateway 连接验 JWT / RuntimeGateway
 * 连接验 session，网关连接层即认证边界）；http 路径行为必须原样不变。
 */

// 父类 canActivate 来自 @nestjs/passport 的运行时 mixin 类，沿原型链取到；
// ws 路径断言不碰它，http 路径断言仍走它（passport 路径未被误伤）
const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
  canActivate: (...args: unknown[]) => unknown;
};
const superCanActivate = vi.spyOn(parentProto, 'canActivate');

const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
const configService = { nodeEnv: 'production' };
const accessTokenService = { validate: vi.fn() };
const guard = new JwtAuthGuard(
  reflector as never,
  configService as never,
  accessTokenService as never,
);

function ctx(type: 'http' | 'ws', request?: unknown): ExecutionContext {
  return {
    getType: () => type,
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

beforeEach(() => {
  superCanActivate.mockReset().mockReturnValue('SUPER');
  accessTokenService.validate.mockReset();
});

describe('JwtAuthGuard · ws 上下文短路（心跳 TypeError 回归）', () => {
  it('ws 上下文直接放行且不进 passport', () => {
    // Socket 形态的 request：没有 headers，旧逻辑在此崩溃
    const result = guard.canActivate(ctx('ws', { conn: 'socket-like' }));

    expect(result).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
    expect(accessTokenService.validate).not.toHaveBeenCalled();
  });

  it('http + PAT token 仍走 AccessTokenService 校验', async () => {
    const principal = { id: 'pat-1', kind: 'access_token' };
    accessTokenService.validate.mockResolvedValue(principal);
    const request = {
      headers: { authorization: `Bearer apm_pat_abc123` },
    };

    const result = await guard.canActivate(ctx('http', request));

    expect(result).toBe(true);
    expect(accessTokenService.validate).toHaveBeenCalledWith('apm_pat_abc123');
    expect(request.user).toEqual(principal);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('http 无 token 生产环境仍进 super（passport 路径行为不变）', () => {
    const context = ctx('http', { headers: {} });

    const result = guard.canActivate(context);

    expect(result).toBe('SUPER');
    expect(superCanActivate).toHaveBeenCalledWith(context);
  });
});

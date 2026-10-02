import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom rate limit guard that provides better error messages
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected errorMessage = 'Too many requests';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // APP_GUARD 全局守卫对 WS @SubscribeMessage 同样生效（与 JwtAuthGuard 同坑）：
    // throttler 的 handleRequest 在 WS 上下文取到的是 socket，调 res.header()
    // 直接 TypeError（登录后 Events/Runtime 网关每条消息炸一次）。WS 消息不限流，
    // 非 http 上下文直接放行，HTTP 路径行为不变。
    if (context.getType() !== 'http') {
      return true;
    }
    return super.canActivate(context);
  }
}

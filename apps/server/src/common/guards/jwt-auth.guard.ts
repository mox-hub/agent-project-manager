import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ConfigService } from '@/core/config/config.service';
import {
  AccessTokenService,
  ACCESS_TOKEN_PREFIX,
} from '@/modules/auth/access-token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(AccessTokenService) private accessTokenService: AccessTokenService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // WebSocket 上下文（网关 @SubscribeMessage）：switchToHttp().getRequest()
    // 是 Socket 对象、没有 headers，递给 passport-jwt 读 authorization 直接
    // TypeError（守护进程每次 runtime:heartbeat 心跳都会炸一次）。两个网关
    // 均在连接层自验（EventsGateway 验 JWT / RuntimeGateway 验 session），
    // 非 http 上下文直接放行。
    if (context.getType() !== 'http') {
      return true;
    }

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request?.headers?.authorization as string | undefined;
    const hasToken = Boolean(authorization);

    // 访问 token（PAT）：apm_pat_ 前缀走 AccessTokenService 校验，
    // principal 形态与 validateJwtPayload 一致（sessionId: null）
    if (authorization?.startsWith(`Bearer ${ACCESS_TOKEN_PREFIX}`)) {
      return this.validateAccessToken(
        request,
        authorization.slice('Bearer '.length),
      );
    }

    // Development mode: requests without a token get a mock user for convenience.
    // Requests WITH a token must go through real passport validation —
    // otherwise request.user would be silently replaced by the mock and
    // role/workspace checks would run against a nonexistent user.
    if (this.configService.nodeEnv === 'development' && !hasToken) {
      if (!request.user) {
        request.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: 'admin',
        };
      }
      return true;
    }

    return super.canActivate(context);
  }

  private async validateAccessToken(
    request: { user?: unknown },
    token: string,
  ): Promise<boolean> {
    const principal = await this.accessTokenService.validate(token);
    if (!principal) {
      throw new UnauthorizedException('Unauthorized access');
    }
    request.user = principal;
    return true;
  }

  handleRequest(err: unknown, user: unknown, _info: unknown): any {
    if (err || !user) {
      // Development mode without a token falls back to the mock user
      if (this.configService.nodeEnv === 'development' && !err) {
        return { id: 'dev-user-id', email: 'dev@example.com', role: 'admin' };
      }
      throw err || new UnauthorizedException('Unauthorized access');
    }
    return user;
  }
}

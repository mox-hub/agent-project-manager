import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import {
  AccessTokenService,
  ACCESS_TOKEN_PREFIX,
} from '../access-token.service';

/**
 * 全局认证守卫。JWT 之外支持访问 token（PAT）：
 * `Authorization: Bearer apm_pat_...` 走 AccessTokenService 校验，
 * principal 形态与 validateJwtPayload 一致（sessionId: null）。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly accessTokenService: AccessTokenService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request?.headers?.authorization as string | undefined;
    if (authorization?.startsWith(`Bearer ${ACCESS_TOKEN_PREFIX}`)) {
      return this.validateAccessToken(
        request,
        authorization.slice('Bearer '.length),
      );
    }

    return super.canActivate(context);
  }

  private async validateAccessToken(
    request: { user?: unknown },
    token: string,
  ): Promise<boolean> {
    const principal = await this.accessTokenService.validate(token);
    if (!principal) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }
    request.user = principal;
    return true;
  }
}

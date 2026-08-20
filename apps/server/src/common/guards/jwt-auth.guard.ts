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
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Inject(ConfigService) private configService: ConfigService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const hasToken = Boolean(request?.headers?.authorization);

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

  handleRequest(err: unknown, user: unknown, info: unknown): any {
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

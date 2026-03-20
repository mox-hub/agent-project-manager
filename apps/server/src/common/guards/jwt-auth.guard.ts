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

    // Skip authentication in development mode
    if (this.configService.nodeEnv === 'development') {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: unknown, user: unknown, info: unknown): any {
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized access');
    }
    return user;
  }
}

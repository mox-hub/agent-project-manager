import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RuntimeService } from '../runtime.service';

@Injectable()
export class RuntimeSessionGuard implements CanActivate {
  constructor(private readonly runtimeService: RuntimeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const runtimeSessionToken = this.readHeader(
      request,
      'x-runtime-session-token',
    );

    const runtimeSessionId =
      this.readHeader(request, 'x-runtime-session-id') ||
      request.body?.runtimeSessionId ||
      request.query?.runtimeSessionId;

    if (!runtimeSessionId || !runtimeSessionToken) {
      throw new UnauthorizedException('RUNTIME_AUTH_FAILED');
    }

    const session = await this.runtimeService.validateSession(
      runtimeSessionId,
      runtimeSessionToken,
    );

    const paramRuntimeId = request.params?.runtimeId;
    if (paramRuntimeId) {
      await this.runtimeService.assertRuntimeAccess(
        paramRuntimeId,
        session.runtimeId,
      );
    }

    const bodyRuntimeId = request.body?.runtimeId;
    if (bodyRuntimeId) {
      await this.runtimeService.assertRuntimeAccess(
        bodyRuntimeId,
        session.runtimeId,
      );
    }

    request.runtimeSession = session;
    return true;
  }

  private readHeader(request: any, name: string): string | undefined {
    const value =
      request.headers?.[name] || request.headers?.[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}

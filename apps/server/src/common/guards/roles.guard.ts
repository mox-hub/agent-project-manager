import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../core/database/prisma.service';

/**
 * RolesGuard（Prisma 多维鉴权版）
 *
 * 统一自此版本（原 core/guards/roles.guard.ts），取代原 common 的简单内存匹配版。
 * 支持 scopeType 维度（global / project）、全局 admin 短路放行、projectId 上下文
 * 的项目角色检查（含 ProjectMember owner/maintainer 放行）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const userRoles = await this.prisma.roleAssignment.findMany({
      where: {
        userId: user.id,
        role: { in: requiredRoles },
      },
    });

    // Check for global admin role
    const hasGlobalAdmin = userRoles.some(
      (r) => r.scopeType === 'global' && r.role === 'admin',
    );

    if (hasGlobalAdmin) {
      return true;
    }

    // Check for project-specific roles if projectId is in request
    const projectId = request.params?.projectId || request.body?.projectId;
    if (projectId) {
      const hasProjectRole = userRoles.some(
        (r) =>
          r.scopeType === 'project' &&
          r.projectId === projectId &&
          requiredRoles.includes(r.role),
      );

      // Also check if user is project owner/maintainer via ProjectMember
      if (!hasProjectRole) {
        const projectMember = await this.prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.id,
            },
          },
        });

        if (
          projectMember &&
          ['owner', 'maintainer'].includes(projectMember.role)
        ) {
          return true;
        }
      } else {
        return true;
      }
    }

    // If no project context, check global roles
    const hasRequiredGlobalRole = userRoles.some(
      (r) => r.scopeType === 'global' && requiredRoles.includes(r.role),
    );

    if (!hasRequiredGlobalRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

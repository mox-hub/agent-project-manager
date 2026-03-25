import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '../../core/config/config.service';
import {
  BusinessException,
  ErrorCode,
} from '../../core/exceptions/business.exception';
import * as bcrypt from 'bcrypt';
import { CreateAgentIdentityBindingDto } from './dto/create-agent-identity-binding.dto';

export type IdentitySource =
  | 'local'
  | 'oauth2'
  | 'cli'
  | 'mcp'
  | 'api'
  | 'plugin';
type RoleSummary = { scopeType: string; projectId: string | null; role: string };

export interface LoginOptions {
  identitySource?: IdentitySource;
  providerId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SubjectClaim {
  snapshotId?: string;
  subjectType: 'human_member';
  subjectId: string;
  identitySource: IdentitySource;
  projectScopes: string[];
  permissionProfile: {
    globalRoles: string[];
    projectRoles: Record<string, string[]>;
  };
  issuedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.passwordHash) {
      throw new BusinessException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
        UnauthorizedException.prototype.getStatus(),
      );
    }

    if (!user.isActive) {
      throw new BusinessException(
        ErrorCode.USER_INACTIVE,
        'User is inactive',
        UnauthorizedException.prototype.getStatus(),
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BusinessException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
        UnauthorizedException.prototype.getStatus(),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    return this.loginWithOptions(user);
  }

  async loginByUserId(userId: string, options: LoginOptions = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.loginWithOptions(user, options);
  }

  private async loginWithOptions(user: any, options: LoginOptions = {}) {
    const identitySource = options.identitySource || 'local';
    const expiresAt = this.resolveSessionExpiry();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: this.toInputJson({
          identitySource,
          providerId: options.providerId || null,
        }),
      },
    });

    const payload = { username: user.username, sub: user.id, sid: session.id };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
    });

    const roles = await this.prisma.roleAssignment.findMany({
      where: { userId: user.id },
      select: {
        scopeType: true,
        projectId: true,
        role: true,
      },
    });

    const subjectClaim = await this.createActorClaimSnapshot(
      user.id,
      identitySource,
      roles,
      expiresAt,
    );

    return {
      accessToken,
      session: {
        id: session.id,
        expiresAt,
      },
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      },
      subjectClaim,
    };
  }

  async validateJwtPayload(payload: any) {
    const sessionId = payload?.sid as string | undefined;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (
        !session ||
        session.userId !== user.id ||
        session.expiresAt.getTime() <= Date.now()
      ) {
        throw new UnauthorizedException('Session not found or expired');
      }

      await this.touchSession(session.id);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return {
      ...result,
      sessionId: sessionId || null,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async getCurrentUserWithRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = await this.prisma.roleAssignment.findMany({
      where: { userId },
    });

    const subjectClaim = this.buildHumanSubjectClaim(
      user.id,
      'local',
      roles,
      this.resolveSessionExpiry(),
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      },
      roles: roles.map((r) => ({
        id: r.id,
        scopeType: r.scopeType,
        projectId: r.projectId,
          role: r.role,
        })),
      subjectClaim,
    };
  }

  async getCurrentSubjectClaim(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const roles = await this.prisma.roleAssignment.findMany({
      where: { userId },
      select: {
        scopeType: true,
        projectId: true,
        role: true,
      },
    });

    return this.buildHumanSubjectClaim(
      user.id,
      'local',
      roles,
      this.resolveSessionExpiry(),
    );
  }

  async listAgentIdentityBindings(projectId: string, userId: string) {
    await this.assertProjectMember(projectId, userId);

    return this.prisma.agentIdentityBinding.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async upsertAgentIdentityBinding(
    projectId: string,
    dto: CreateAgentIdentityBindingDto,
    userId: string,
  ) {
    await this.assertProjectMaintainer(projectId, userId);
    const existing = await this.prisma.agentIdentityBinding.findFirst({
      where: {
        projectId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
      },
    });

    if (existing) {
      return this.prisma.agentIdentityBinding.update({
        where: { id: existing.id },
        data: {
          providerId: dto.providerId,
          identitySource: dto.identitySource,
          mappedRole: dto.mappedRole,
          mappedLevel: dto.mappedLevel,
          status: dto.status || 'active',
          metadata: this.toInputJson(dto.metadata),
        },
      });
    }

    return this.prisma.agentIdentityBinding.create({
      data: {
        projectId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        providerId: dto.providerId,
        identitySource: dto.identitySource,
        mappedRole: dto.mappedRole,
        mappedLevel: dto.mappedLevel,
        status: dto.status || 'active',
        createdBy: userId,
        metadata: this.toInputJson(dto.metadata),
      },
    });
  }

  async deleteAgentIdentityBinding(
    projectId: string,
    bindingId: string,
    userId: string,
  ) {
    await this.assertProjectMaintainer(projectId, userId);

    const binding = await this.prisma.agentIdentityBinding.findFirst({
      where: {
        id: bindingId,
        projectId,
      },
    });

    if (!binding) {
      throw new NotFoundException('Agent identity binding not found');
    }

    await this.prisma.agentIdentityBinding.delete({
      where: { id: bindingId },
    });

    return { success: true };
  }

  async listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        lastActiveAt: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Session not found');
    }

    return { success: true };
  }

  async logout(userId: string, sessionId?: string | null, all = false) {
    if (all) {
      await this.prisma.session.deleteMany({ where: { userId } });
      return { success: true, scope: 'all' };
    }

    if (sessionId) {
      await this.prisma.session.deleteMany({
        where: {
          id: sessionId,
          userId,
        },
      });
      return { success: true, scope: 'current' };
    }

    return { success: true };
  }

  private async createActorClaimSnapshot(
    userId: string,
    identitySource: IdentitySource,
    roles: RoleSummary[],
    expiresAt: Date,
  ): Promise<SubjectClaim> {
    const claim = this.buildHumanSubjectClaim(
      userId,
      identitySource,
      roles,
      expiresAt,
    );

    const snapshot = await this.prisma.actorClaimSnapshot.create({
      data: {
        subjectType: claim.subjectType,
        subjectId: claim.subjectId,
        identitySource: claim.identitySource,
        projectScopes: this.toInputJson(claim.projectScopes),
        permissionProfile: this.toInputJson(claim.permissionProfile),
        expiresAt: claim.expiresAt,
        issuedBy: userId,
      },
      select: {
        id: true,
        issuedAt: true,
        expiresAt: true,
      },
    });

    return {
      ...claim,
      snapshotId: snapshot.id,
      issuedAt: snapshot.issuedAt,
      expiresAt: snapshot.expiresAt,
    };
  }

  private buildHumanSubjectClaim(
    userId: string,
    identitySource: IdentitySource,
    roles: RoleSummary[],
    expiresAt: Date,
  ): SubjectClaim {
    const globalRoles: string[] = [];
    const projectRoles: Record<string, string[]> = {};

    for (const role of roles) {
      if (role.scopeType === 'global') {
        if (!globalRoles.includes(role.role)) {
          globalRoles.push(role.role);
        }
        continue;
      }

      if (role.scopeType === 'project' && role.projectId) {
        if (!projectRoles[role.projectId]) {
          projectRoles[role.projectId] = [];
        }

        if (!projectRoles[role.projectId].includes(role.role)) {
          projectRoles[role.projectId].push(role.role);
        }
      }
    }

    return {
      subjectType: 'human_member',
      subjectId: userId,
      identitySource,
      projectScopes: Object.keys(projectRoles),
      permissionProfile: {
        globalRoles,
        projectRoles,
      },
      issuedAt: new Date(),
      expiresAt,
    };
  }

  private async assertProjectMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('Insufficient project access');
    }

    return member;
  }

  private async assertProjectMaintainer(projectId: string, userId: string) {
    const member = await this.assertProjectMember(projectId, userId);
    if (!['owner', 'maintainer'].includes(member.role)) {
      throw new ForbiddenException('Insufficient project permissions');
    }
  }

  private resolveSessionExpiry(): Date {
    const rawExpiresIn = this.configService.get('JWT_EXPIRES_IN') || '7d';
    const now = new Date();

    if (typeof rawExpiresIn === 'string') {
      const match = rawExpiresIn.match(/^(\d+)([dhm])$/i);
      if (match) {
        const value = Number(match[1]);
        const unit = match[2].toLowerCase();
        const multiplier =
          unit === 'd'
            ? 24 * 60 * 60 * 1000
            : unit === 'h'
              ? 60 * 60 * 1000
              : 60 * 1000;
        return new Date(now.getTime() + value * multiplier);
      }

      const numeric = Number(rawExpiresIn);
      if (Number.isFinite(numeric) && numeric > 0) {
        return new Date(now.getTime() + numeric * 1000);
      }
    }

    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  private toInputJson(value?: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async touchSession(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }
}

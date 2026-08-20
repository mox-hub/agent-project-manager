import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
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
import { RegisterDto } from './dto/register.dto';
import { generateMemberShortId } from '@/common/utils/member-short-id.util';

export type IdentitySource =
  | 'local'
  | 'oauth2'
  | 'cli'
  | 'mcp'
  | 'api'
  | 'plugin';
type RoleSummary = {
  scopeType: string;
  projectId: string | null;
  role: string;
};

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

  /**
   * 邮箱注册：创建 User（含全局 user 角色）+ human Member（短 ID/handle），
   * 成功后直接返回登录态。注册策略由 AppConfig auth.registrationMode 控制（默认 open）。
   */
  async register(dto: RegisterDto, options: LoginOptions = {}) {
    const email = dto.email.trim().toLowerCase();
    const registrationMode = await this.getRegistrationMode();
    if (registrationMode !== 'open') {
      throw new ForbiddenException('注册已关闭，请向管理员索取邀请');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('该邮箱已注册');
    }

    const displayName = dto.displayName?.trim() || email.split('@')[0];
    const username = await this.deriveUniqueUsername(email.split('@')[0]);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        displayName,
        email,
        passwordHash,
        authProvider: 'local',
      },
    });

    await this.prisma.roleAssignment.create({
      data: { userId: user.id, scopeType: 'global', role: 'user' },
    });

    // 自动创建关联的 human Member（复用短 ID 生成与去重）
    await this.ensureMemberForUser(user.id, {
      email,
      displayName,
      handle: await this.deriveUniqueHandle(username),
    });

    return this.loginByUserId(user.id, {
      identitySource: 'local',
      ...options,
    });
  }

  /** 公开配置：部署模式（standalone=本地直邀可用）与注册策略 */
  async getPublicConfig() {
    const appMode = (this.configService.get('APP_MODE') ??
      'standalone') as string;
    return {
      appMode,
      registrationMode: await this.getRegistrationMode(),
    };
  }

  private async getRegistrationMode(): Promise<string> {
    const cfg = await this.prisma.appConfig.findFirst({
      where: { key: 'auth.registrationMode', scope: 'auth' },
    });
    const value = (cfg?.value as { mode?: string } | null)?.mode;
    return value === 'invite' ? 'invite' : 'open';
  }

  private async deriveUniqueUsername(base: string): Promise<string> {
    const seed = base.toLowerCase().replace(/[^a-z0-9_.-]/g, '') || 'user';
    let candidate = seed;
    for (let i = 0; i < 20; i += 1) {
      const dup = await this.prisma.user.findUnique({
        where: { username: candidate },
      });
      if (!dup) return candidate;
      candidate = `${seed}${Math.floor(Math.random() * 10000)}`;
    }
    return `${seed}${Date.now()}`;
  }

  private async deriveUniqueHandle(base: string): Promise<string> {
    const seed = base.toLowerCase().replace(/[^a-z0-9_.-]/g, '') || 'member';
    let candidate = seed;
    for (let i = 0; i < 20; i += 1) {
      const dup = await this.prisma.member.findUnique({
        where: { handle: candidate },
      });
      if (!dup) return candidate;
      candidate = `${seed}${Math.floor(Math.random() * 10000)}`;
    }
    return `${seed}${Date.now()}`;
  }

  /** 确保 User 有关联的 human Member（注册/邀请接受/本地直邀共用） */
  async ensureMemberForUser(
    userId: string,
    profile: { email?: string; displayName: string; handle?: string },
  ) {
    const existing = await this.prisma.member.findUnique({ where: { userId } });
    if (existing) return existing;

    let shortId = generateMemberShortId();
    for (let i = 0; i < 5; i += 1) {
      const dup = await this.prisma.member.findUnique({ where: { shortId } });
      if (!dup) break;
      shortId = generateMemberShortId();
    }

    const handle =
      profile.handle ??
      (await this.deriveUniqueHandle(
        (profile.email ?? profile.displayName).split('@')[0],
      ));

    return this.prisma.member.create({
      data: {
        type: 'human',
        shortId,
        userId,
        email: profile.email ?? null,
        displayName: profile.displayName,
        handle,
        status: 'active',
      },
    });
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
  }

  async logout(userId: string, sessionId?: string | null, all = false) {
    if (all) {
      await this.prisma.session.deleteMany({ where: { userId } });
      return { scope: 'all' as const, revokedCount: undefined };
    }

    if (sessionId) {
      const result = await this.prisma.session.deleteMany({
        where: {
          id: sessionId,
          userId,
        },
      });
      return { scope: 'current' as const, revokedCount: result.count };
    }

    return { scope: 'none' as const, revokedCount: 0 };
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

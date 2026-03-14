import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '../../core/config/config.service';
import {
  BusinessException,
  ErrorCode,
} from '../../core/exceptions/business.exception';
import * as bcrypt from 'bcrypt';

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
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
    });

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default

    await this.prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      },
    };
  }

  async validateJwtPayload(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
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
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async logout(_sessionId?: string) {
    // If sessionId is provided, delete specific session
    // Otherwise, this would be handled by token expiration
    // For now, we'll just return success
    return { success: true };
  }
}

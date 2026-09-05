/**
 * 访问 token（PAT）服务
 *
 * 供 AI/外部工具免登录调用 API：`Authorization: Bearer apm_pat_...`。
 * 只存 SHA-256 hash，明文仅在 create 返回一次；validate 返回与
 * AuthService.validateJwtPayload 一致的 principal 形态（sessionId: null）。
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';

export const ACCESS_TOKEN_PREFIX = 'apm_pat_';

const LAST_USED_THROTTLE_MS = 60_000;

@Injectable()
export class AccessTokenService {
  private readonly logger = new Logger(AccessTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string, dto: CreateAccessTokenDto) {
    const token = ACCESS_TOKEN_PREFIX + randomBytes(32).toString('hex');
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 86_400_000)
      : null;
    const record = await this.prisma.accessToken.create({
      data: {
        name: dto.name,
        tokenHash: this.hashToken(token),
        tokenPrefix: token.slice(0, ACCESS_TOKEN_PREFIX.length + 6),
        userId,
        scopes: dto.scopes ?? undefined,
        expiresAt,
      },
    });
    this.logger.log(`Access token created: user=${userId} name=${dto.name}`);
    // 明文 token 仅在创建响应返回一次；hash 不出服务端
    const { tokenHash: _tokenHash, ...safe } = record;
    return { ...safe, token };
  }

  async list(userId: string) {
    return this.prisma.accessToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async revoke(userId: string, id: string) {
    const existing = await this.prisma.accessToken.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('ACCESS_TOKEN_NOT_FOUND');
    }
    if (existing.revokedAt) {
      return existing;
    }
    return this.prisma.accessToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }

  /** JwtAuthGuard PAT 分支用：校验失败返回 null，由守卫抛 401 */
  async validate(token: string) {
    if (!token.startsWith(ACCESS_TOKEN_PREFIX)) {
      return null;
    }
    const record = await this.prisma.accessToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!record || record.revokedAt) {
      return null;
    }
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      return null;
    }
    if (!record.user.isActive) {
      return null;
    }

    // 节流更新 lastUsedAt，避免每请求一次写
    if (
      !record.lastUsedAt ||
      Date.now() - record.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS
    ) {
      this.prisma.accessToken
        .update({
          where: { id: record.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);
    }

    const { passwordHash: _passwordHash, ...user } = record.user;
    return { ...user, sessionId: null, accessTokenId: record.id };
  }
}

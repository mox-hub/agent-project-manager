import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '../../core/config/config.service';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { Prisma, OAuth2Account, OAuth2Provider, User } from '@prisma/client';
import {
  BusinessException,
  ErrorCode,
} from '../../core/exceptions/business.exception';

@Injectable()
export class OAuth2Service {
  constructor(
    private config: ConfigService,
    private http: HttpService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all enabled OAuth2 providers
   */
  async getProviders() {
    return this.prisma.oAuth2Provider.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
        enabled: true,
      },
    });
  }

  /**
   * Get authorization URL for OAuth2 provider
   */
  async getAuthorizationUrl(
    providerId: string,
    redirectUri: string,
  ): Promise<string> {
    const provider = await this.prisma.oAuth2Provider.findUnique({
      where: { id: providerId },
    });

    if (!provider || !provider.enabled) {
      throw new BusinessException(
        ErrorCode.PROVIDER_NOT_FOUND,
        `OAuth2 provider ${providerId} not found or disabled`,
      );
    }

    const state = this.generateState(providerId, redirectUri);
    const authUrl = new URL(provider.authUrl);

    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set(
      'scope',
      (provider.scopes as any)?.join(' ') || '',
    );

    return authUrl.toString();
  }

  /**
   * Handle OAuth2 callback
   * @returns 创建或关联后的 user.id
   * @throws BadRequestException 当 state / code / provider 校验失败时
   */
  async handleCallback(
    providerId: string,
    code: string,
    state: string,
  ): Promise<{ userId: string }> {
    // Verify state
    const stateData = this.verifyState(state);
    if (!stateData) {
      throw new BadRequestException('Invalid state parameter');
    }

    const provider = await this.prisma.oAuth2Provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new BusinessException(
        ErrorCode.PROVIDER_NOT_FOUND,
        `OAuth2 provider ${providerId} not found`,
        404,
      );
    }

    let tokenData: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    try {
      // Exchange code for access token
      const tokenUrl = new URL(provider.tokenUrl);
      tokenUrl.searchParams.set('grant_type', 'authorization_code');
      tokenUrl.searchParams.set('code', code);
      tokenUrl.searchParams.set('redirect_uri', stateData.redirectUri);
      tokenUrl.searchParams.set('client_id', provider.clientId);
      tokenUrl.searchParams.set('client_secret', provider.clientSecret);

      const response = await this.http
        .post(tokenUrl.toString(), undefined, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        .toPromise();

      if (!response || !response.data) {
        throw new BadRequestException('Failed to obtain access token');
      }

      tokenData = response.data as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof BusinessException) {
        throw e;
      }
      throw new BadRequestException(
        `Failed to exchange OAuth2 code: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, tokenData.access_token!);

    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: userInfo.id }, { email: userInfo.email }],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          username: userInfo.id,
          displayName: userInfo.name || userInfo.id,
          email: userInfo.email,
          avatarUrl: userInfo.avatar_url,
          authProvider: provider.name,
          isActive: true,
          passwordHash: null, // OAuth users don't have password hash
        },
      });
    }

    // Create or update OAuth2 account
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in ?? 3600));

    await this.prisma.oAuth2Account.upsert({
      where: {
        providerId_externalUserId: {
          providerId,
          externalUserId: userInfo.id,
        },
      },
      create: {
        userId: user.id,
        providerId,
        externalUserId: userInfo.id,
        externalUsername: userInfo.login || userInfo.name,
        email: userInfo.email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        scopes: tokenData.scope ?? Prisma.JsonNull,
        rawProfile: userInfo as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        scopes: tokenData.scope ?? Prisma.JsonNull,
        expiresAt,
        rawProfile: userInfo as unknown as Prisma.InputJsonValue,
      },
    });

    return { userId: user.id };
  }

  /**
   * Get user info from OAuth2 provider
   */
  private async getUserInfo(
    provider: OAuth2Provider,
    accessToken: string,
  ): Promise<any> {
    if (!provider.userinfoUrl) {
      throw new Error('Provider userinfo URL is not configured');
    }
    const userInfoUrl = new URL(provider.userinfoUrl);
    userInfoUrl.searchParams.set('access_token', accessToken);

    const response = await this.http.get(userInfoUrl.toString()).toPromise();
    if (!response || !response.data) {
      throw new Error('Failed to fetch user info from provider');
    }
    return response.data;
  }

  /**
   * Generate state parameter for OAuth2 flow
   */
  private generateState(providerId: string, redirectUri: string): string {
    const data = {
      providerId,
      redirectUri,
      timestamp: Date.now(),
    };

    const state = Buffer.from(JSON.stringify(data)).toString('base64');
    return state;
  }

  /**
   * Verify and decode state parameter
   */
  private verifyState(
    state: string,
  ): { providerId: string; redirectUri: string; timestamp: number } | null {
    try {
      const data = JSON.parse(Buffer.from(state, 'base64').toString());
      // TODO: Verify timestamp is not expired (5 minutes)
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  async refreshAccessToken(accountId: string): Promise<boolean> {
    const account = await this.prisma.oAuth2Account.findUnique({
      where: { id: accountId },
      include: { provider: true },
    });

    if (!account || !account.refreshToken || !account.provider) {
      return false;
    }

    try {
      const tokenUrl = new URL(account.provider.tokenUrl);
      tokenUrl.searchParams.set('grant_type', 'refresh_token');
      tokenUrl.searchParams.set('refresh_token', account.refreshToken);
      tokenUrl.searchParams.set('client_id', account.provider.clientId);
      tokenUrl.searchParams.set('client_secret', account.provider.clientSecret);

      const response = await this.http
        .post(tokenUrl.toString(), undefined, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        .toPromise();

      if (!response || !response.data) {
        throw new Error('Failed to refresh access token');
      }

      const tokenData = response.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(
        expiresAt.getSeconds() + tokenData.expires_in || 3600,
      );

      await this.prisma.oAuth2Account.update({
        where: { id: accountId },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
        },
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect OAuth2 account
   */
  async disconnectAccount(accountId: string, userId: string): Promise<void> {
    const account = await this.prisma.oAuth2Account.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== userId) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'OAuth2 account not found',
      );
    }

    await this.prisma.oAuth2Account.delete({
      where: { id: accountId },
    });
  }

  /**
   * Get user's OAuth2 accounts
   */
  async getUserAccounts(userId: string): Promise<OAuth2Account[]> {
    return this.prisma.oAuth2Account.findMany({
      where: { userId },
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke token (logout from OAuth2 provider)
   */
  async revokeToken(accountId: string): Promise<boolean> {
    const account = await this.prisma.oAuth2Account.findUnique({
      where: { id: accountId },
      include: { provider: true },
    });

    if (!account || !account.provider || !account.accessToken) {
      return false;
    }

    try {
      const tokenUrl = new URL(account.provider.tokenUrl);
      tokenUrl.searchParams.set('token', account.accessToken);

      await this.http.post(tokenUrl.toString()).toPromise();

      return true;
    } catch {
      return false;
    }
  }
}
